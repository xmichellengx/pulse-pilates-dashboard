import { createClient } from "@/lib/supabase/server"
import { QuotationsClient } from "@/components/quotations/quotations-client"
import { SidebarTrigger } from "@/components/ui/sidebar"

export default async function QuotationsPage() {
  const supabase = await createClient()

  const [{ data: quotations }, { data: products }] = await Promise.all([
    supabase
      .from("quotations")
      .select("id, quotation_number, customer_name, customer_email, customer_phone, market, pricing_tier, total, subtotal, delivery_fee, installation_fee, items, email_sent, converted_to_order, created_at, expires_at")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("products")
      .select("id, sku_code, name, category, price_myr, price_sgd, p4b_t1_myr, p4b_t2_myr, p4b_t1_sgd, p4b_t2_sgd, rental_myr")
      .eq("is_active", true)
      .order("category").order("name"),
  ])

  return (
    <div className="flex flex-col gap-6 max-w-[1400px] mx-auto">
      <div className="flex items-center gap-3">
        <SidebarTrigger className="text-slate-400 hover:text-slate-600 -ml-1" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Quotations</h1>
          <p className="text-sm text-slate-500 mt-0.5">Build and send quotations to customers.</p>
        </div>
      </div>
      <QuotationsClient initialQuotations={quotations ?? []} products={products ?? []} />
    </div>
  )
}
