import { createClient } from "@/lib/supabase/server"
import { RentalsClient, type RentalOrder } from "@/components/rentals/rentals-client"

export default async function RentalsPage() {
  const supabase = await createClient()

  // No `equipment_price` column on orders — derive it from products.price_myr
  // via the orders.product_id FK. Used by the conversion modal (rent-to-own
  // math: equipment price minus rental rebate = balance to pay).
  // No `equipment_price` column on orders — derive it from products.price_myr
  // via the orders.product_id FK. Used by the conversion modal (rent-to-own
  // math: equipment price minus rental rebate = balance to pay).
  const { data, error } = await supabase
    .from("orders")
    .select(
      "id, case_code, customer_name, phone, email, product_name, monthly_rental, delivery_date, return_date, status, payex_status, balance, amount, is_b2b, payex_proof_url, customer_id_url, leasing_contract_url, products(price_myr)"
    )
    .ilike("mode", "%ental%")
    .in("status", ["Delivered", "Pending Delivered"])
    .order("delivery_date", { ascending: true })

  if (error) {
    console.error("Rentals fetch error:", error)
  }

  // Fetch all follow-ups for the loaded rentals in one trip.
  const orderIds = (data ?? []).map((r) => r.id)
  type FollowUpRow = {
    id: string
    order_id: string
    follow_up_date: string
    agent: string | null
    month_mark: number | null
    contacted: string | null
    outcome: string | null
    notes: string | null
    payment_confirmed: boolean | null
    next_action: string | null
    next_follow_up_date: string | null
    created_at: string
  }
  const followUpsByOrder = new Map<string, FollowUpRow[]>()
  if (orderIds.length > 0) {
    const { data: fu, error: fuError } = await supabase
      .from("rental_follow_ups")
      .select("*")
      .in("order_id", orderIds)
      .order("follow_up_date", { ascending: false })
      .order("created_at", { ascending: false })
    if (fuError) {
      console.error("Follow-ups fetch error:", fuError)
    }
    for (const row of (fu ?? []) as FollowUpRow[]) {
      const list = followUpsByOrder.get(row.order_id) ?? []
      list.push(row)
      followUpsByOrder.set(row.order_id, list)
    }
  }

  const rentals: RentalOrder[] = (data ?? []).map((row) => {
    // products() can come back as object or array depending on FK cardinality.
    const productRel = row.products as unknown as { price_myr: number | null } | { price_myr: number | null }[] | null
    const productPrice = Array.isArray(productRel) ? productRel[0]?.price_myr ?? null : productRel?.price_myr ?? null
    return {
      id: row.id,
      case_code: row.case_code ?? null,
      customer_name: row.customer_name ?? "",
      phone: row.phone ?? null,
      email: row.email ?? null,
      product_name: row.product_name ?? null,
      monthly_rental: row.monthly_rental ?? null,
      delivery_date: row.delivery_date ?? null,
      status: row.status ?? null,
      payex_status: row.payex_status ?? null,
      balance: row.balance ?? null,
      // Prefer the live product price; fall back to the order amount.
      equipment_price: productPrice ?? row.amount ?? null,
      is_b2b: row.is_b2b ?? false,
      payex_proof_url: row.payex_proof_url ?? null,
      customer_id_url: row.customer_id_url ?? null,
      leasing_contract_url: row.leasing_contract_url ?? null,
      return_date: row.return_date ?? null,
      follow_ups: followUpsByOrder.get(row.id) ?? [],
    }
  })

  return (
    <div className="flex flex-col max-w-[1400px] mx-auto">
      <RentalsClient rentals={rentals} />
    </div>
  )
}
