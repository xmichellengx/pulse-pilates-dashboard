import { createClient } from "@/lib/supabase/server"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Users } from "lucide-react"
import { LogLeadsForm } from "@/components/leads/log-leads-form"
import { LeadsCharts } from "@/components/leads/leads-charts"

export default async function LeadsPage() {
  const supabase = await createClient()

  // Fetch last 30 days of lead entries
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const since = thirtyDaysAgo.toISOString().split("T")[0]

  const { data: entries, error } = await supabase
    .from("leads")
    .select("*")
    .gte("date", since)
    .order("date", { ascending: false })

  if (error) {
    console.error("Leads query error:", error)
  }

  const allEntries = entries ?? []
  const todayStr = new Date().toISOString().split("T")[0]
  const totalToday = allEntries
    .filter((e) => e.date === todayStr)
    .reduce((sum, e) => sum + e.count, 0)

  const totalPeriod = allEntries.reduce((sum, e) => sum + e.count, 0)

  return (
    <div className="flex flex-col gap-6 max-w-[1400px] mx-auto">
      {/* Page header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <SidebarTrigger className="text-slate-400 hover:text-slate-600 -ml-1" />
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-50">
              <Users className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Leads Tracker</h1>
              <p className="text-sm text-slate-500">Log and track daily lead counts by source</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="rounded-lg border border-slate-200 bg-white shadow-sm px-4 py-2 text-center">
            <p className="text-xs text-slate-400">Today</p>
            <p className="text-lg font-bold text-slate-900">{totalToday}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white shadow-sm px-4 py-2 text-center">
            <p className="text-xs text-slate-400">Last 30d</p>
            <p className="text-lg font-bold text-slate-900">{totalPeriod}</p>
          </div>
        </div>
      </div>

      {/* Log form */}
      <LogLeadsForm />

      {/* Charts */}
      <LeadsCharts entries={allEntries} />

      {/* Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-800">All Logged Entries (Last 30 days)</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60">
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Source</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Market</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Count</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Logged By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {allEntries.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-400">
                    No entries yet. Log your first leads above.
                  </td>
                </tr>
              ) : (
                allEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 text-slate-700 font-medium">
                      {new Date(entry.date).toLocaleDateString("en-GB", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-md bg-indigo-50 border border-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
                        {entry.source}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-semibold text-slate-600 bg-slate-100 rounded px-1.5 py-0.5">
                        {entry.market}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-lg font-bold text-slate-900">{entry.count}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{entry.logged_by ?? "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
