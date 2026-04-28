import { createClient } from "@supabase/supabase-js"
import type { InvoicePDFInput } from "../pdf/route"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function formatBillDate(dateStr: string | null): string {
  if (!dateStr) {
    const now = new Date()
    return `${String(now.getDate()).padStart(2, "0")}/${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()}`
  }
  try {
    const d = new Date(dateStr)
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`
  } catch {
    return dateStr
  }
}

// ── Stored breakdown shapes ────────────────────────────────────────────────────
interface StoredOrderItem {
  product_name?: string | null
  qty?: number | null
  unit_price?: number | null
  customisation_surcharge?: number | null
  custom_colour?: boolean | null
  colour_name?: string | null
  logo_engraving?: boolean | null
  engraving_notes?: string | null
  purchase_mode?: string | null
}

interface StoredAdjustment {
  label?: string | null
  amount?: number | null
}

function toNumber(v: unknown): number {
  if (v === null || v === undefined) return 0
  const n = typeof v === "number" ? v : Number(v)
  return Number.isFinite(n) ? n : 0
}

function isStoredOrderItemArray(v: unknown): v is StoredOrderItem[] {
  return Array.isArray(v)
}

function isStoredAdjustmentArray(v: unknown): v is StoredAdjustment[] {
  return Array.isArray(v)
}

function buildItemDescription(it: StoredOrderItem, isRental: boolean): string {
  const base = it.product_name ?? "Product"
  const desc = isRental ? `${base} - 1st Month Rental` : base

  const surcharge = toNumber(it.customisation_surcharge)
  if (surcharge <= 0) return desc

  const notes: string[] = []
  if (it.custom_colour && it.colour_name) {
    notes.push(`custom colour: ${it.colour_name}`)
  } else if (it.custom_colour) {
    notes.push("custom colour")
  }
  if (it.logo_engraving) {
    notes.push(it.engraving_notes ? `logo engraving — ${it.engraving_notes}` : "logo engraving")
  }
  return notes.length > 0 ? `${desc} (${notes.join("; ")})` : desc
}

export async function GET(req: Request) {
  const orderId = new URL(req.url).searchParams.get("order_id")
  if (!orderId) {
    return Response.json({ error: "order_id is required" }, { status: 400 })
  }

  const { data: order, error } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .single()

  if (error || !order) {
    return Response.json({ error: error?.message ?? "Order not found" }, { status: 404 })
  }

  const isRental = (order.mode ?? "").toLowerCase().includes("rental")

  const billNumber = order.case_code
    ? `INV-${order.case_code}`
    : `INV-${String(order.id).slice(0, 8).toUpperCase()}`

  // Bill Date = the date the document is generated (today), not when the
  // order was created or paid. The actual payment_date still shows in the
  // Payment Details section below for invoices/receipts. Passing null to
  // formatBillDate falls through to "now" formatted as dd/mm/yyyy.
  const billDate = formatBillDate(null)

  // ── Detect stored breakdown ──────────────────────────────────────────────────
  const storedItems = isStoredOrderItemArray(order.items) ? order.items : null
  const hasStoredBreakdown =
    order.subtotal != null ||
    (order.delivery_fee != null && Number(order.delivery_fee) > 0) ||
    (storedItems !== null && storedItems.length > 0)

  const items: InvoicePDFInput["items"] = []
  const totalAmount = toNumber(order.amount)

  if (hasStoredBreakdown) {
    // ── Use stored breakdown ───────────────────────────────────────────────────
    if (storedItems) {
      for (const it of storedItems) {
        const qty = toNumber(it.qty) || 1
        const unitPriceRaw = toNumber(it.unit_price)
        const surcharge = toNumber(it.customisation_surcharge)
        const lineUnit = unitPriceRaw + surcharge
        const lineAmount = lineUnit * qty
        items.push({
          description: buildItemDescription(it, isRental),
          qty,
          unit_price: lineUnit,
          amount: lineAmount,
        })
      }
    }

    const deliveryFee = toNumber(order.delivery_fee)
    if (deliveryFee > 0) {
      items.push({
        description: "Product Delivery",
        qty: 1,
        unit_price: deliveryFee,
        amount: deliveryFee,
      })
    }

    const installationFee = toNumber(order.installation_fee)
    if (installationFee > 0) {
      items.push({
        description: "Product Installation",
        qty: 1,
        unit_price: installationFee,
        amount: installationFee,
      })
    }

    if (isStoredAdjustmentArray(order.additional_charges)) {
      for (const ch of order.additional_charges) {
        const amt = toNumber(ch.amount)
        if (amt === 0) continue
        items.push({
          description: ch.label ?? "Additional Charge",
          qty: 1,
          unit_price: amt,
          amount: amt,
        })
      }
    }

    if (isStoredAdjustmentArray(order.discounts)) {
      for (const d of order.discounts) {
        const amt = toNumber(d.amount)
        if (amt === 0) continue
        // Render discount as a negative line item; PDF renders via toLocaleString
        // so a negative number shows as e.g. "-150.00" in Unit Price / Amount.
        items.push({
          description: d.label ?? "Discount",
          qty: 1,
          unit_price: -amt,
          amount: -amt,
        })
      }
    }
  } else {
    // ── Legacy fallback: back-calculate from order.amount ──────────────────────
    const productName = order.product_name ?? "Product"
    const units = order.units ?? 1
    let equipmentAmount: number
    let deliveryFee = 150
    const installationFee = 0

    if (isRental) {
      const monthlyRental = order.monthly_rental ?? 0
      equipmentAmount = monthlyRental
      deliveryFee = Math.max(0, totalAmount - monthlyRental - installationFee)
      if (deliveryFee > 1000) deliveryFee = 150 // sanity cap
    } else {
      equipmentAmount = Math.max(0, totalAmount - deliveryFee - installationFee)
    }

    const unitPrice = units > 0 ? Math.round(equipmentAmount / units) : equipmentAmount

    if (productName) {
      const desc = isRental
        ? `${productName} - 1st Month Rental`
        : productName
      items.push({ description: desc, qty: units, unit_price: unitPrice, amount: equipmentAmount })
    }

    if (deliveryFee > 0) {
      items.push({ description: "Product Delivery", qty: 1, unit_price: deliveryFee, amount: deliveryFee })
    }
    if (installationFee > 0) {
      items.push({ description: "Product Installation", qty: 1, unit_price: installationFee, amount: installationFee })
    }
  }

  const total = totalAmount
  const balance = toNumber(order.balance)
  const deposit = Math.max(0, total - balance)

  const payload: InvoicePDFInput = {
    doc_type: isRental ? "rental" : "invoice",
    bill_number: billNumber,
    bill_date: billDate,
    reference: order.case_code ?? undefined,
    customer_name: order.customer_name,
    customer_email: order.email ?? undefined,
    customer_phone: order.phone ?? undefined,
    customer_location: order.location ?? undefined,
    customer_address: order.address ?? undefined,
    items,
    total,
    deposit,
    balance,
    delivery_date: order.delivery_date ? formatBillDate(order.delivery_date) : undefined,
    estimated_delivery: typeof order.estimated_delivery === "string" && order.estimated_delivery.trim()
      ? order.estimated_delivery.trim()
      : undefined,
    delivery_location: typeof order.delivery_location === "string" && order.delivery_location.trim()
      ? order.delivery_location.trim()
      : undefined,
    payment_date: order.payment_date ? formatBillDate(order.payment_date) : undefined,
    buying_method: order.mode ?? undefined,
    // Rental fields — rental_start_date / monthly_billing_date / auto_debit_effective_date
    // are collected at invoice-generation time from the UI (not stored on the order)
    monthly_rental_amount: isRental ? (order.monthly_rental ?? undefined) : undefined,
    issued_by: "Aisy",
  }

  return Response.json(payload)
}
