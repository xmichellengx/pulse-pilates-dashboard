import { createClient } from "@/lib/supabase/server"
import { CallLogClient } from "@/components/calls/call-log-client"
import { SidebarTrigger } from "@/components/ui/sidebar"

export default async function CallsPage() {
  const supabase = await createClient()

  const { data: calls } = await supabase
    .from("calls")
    .select("id, date, agent, customer_name, phone, outcome, notes, order_id, created_at")
    .order("created_at", { ascending: false })
    .limit(200)

  return (
    <div className="flex flex-col gap-6 max-w-[1400px] mx-auto">
      <div className="flex items-center gap-3">
        <SidebarTrigger className="text-slate-400 hover:text-slate-600 -ml-1" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Call Log</h1>
          <p className="text-sm text-slate-500 mt-0.5">Log and track all sales call activity.</p>
        </div>
      </div>
      <CallLogClient initialCalls={calls ?? []} />
    </div>
  )
}
