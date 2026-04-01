import { createClient } from "@/lib/supabase/server"
import { QuotationsClient } from "@/components/quotations/quotations-client"
import { SidebarTrigger } from "@/components/ui/sidebar"

export default async function QuotationsPage() {
  const supabase = await createClient()

  const { data: quotations } = await supabase
    .from("quotations")
    .select("id, quotation_number, customer_name, customer_phone, market, total, items, email_sent, converted_to_order, created_at, expires_at")
    .order("created_at", { ascending: false })
    .limit(50)

  return (
    <div className="flex flex-col gap-6 max-w-[1400px] mx-auto">
      <div className="flex items-center gap-3">
        <SidebarTrigger className="text-slate-400 hover:text-slate-600 -ml-1" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Quotations</h1>
          <p className="text-sm text-slate-500 mt-0.5">Build and send quotations to customers.</p>
        </div>
      </div>
      <QuotationsClient initialQuotations={quotations ?? []} />
    </div>
  )
}
