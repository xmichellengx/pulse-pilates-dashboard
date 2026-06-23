import { createClient as createServiceClient } from "@supabase/supabase-js"
import { requireUser } from "@/lib/api/auth"

const supabase = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const VALID_STATUSES = new Set(["Pending", "Scheduled", "Completed", "Cancelled"])

export async function POST(req: Request) {
  const auth = await requireUser()
  if (!auth.ok) return auth.response

  const body = await req.json().catch(() => null)
  if (!body || typeof body !== "object") {
    return Response.json({ error: "invalid body" }, { status: 400 })
  }
  const orderId = typeof body.order_id === "string" ? body.order_id : null
  if (!orderId) return Response.json({ error: "order_id required" }, { status: 400 })

  // Pull the source order so we can compute the warranty + rental state
  // server-side rather than trusting client-supplied booleans.
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("delivery_date, mode, status")
    .eq("id", orderId)
    .single()
  if (orderError || !order) {
    return Response.json({ error: "order not found" }, { status: 404 })
  }

  const today = new Date()
  let isUnderWarranty = false
  if (order.delivery_date) {
    const delivered = new Date(order.delivery_date)
    const monthsSince = (today.getTime() - delivered.getTime()) / (1000 * 60 * 60 * 24 * 30.44)
    isUnderWarranty = monthsSince <= 6
  }
  const isActiveRental = typeof order.mode === "string" && /ental/i.test(order.mode) &&
    (order.status === "Delivered" || order.status === "Pending Delivered")
  const waived = isUnderWarranty || isActiveRental

  const transportFee = waived ? 0 : (Number(body.transport_fee) || 0)
  const labourFee = waived ? 0 : (Number(body.labour_fee) || 0)
  const partsCost = waived ? 0 : (Number(body.parts_cost) || 0)
  const total = transportFee + labourFee + partsCost

  const status = typeof body.status === "string" && VALID_STATUSES.has(body.status) ? body.status : "Pending"

  const row = {
    order_id: orderId,
    requested_date: typeof body.requested_date === "string" && body.requested_date ? body.requested_date : new Date().toISOString().slice(0, 10),
    scheduled_date: typeof body.scheduled_date === "string" && body.scheduled_date ? body.scheduled_date : null,
    scheduled_time: typeof body.scheduled_time === "string" && body.scheduled_time.trim() ? body.scheduled_time.trim() : null,
    completed_date: typeof body.completed_date === "string" && body.completed_date ? body.completed_date : null,
    issue_description: typeof body.issue_description === "string" && body.issue_description.trim() ? body.issue_description.trim() : null,
    is_under_warranty: isUnderWarranty,
    is_active_rental: isActiveRental,
    transport_fee: transportFee,
    labour_fee: labourFee,
    parts_description: typeof body.parts_description === "string" && body.parts_description.trim() ? body.parts_description.trim() : null,
    parts_cost: partsCost,
    total,
    status,
    agent: typeof body.agent === "string" && body.agent.trim() ? body.agent.trim() : (auth.user.email ?? null),
    notes: typeof body.notes === "string" && body.notes.trim() ? body.notes.trim() : null,
    created_by: auth.user.id,
  }

  const { data, error } = await supabase
    .from("maintenance_requests")
    .insert(row)
    .select()
    .single()
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}
