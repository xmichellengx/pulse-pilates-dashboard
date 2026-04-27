import { createClient } from "@/lib/supabase/server"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { ShoppingCart, Plus } from "lucide-react"
import Link from "next/link"
import { OrdersTable } from "@/components/orders/orders-table"

const PAGE_SIZE = 50

interface OrdersPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function OrdersPage({ searchParams }: OrdersPageProps) {
  const params = await searchParams
  const year = typeof params.year === "string" ? params.year : "All"
  const status = typeof params.status === "string" ? params.status : "All"
  const mode = typeof params.mode === "string" ? params.mode : "All"
  const search = typeof params.search === "string" ? params.search : ""
  const page = typeof params.page === "string" ? Math.max(1, parseInt(params.page, 10)) : 1

  const supabase = await createClient()

  let query = supabase
    .from("orders")
    .select("*", { count: "exact" })
    .order("payment_date", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)

  // Year filter — based on payment_date
  if (year !== "All") {
    query = query
      .gte("payment_date", `${year}-01-01`)
      .lte("payment_date", `${year}-12-31`)
  }

  // Status filter
  if (status !== "All") {
    query = query.eq("status", status)
  }

  // Mode filter
  if (mode !== "All") {
    query = query.ilike("mode", `%${mode}%`)
  }

  // Search
  if (search) {
    query = query.or(
      `customer_name.ilike.%${search}%,case_code.ilike.%${search}%`
    )
  }

  const { data: orders, count, error } = await query

  if (error) {
    console.error("Orders query error:", error)
  }

  const total = count ?? 0

  return (
    <div className="flex flex-col gap-6 max-w-[1400px] mx-auto">
      {/* Page header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <SidebarTrigger className="text-slate-400 hover:text-slate-600 -ml-1" />
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
              <ShoppingCart className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Orders</h1>
              <p className="text-sm text-slate-500">All purchase and rental orders</p>
            </div>
          </div>
        </div>
        <div className="flex flex-shrink-0 items-center gap-3">
          <span className="inline-flex items-center rounded-full bg-slate-100 border border-slate-200 px-3 py-1 text-sm font-semibold text-slate-700">
            {total.toLocaleString()} orders
          </span>
          <Link
            href="/orders/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Order
          </Link>
        </div>
      </div>

      {/* Interactive table with filters */}
      <OrdersTable
        orders={orders ?? []}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
        year={year}
        status={status}
        mode={mode}
        search={search}
      />
    </div>
  )
}
