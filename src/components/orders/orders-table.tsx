"use client"

import { useState, useTransition } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { SidebarTrigger } from "@/components/ui/sidebar"
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
} from "lucide-react"
import { OrderDetailModal } from "./order-detail-modal"
import { formatCurrency } from "@/lib/utils"

export type Order = {
  id: string
  case_code: string | null
  customer_name: string
  email: string | null
  phone: string | null
  product_name: string | null
  units: number | null
  mode: string | null
  payment_type: string | null
  amount: number | null
  monthly_rental: number | null
  balance: number | null
  payment_date: string | null
  delivery_date: string | null
  location: string | null
  address: string | null
  status: string | null
  lead_source: string | null
  market: string | null
  invoice_sent: boolean | null
  payex_status: string | null
  remarks: string | null
  created_at: string
}

interface OrdersTableProps {
  orders: Order[]
  total: number
  page: number
  pageSize: number
  year: string
  status: string
  mode: string
  search: string
  onOrderUpdate?: (updatedOrder: Order) => void
}

const STATUS_COLORS: Record<string, string> = {
  Delivered: "bg-green-50 text-green-700 border-green-100",
  "Pending Delivered": "bg-amber-50 text-amber-700 border-amber-100",
  Pending: "bg-amber-50 text-amber-700 border-amber-100",
  Cancelled: "bg-red-50 text-red-700 border-red-100",
  Returned: "bg-slate-100 text-slate-600 border-slate-200",
}

const MODE_COLORS: Record<string, string> = {
  Rental: "bg-purple-50 text-purple-700 border-purple-100",
  "Direct Purchase": "bg-blue-50 text-blue-700 border-blue-100",
  P4B: "bg-indigo-50 text-indigo-700 border-indigo-100",
  KOL: "bg-pink-50 text-pink-700 border-pink-100",
}

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return null
  const cls = STATUS_COLORS[status] ?? "bg-slate-50 text-slate-600 border-slate-100"
  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${cls}`}>
      {status}
    </span>
  )
}

function ModeBadge({ mode }: { mode: string | null }) {
  if (!mode) return <span className="text-slate-400 text-xs">—</span>
  const cls = MODE_COLORS[mode] ?? "bg-slate-50 text-slate-600 border-slate-100"
  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${cls}`}>
      {mode}
    </span>
  )
}

function formatDisplayDate(dateStr: string | null) {
  if (!dateStr) return "—"
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

function downloadCSV(orders: Order[]) {
  const headers = [
    "Case Code", "Customer", "Email", "Phone", "Product", "Units",
    "Mode", "Amount (RM)", "Balance (RM)", "Status", "Delivery Date",
    "Payment Date", "Lead Source", "Market", "Location", "Remarks",
  ]
  const rows = orders.map(o => [
    o.case_code ?? "",
    o.customer_name,
    o.email ?? "",
    o.phone ?? "",
    o.product_name ?? "",
    o.units ?? 1,
    o.mode ?? "",
    o.amount ?? "",
    o.balance ?? "",
    o.status ?? "",
    o.delivery_date ?? "",
    o.payment_date ?? "",
    o.lead_source ?? "",
    o.market ?? "",
    o.location ?? "",
    (o.remarks ?? "").replace(/,/g, ";"),
  ])
  const csv = [headers, ...rows].map(r => r.join(",")).join("\n")
  const blob = new Blob([csv], { type: "text/csv" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `orders-export-${new Date().toISOString().split("T")[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export function OrdersTable({
  orders,
  total,
  page,
  pageSize,
  year,
  status,
  mode,
  search,
  onOrderUpdate,
}: OrdersTableProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [localOrders, setLocalOrders] = useState<Order[]>(orders)

  function handleOrderUpdate(updatedOrder: Order) {
    setLocalOrders((prev) => prev.map((o) => o.id === updatedOrder.id ? updatedOrder : o))
    if (selectedOrder?.id === updatedOrder.id) setSelectedOrder(updatedOrder)
    onOrderUpdate?.(updatedOrder)
  }

  const totalPages = Math.ceil(total / pageSize)

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value && value !== "All") {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    params.delete("page") // reset to page 1 on filter change
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`)
    })
  }

  function goToPage(p: number) {
    const params = new URLSearchParams(searchParams.toString())
    params.set("page", String(p))
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`)
    })
  }

  return (
    <>
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search name or case code..."
            defaultValue={search}
            onChange={(e) => {
              const v = e.target.value
              clearTimeout((window as any).__searchTimer)
              ;(window as any).__searchTimer = setTimeout(() => updateParam("search", v), 350)
            }}
            className="w-full h-9 pl-9 pr-3 text-sm rounded-lg border border-slate-200 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 placeholder:text-slate-400"
          />
        </div>

        {/* Year */}
        <select
          value={year}
          onChange={(e) => updateParam("year", e.target.value)}
          className="h-9 px-3 text-sm rounded-lg border border-slate-200 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 cursor-pointer"
        >
          <option value="All">All Years</option>
          <option value="2024">2024</option>
          <option value="2025">2025</option>
          <option value="2026">2026</option>
        </select>

        {/* Status */}
        <select
          value={status}
          onChange={(e) => updateParam("status", e.target.value)}
          className="h-9 px-3 text-sm rounded-lg border border-slate-200 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 cursor-pointer"
        >
          <option value="All">All Statuses</option>
          <option value="Delivered">Delivered</option>
          <option value="Pending Delivered">Pending Delivered</option>
          <option value="Pending">Pending</option>
          <option value="Cancelled">Cancelled</option>
          <option value="Returned">Returned</option>
        </select>

        {/* Mode */}
        <select
          value={mode}
          onChange={(e) => updateParam("mode", e.target.value)}
          className="h-9 px-3 text-sm rounded-lg border border-slate-200 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 cursor-pointer"
        >
          <option value="All">All Modes</option>
          <option value="Direct Purchase">Direct Purchase</option>
          <option value="Rental">Rental</option>
          <option value="P4B">P4B</option>
        </select>

        <div className="flex-1" />

        {/* Export */}
        <button
          onClick={() => downloadCSV(orders)}
          className="inline-flex items-center gap-2 h-9 px-4 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-all"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60">
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide w-28">Case Code</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Product</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide w-32">Mode</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide w-28">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide w-36">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide w-32">Delivery</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide w-28">Source</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide w-16">View</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {localOrders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-sm text-slate-400">
                    No orders found for the selected filters.
                  </td>
                </tr>
              ) : (
                localOrders.map((order) => (
                  <tr
                    key={order.id}
                    className="hover:bg-slate-50/60 transition-colors cursor-pointer"
                    onClick={() => setSelectedOrder(order)}
                  >
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-slate-600 font-medium">
                        {order.case_code ?? "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">{order.customer_name}</div>
                      {order.location && (
                        <div className="text-xs text-slate-400 mt-0.5">{order.location}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-slate-700">{order.product_name ?? "—"}</span>
                      {order.units && order.units > 1 && (
                        <span className="ml-1.5 text-xs text-slate-400">×{order.units}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <ModeBadge mode={order.mode} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      {order.amount != null ? (
                        <div>
                          <span className="font-semibold text-slate-800">
                            {formatCurrency(order.amount)}
                          </span>
                          {order.balance != null && order.balance > 0 && (
                            <div className="text-xs text-red-500 mt-0.5">
                              bal {formatCurrency(order.balance)}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {formatDisplayDate(order.delivery_date)}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {order.lead_source ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-center" onClick={(e) => { e.stopPropagation(); setSelectedOrder(order) }}>
                      <button className="inline-flex items-center justify-center h-7 w-7 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors">
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50/40">
            <p className="text-xs text-slate-500">
              Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total} orders
            </p>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => goToPage(page - 1)}
                disabled={page <= 1}
                className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                // show pages around current
                let p = page - 2 + i
                if (totalPages <= 5) p = i + 1
                else if (page <= 3) p = i + 1
                else if (page >= totalPages - 2) p = totalPages - 4 + i
                if (p < 1 || p > totalPages) return null
                return (
                  <button
                    key={p}
                    onClick={() => goToPage(p)}
                    className={`inline-flex h-7 w-7 items-center justify-center rounded-md text-xs font-medium transition-all ${
                      p === page
                        ? "bg-indigo-500 text-white border border-indigo-500"
                        : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {p}
                  </button>
                )
              })}
              <button
                onClick={() => goToPage(page + 1)}
                disabled={page >= totalPages}
                className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail modal */}
      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onUpdate={handleOrderUpdate}
        />
      )}
    </>
  )
}
