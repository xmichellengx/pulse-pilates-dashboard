import { TrendingUp, ShoppingCart, Repeat, MessageSquare } from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import { createClient } from "@/lib/supabase/server"

interface KpiCardProps {
  title: string
  value: string
  period?: string
  badge?: string
  badgeColor?: "green" | "blue" | "amber" | "orange"
  icon: React.ReactNode
  iconBg: string
  live?: boolean
}

function KpiCard({
  title,
  value,
  period,
  badge,
  badgeColor = "green",
  icon,
  iconBg,
  live,
}: KpiCardProps) {
  const badgeClasses = {
    green: "bg-green-50 text-green-700 border border-green-100",
    blue: "bg-blue-50 text-blue-700 border border-blue-100",
    amber: "bg-amber-50 text-amber-700 border border-amber-100",
    orange: "bg-orange-50 text-orange-700 border border-orange-100",
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-5 flex flex-col gap-3 hover:shadow-md transition-shadow duration-200">
      {/* Header row */}
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${iconBg}`}>
          {icon}
        </div>
        <span className="text-xs font-medium text-slate-400 text-right leading-tight pt-0.5">{title}</span>
      </div>

      {/* Value */}
      <div>
        <p className="text-3xl font-bold text-slate-900 tracking-tight leading-none">{value}</p>
      </div>

      {/* Footer row */}
      <div className="flex items-center justify-between pt-1 border-t border-slate-100">
        <span className="text-xs text-slate-400">{period ?? "\u00A0"}</span>
        {live ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-600">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
            </span>
            Live
          </span>
        ) : badge ? (
          <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${badgeClasses[badgeColor]}`}>
            {badge}
          </span>
        ) : null}
      </div>
    </div>
  )
}

export async function KpiCards() {
  const supabase = await createClient()

  const now = new Date()
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`
  const todayStr = now.toISOString().split("T")[0]
  const monthLabel = now.toLocaleDateString("en-GB", { month: "long", year: "numeric" })

  // Run all 4 queries in parallel
  const [revenueRes, ordersRes, rentalsRes, leadsRes] = await Promise.all([
    // Revenue MTD
    supabase
      .from("orders")
      .select("amount")
      .gte("payment_date", monthStart)
      .not("status", "in", '("Cancelled","Returned")'),

    // Orders MTD
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .gte("payment_date", monthStart),

    // Active Rentals: mode contains rental, delivered, balance cleared
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .ilike("mode", "%rental%")
      .eq("status", "Delivered")
      .eq("balance", 0),

    // Leads Today
    supabase
      .from("leads")
      .select("count")
      .eq("date", todayStr),
  ])

  const revenueMTD = (revenueRes.data ?? []).reduce(
    (sum, r) => sum + (r.amount ?? 0),
    0
  )
  const ordersMTD = ordersRes.count ?? 0
  const activeRentals = rentalsRes.count ?? 0
  const leadsToday = (leadsRes.data ?? []).reduce(
    (sum, r) => sum + (r.count ?? 0),
    0
  )

  const kpis: KpiCardProps[] = [
    {
      title: "Revenue MTD",
      value: formatCurrency(revenueMTD),
      period: monthLabel,
      iconBg: "bg-green-50",
      icon: <TrendingUp className="h-5 w-5 text-green-600" />,
    },
    {
      title: "Orders MTD",
      value: String(ordersMTD),
      period: monthLabel,
      badgeColor: "blue",
      iconBg: "bg-blue-50",
      icon: <ShoppingCart className="h-5 w-5 text-blue-600" />,
    },
    {
      title: "Active Rentals",
      value: String(activeRentals),
      period: "Delivered, balance cleared",
      badgeColor: "amber",
      iconBg: "bg-purple-50",
      icon: <Repeat className="h-5 w-5 text-purple-600" />,
    },
    {
      title: "Leads Today",
      value: String(leadsToday),
      period: "via all channels",
      live: true,
      iconBg: "bg-orange-50",
      icon: <MessageSquare className="h-5 w-5 text-orange-600" />,
    },
  ]

  return (
    <>
      {kpis.map((kpi) => (
        <KpiCard key={kpi.title} {...kpi} />
      ))}
    </>
  )
}
