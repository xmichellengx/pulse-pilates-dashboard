import { createClient } from "@/lib/supabase/server"
import { MaintenanceClient, type MaintenanceRequest, type OrderOption } from "@/components/maintenance/maintenance-client"

export default async function MaintenancePage() {
  const supabase = await createClient()

  // Existing maintenance requests with the linked order's basic info.
  const { data: requestsRaw, error: requestsError } = await supabase
    .from("maintenance_requests")
    .select(
      "id, order_id, requested_date, scheduled_date, scheduled_time, completed_date, payment_date, issue_description, is_under_warranty, is_active_rental, transport_fee, labour_fee, parts_description, parts_cost, total, status, agent, notes, created_at, orders(case_code, customer_name, phone, email, product_name, delivery_date, mode, location, address, units)"
    )
    .order("requested_date", { ascending: false })
    .order("created_at", { ascending: false })

  if (requestsError) {
    console.error("Maintenance requests fetch error:", requestsError)
  }

  type OrderRel = {
    case_code: string | null
    customer_name: string | null
    phone: string | null
    email: string | null
    product_name: string | null
    delivery_date: string | null
    mode: string | null
    location: string | null
    address: string | null
    units: number | null
  }

  const requests: MaintenanceRequest[] = (requestsRaw ?? []).map((r) => {
    const orderRel = r.orders as unknown as OrderRel | OrderRel[] | null
    const order = Array.isArray(orderRel) ? orderRel[0] ?? null : orderRel
    return {
      id: r.id,
      order_id: r.order_id,
      requested_date: r.requested_date,
      scheduled_date: r.scheduled_date ?? null,
      scheduled_time: r.scheduled_time ?? null,
      completed_date: r.completed_date ?? null,
      payment_date: r.payment_date ?? null,
      issue_description: r.issue_description ?? null,
      is_under_warranty: !!r.is_under_warranty,
      is_active_rental: !!r.is_active_rental,
      transport_fee: r.transport_fee ?? 0,
      labour_fee: r.labour_fee ?? 0,
      parts_description: r.parts_description ?? null,
      parts_cost: r.parts_cost ?? 0,
      total: r.total ?? 0,
      status: r.status ?? "Pending",
      agent: r.agent ?? null,
      notes: r.notes ?? null,
      created_at: r.created_at,
      order_case_code: order?.case_code ?? null,
      order_customer_name: order?.customer_name ?? null,
      order_phone: order?.phone ?? null,
      order_email: order?.email ?? null,
      order_product_name: order?.product_name ?? null,
      order_delivery_date: order?.delivery_date ?? null,
      order_mode: order?.mode ?? null,
      order_location: order?.location ?? null,
      order_address: order?.address ?? null,
      order_units: order?.units ?? null,
    }
  })

  // Picker dataset: delivered orders the user might log maintenance for.
  // 500 most recent should comfortably cover existing customer history.
  const { data: ordersRaw, error: ordersError } = await supabase
    .from("orders")
    .select("id, case_code, customer_name, phone, email, product_name, delivery_date, mode, status, location, address, units")
    .not("delivery_date", "is", null)
    .order("delivery_date", { ascending: false })
    .limit(500)
  if (ordersError) {
    console.error("Orders fetch error:", ordersError)
  }

  const orderOptions: OrderOption[] = (ordersRaw ?? []).map((o) => ({
    id: o.id,
    case_code: o.case_code ?? null,
    customer_name: o.customer_name ?? "",
    phone: o.phone ?? null,
    email: o.email ?? null,
    product_name: o.product_name ?? null,
    delivery_date: o.delivery_date ?? null,
    mode: o.mode ?? null,
    status: o.status ?? null,
    location: o.location ?? null,
    address: o.address ?? null,
    units: o.units ?? null,
  }))

  return (
    <div className="flex flex-col max-w-[1400px] mx-auto">
      <MaintenanceClient requests={requests} orderOptions={orderOptions} />
    </div>
  )
}
