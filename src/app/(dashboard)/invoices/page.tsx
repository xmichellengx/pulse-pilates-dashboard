import { createClient } from "@/lib/supabase/server"
import { InvoicesClient } from "@/components/invoices/invoices-client"
import { SidebarTrigger } from "@/components/ui/sidebar"

export default async function InvoicesPage() {
  const supabase = await createClient()

  const { data: invoices } = await supabase
    .from("invoices")
    .select("id, invoice_number, type, customer_name, customer_email, amount, currency, line_items, order_case_code, pdf_url, sent_at, created_at, order_id")
    .order("created_at", { ascending: false })
    .limit(50)

  return (
    <div className="flex flex-col gap-6 max-w-[1400px] mx-auto">
      <div className="flex items-center gap-3">
        <SidebarTrigger className="text-slate-400 hover:text-slate-600 -ml-1" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Invoices</h1>
          <p className="text-sm text-slate-500 mt-0.5">Generate and manage purchase and rental invoices.</p>
        </div>
      </div>
      <InvoicesClient initialInvoices={invoices ?? []} />
    </div>
  )
}
