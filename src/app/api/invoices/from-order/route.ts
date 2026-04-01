import { createClient } from "@supabase/supabase-js"
import type { InvoicePDFInput } from "../pdf/route"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function formatBillDate(dateStr: string | null): string {
  if (!dateStr) {
    const now = new Date()
    const d = String(now.getDate()).padStart(2, "0")
    const m = String(now.getMonth() + 1).padStart(2, "0")
    const y = now.getFullYear()
    return `${d}/${m}/${y}`
  }
  try {
    const d = new Date(dateStr)
    const day = String(d.getDate()).padStart(2, "0")
    const mon = String(d.getMonth() + 1).padStart(2, "0")
    const yr = d.getFullYear()
    return `${day}/${mon}/${yr}`
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

  const billNumber = order.case_code
    ? `INV-${order.case_code}`
    : `INV-${String(order.id).slice(0, 8).toUpperCase()}`

  const billDate = formatBillDate(order.payment_date ?? order.created_at)

  // Build line items from order
  const items: InvoicePDFInput["items"] = []

  const productName = order.product_name ?? "Product"
  const units = order.units ?? 1
  const deliveryFee = 150
  const installationFee = 0
  const totalAmount = order.amount ?? 0

  // Derive equipment price from total minus delivery/installation
  const equipmentTotal = Math.max(0, totalAmount - deliveryFee - installationFee)
  const unitPrice = units > 0 ? Math.round(equipmentTotal / units) : equipmentTotal

  if (productName) {
    items.push({
      description: productName,
      qty: units,
      unit_price: unitPrice,
      amount: equipmentTotal,
    })
  }

  if (deliveryFee > 0) {
    items.push({
      description: "Product Delivery",
      qty: 1,
      unit_price: deliveryFee,
      amount: deliveryFee,
    })
  }

  if (installationFee > 0) {
    items.push({
      description: "Product Installation",
      qty: 1,
      unit_price: installationFee,
      amount: installationFee,
    })
  }

  const total = totalAmount
  const balance = order.balance ?? 0
  const deposit = total - balance

  const payload: InvoicePDFInput = {
    doc_type: "invoice",
    bill_number: billNumber,
    bill_date: billDate,
    customer_name: order.customer_name,
    customer_email: order.email ?? undefined,
    customer_phone: order.phone ?? undefined,
    customer_location: order.location ?? undefined,
    customer_address: order.address ?? undefined,
    items,
    total,
    deposit,
    balance,
    delivery_date: order.delivery_date
      ? formatBillDate(order.delivery_date)
      : undefined,
    buying_method: order.mode ?? undefined,
    issued_by: "Aisy",
  }

  return Response.json(payload)
}
