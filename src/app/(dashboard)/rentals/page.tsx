import { createClient } from "@/lib/supabase/server"
import { RentalsClient, type RentalOrder } from "@/components/rentals/rentals-client"

export default async function RentalsPage() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("orders")
    .select(
      "id, case_code, customer_name, phone, email, product_name, monthly_rental, delivery_date, status, payex_status, balance, equipment_price"
    )
    .ilike("mode", "%ental%")
    .in("status", ["Delivered", "Pending Delivered"])
    .order("delivery_date", { ascending: true })

  if (error) {
    console.error("Rentals fetch error:", error)
  }

  const rentals: RentalOrder[] = (data ?? []).map((row) => ({
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
    equipment_price: row.equipment_price ?? null,
  }))

  return (
    <div className="flex flex-col max-w-[1400px] mx-auto">
      <RentalsClient rentals={rentals} />
    </div>
  )
}
