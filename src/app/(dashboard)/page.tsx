import Link from "next/link"
import { KpiCards } from "@/components/dashboard/kpi-cards"
import { ChatdaddyStats } from "@/components/dashboard/chatdaddy-stats"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { createClient } from "@/lib/supabase/server"
import {
  FileText,
  Phone,
  ShoppingCart,
  AlertCircle,
  Clock,
  Wallet,
  Bell,
  Zap,
} from "lucide-react"

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return "Good morning"
  if (hour < 17) return "Good afternoon"
  return "Good evening"
}

function formatDate(date: Date) {
  return date.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

function formatShortDate(dateStr: string | null) {
  if (!dateStr) return "TBD"
  try {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  } catch {
    return dateStr
  }
}

export default async function DashboardPage() {
  const greeting = getGreeting()
  const today = formatDate(new Date())

  const supabase = await createClient()

  const [pendingRes, balancesRes, rentalsRes] = await Promise.all([
    // Pending deliveries
    supabase
      .from("orders")
      .select("id, case_code, customer_name, product_name, delivery_date, location")
      .eq("status", "Pending Delivered")
      .order("delivery_date", { ascending: true })
      .limit(10),

    // Outstanding balances
    supabase
      .from("orders")
      .select("id, case_code, customer_name, product_name, balance, payment_date")
      .gt("balance", 0)
      .not("status", "in", '("Cancelled","Returned")')
      .order("balance", { ascending: false })
      .limit(10),

    // Rental follow-ups: delivered rentals
    supabase
      .from("orders")
      .select("id, case_code, customer_name, product_name, monthly_rental, delivery_date, payment_date")
      .ilike("mode", "%rental%")
      .eq("status", "Delivered")
      .order("delivery_date", { ascending: true })
      .limit(10),
  ])

  const pendingDeliveries = pendingRes.data ?? []
  const outstandingBalances = balancesRes.data ?? []
  const rentalFollowUps = rentalsRes.data ?? []

  const totalOutstanding = outstandingBalances.reduce((sum, i) => sum + (i.balance ?? 0), 0)

  return (
    <div className="flex flex-col gap-6 max-w-[1400px] mx-auto">

      {/* Page header bar */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <SidebarTrigger className="text-slate-400 hover:text-slate-600 mt-1 -ml-1" />
          <div>
            <p className="text-xs font-medium text-slate-400 mb-0.5">{today}</p>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              {greeting}, Michelle
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Here&apos;s what&apos;s happening with Pulse Pilates today.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 mt-1">
          <button
            className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm hover:bg-slate-50 hover:text-slate-700 transition-all duration-150"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-indigo-500 ring-2 ring-white" />
          </button>
          <button className="flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 shadow-sm hover:bg-slate-50 transition-all duration-150">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-500 text-xs font-semibold text-white">
              M
            </span>
            <span className="text-sm font-medium text-slate-700">Michelle</span>
          </button>
        </div>
      </div>

      {/* KPI row — 5 cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
        <KpiCards />
        <ChatdaddyStats />
      </div>

      {/* Quick Actions */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm px-5 py-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 mr-2">
            <Zap className="h-4 w-4 text-indigo-500" />
            <span className="text-sm font-semibold text-slate-700">Quick Actions</span>
          </div>
          <div className="h-4 w-px bg-slate-200 hidden sm:block" />
          <Link
            href="/quotations/new"
            className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-indigo-500 text-white text-sm font-semibold shadow-sm transition-all duration-150 hover:bg-indigo-600 hover:shadow-md active:scale-95"
          >
            <FileText className="h-4 w-4" />
            New Quotation
          </Link>
          <Link
            href="/calls/new"
            className="inline-flex items-center gap-2 h-9 px-4 rounded-lg border border-slate-200 bg-white text-slate-700 text-sm font-medium shadow-sm transition-all duration-150 hover:bg-slate-50 hover:border-slate-300 active:scale-95"
          >
            <Phone className="h-4 w-4 text-slate-500" />
            Log Call
          </Link>
          <Link
            href="/orders/new"
            className="inline-flex items-center gap-2 h-9 px-4 rounded-lg border border-slate-200 bg-white text-slate-700 text-sm font-medium shadow-sm transition-all duration-150 hover:bg-slate-50 hover:border-slate-300 active:scale-95"
          >
            <ShoppingCart className="h-4 w-4 text-slate-500" />
            New Order
          </Link>
        </div>
      </div>

      {/* Three-column alert grid */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">

        {/* Pending Deliveries */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-orange-500" />
              <span className="text-sm font-semibold text-slate-800">Pending Deliveries</span>
            </div>
            <span className="inline-flex items-center justify-center rounded-md bg-orange-50 px-2 py-0.5 text-xs font-semibold text-orange-700 border border-orange-100">
              {pendingDeliveries.length}
            </span>
          </div>
          <div className="px-5 py-3 space-y-3">
            {pendingDeliveries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <span className="text-2xl mb-1">&#10003;</span>
                <p className="text-sm font-medium text-slate-600">All clear!</p>
                <p className="text-xs text-slate-400">No pending deliveries</p>
              </div>
            ) : (
              pendingDeliveries.map((item) => (
                <div key={item.id} className="flex flex-col gap-0.5 text-sm border-l-2 border-orange-400 pl-3 py-0.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-slate-800 truncate">{item.customer_name}</span>
                    <span className="text-xs text-slate-400 font-mono flex-shrink-0">{item.case_code}</span>
                  </div>
                  <span className="text-xs text-slate-500">{item.product_name}</span>
                  <span className="text-xs font-medium text-orange-600">
                    {formatShortDate(item.delivery_date)} &middot; {item.location ?? "—"}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Rental Follow-ups Due */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-semibold text-slate-800">Rental Follow-ups Due</span>
            </div>
            <span className="inline-flex items-center justify-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 border border-blue-100">
              {rentalFollowUps.length}
            </span>
          </div>
          <div className="px-5 py-3 space-y-3">
            {rentalFollowUps.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <span className="text-2xl mb-1">&#10003;</span>
                <p className="text-sm font-medium text-slate-600">All clear!</p>
                <p className="text-xs text-slate-400">No follow-ups due</p>
              </div>
            ) : (
              rentalFollowUps.map((item) => (
                <div key={item.id} className="flex flex-col gap-0.5 text-sm border-l-2 border-blue-400 pl-3 py-0.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-slate-800 truncate">{item.customer_name}</span>
                    <span className="text-xs text-slate-400 font-mono flex-shrink-0">{item.case_code}</span>
                  </div>
                  <span className="text-xs text-slate-500">{item.product_name}</span>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-blue-600">
                      {item.monthly_rental ? `RM ${item.monthly_rental}/mo` : "Rental"} &middot; Since {formatShortDate(item.delivery_date)}
                    </span>
                    <Link
                      href={`/rentals/${item.case_code}`}
                      className="text-xs font-medium text-indigo-500 hover:text-indigo-700 transition-colors"
                    >
                      Offer conversion
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Outstanding Balances */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-red-500" />
              <div>
                <span className="text-sm font-semibold text-slate-800">Outstanding Balances</span>
                <p className="text-xs text-slate-400 leading-tight">
                  Total: <span className="font-semibold text-red-600">RM {totalOutstanding.toLocaleString()}</span>
                </p>
              </div>
            </div>
            <span className="inline-flex items-center justify-center rounded-md bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700 border border-red-100">
              {outstandingBalances.length}
            </span>
          </div>
          <div className="px-5 py-3 space-y-3">
            {outstandingBalances.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <span className="text-2xl mb-1">&#10003;</span>
                <p className="text-sm font-medium text-slate-600">All clear!</p>
                <p className="text-xs text-slate-400">No outstanding balances</p>
              </div>
            ) : (
              outstandingBalances.map((item) => (
                <div key={item.id} className="flex flex-col gap-0.5 text-sm border-l-2 border-red-400 pl-3 py-0.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-slate-800 truncate">{item.customer_name}</span>
                    <span className="text-xs font-bold text-red-600 font-mono flex-shrink-0">
                      RM {(item.balance ?? 0).toLocaleString()}
                    </span>
                  </div>
                  <span className="text-xs text-slate-500">{item.product_name}</span>
                  <span className="text-xs font-medium text-red-500">
                    {item.case_code} &middot; Since {formatShortDate(item.payment_date)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
