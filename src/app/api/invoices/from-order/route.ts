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

  const billDate = formatBillDate(order.payment_date ?? order.created_at)

  // Build line items
  const items: InvoicePDFInput["items"] = []
  const productName = order.product_name ?? "Product"
  const units = order.units ?? 1
  const totalAmount = order.amount ?? 0

  // For rentals, first-month amount is the monthly_rental; for purchases it's the product price
  let equipmentAmount: number
  let deliveryFee = 150
  let installationFee = 0

  if (isRental) {
    // Rental invoice: first month payment = monthly_rental
    const monthlyRental = order.monthly_rental ?? 0
    equipmentAmount = monthlyRental
    // Recalculate delivery from total if possible
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

  const total = totalAmount
  const balance = order.balance ?? 0
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
    payment_date: order.payment_date ? formatBillDate(order.payment_date) : undefined,
    buying_method: order.mode ?? undefined,
    // Rental fields — rental_start_date / monthly_billing_date / auto_debit_effective_date
    // are collected at invoice-generation time from the UI (not stored on the order)
    monthly_rental_amount: isRental ? (order.monthly_rental ?? undefined) : undefined,
    issued_by: "Aisy",
  }

  return Response.json(payload)
}
