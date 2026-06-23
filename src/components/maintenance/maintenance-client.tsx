"use client"

import { useState, useMemo } from "react"
import {
  Wrench,
  Plus,
  Search,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  Check,
  X,
  Truck,
  Hammer,
  Package,
  CalendarDays,
  Pencil,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { formatDate, cn } from "@/lib/utils"

export type OrderOption = {
  id: string
  case_code: string | null
  customer_name: string
  phone: string | null
  product_name: string | null
  delivery_date: string | null
  mode: string | null
  status: string | null
}

export type MaintenanceRequest = {
  id: string
  order_id: string
  requested_date: string
  scheduled_date: string | null
  completed_date: string | null
  issue_description: string | null
  is_under_warranty: boolean
  is_active_rental: boolean
  transport_fee: number
  labour_fee: number
  parts_description: string | null
  parts_cost: number
  total: number
  status: string
  agent: string | null
  notes: string | null
  created_at: string
  order_case_code: string | null
  order_customer_name: string | null
  order_phone: string | null
  order_product_name: string | null
  order_delivery_date: string | null
  order_mode: string | null
}

const STATUS_OPTIONS = ["Pending", "Scheduled", "Completed", "Cancelled"] as const
const DEFAULT_TRANSPORT = 150
const DEFAULT_LABOUR = 80
const WARRANTY_MONTHS = 6

const STATUS_COLORS: Record<string, string> = {
  Pending: "bg-amber-50 text-amber-700 border-amber-100",
  Scheduled: "bg-blue-50 text-blue-700 border-blue-100",
  Completed: "bg-emerald-50 text-emerald-700 border-emerald-100",
  Cancelled: "bg-slate-100 text-slate-500 border-slate-200",
}

function monthsBetween(from: string, to: Date): number {
  const start = new Date(from)
  return (to.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30.44)
}

function isOrderUnderWarranty(deliveryDate: string | null): boolean {
  if (!deliveryDate) return false
  return monthsBetween(deliveryDate, new Date()) <= WARRANTY_MONTHS
}

function isActiveRental(order: OrderOption | null): boolean {
  if (!order) return false
  const modeLooksLikeRental = !!order.mode && /ental/i.test(order.mode)
  return modeLooksLikeRental && (order.status === "Delivered" || order.status === "Pending Delivered")
}

interface MaintenanceClientProps {
  requests: MaintenanceRequest[]
  orderOptions: OrderOption[]
}

export function MaintenanceClient({ requests: initialRequests, orderOptions }: MaintenanceClientProps) {
  const [requests, setRequests] = useState(initialRequests)
  const [showNew, setShowNew] = useState(false)
  const [editTarget, setEditTarget] = useState<MaintenanceRequest | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")

  const trimmed = searchQuery.trim().toLowerCase()
  const filtered = useMemo(() => {
    return requests.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false
      if (!trimmed) return true
      const haystack = [
        r.order_case_code,
        r.order_customer_name,
        r.order_product_name,
        r.issue_description,
      ]
        .filter(Boolean)
        .map((s) => s!.toLowerCase())
        .join(" ")
      return haystack.includes(trimmed)
    })
  }, [requests, statusFilter, trimmed])

  // Headline counts use the unfiltered list.
  const pendingCount = requests.filter((r) => r.status === "Pending").length
  const scheduledCount = requests.filter((r) => r.status === "Scheduled").length
  const completedThisMonth = requests.filter((r) => {
    if (r.status !== "Completed" || !r.completed_date) return false
    const d = new Date(r.completed_date)
    const now = new Date()
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }).length
  const revenueThisMonth = requests
    .filter((r) => {
      if (r.status !== "Completed" || !r.completed_date) return false
      const d = new Date(r.completed_date)
      const now = new Date()
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    })
    .reduce((s, r) => s + (r.total ?? 0), 0)

  function handleCreated(req: MaintenanceRequest) {
    setRequests((prev) => [req, ...prev])
  }

  function handleUpdated(req: MaintenanceRequest) {
    setRequests((prev) => prev.map((r) => (r.id === req.id ? req : r)))
  }

  function handleDeleted(id: string) {
    setRequests((prev) => prev.filter((r) => r.id !== id))
  }

  return (
    <>
      {showNew && (
        <NewMaintenanceModal
          orderOptions={orderOptions}
          onClose={() => setShowNew(false)}
          onCreated={(r) => {
            handleCreated(r)
            setShowNew(false)
          }}
        />
      )}
      {editTarget && (
        <EditMaintenanceModal
          request={editTarget}
          onClose={() => setEditTarget(null)}
          onUpdated={(r) => {
            handleUpdated(r)
            setEditTarget(null)
          }}
          onDeleted={(id) => {
            handleDeleted(id)
            setEditTarget(null)
          }}
        />
      )}

      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <SidebarTrigger className="text-slate-400 hover:text-slate-600 mt-0.5 -ml-1" />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Maintenance</h1>
            <p className="text-sm text-slate-500 mt-0.5">Service requests for existing customers.</p>
          </div>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-indigo-500 text-white text-sm font-semibold shadow-sm hover:bg-indigo-600 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Maintenance Request
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={<Wrench className="h-4 w-4 text-amber-500" />} label="Pending" value={pendingCount.toString()} />
        <StatCard icon={<CalendarDays className="h-4 w-4 text-blue-500" />} label="Scheduled" value={scheduledCount.toString()} />
        <StatCard icon={<Check className="h-4 w-4 text-emerald-500" />} label="Completed (this month)" value={completedThisMonth.toString()} />
        <StatCard icon={<Package className="h-4 w-4 text-indigo-500" />} label="Revenue (this month)" value={`RM ${revenueThisMonth.toLocaleString()}`} />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-800">All Requests</span>
            <span className="inline-flex items-center justify-center rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700 border border-indigo-100">
              {trimmed || statusFilter !== "all" ? `${filtered.length} of ${requests.length}` : requests.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-700 focus:border-indigo-400 focus:outline-none"
            >
              <option value="all">All statuses</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search customer, order #, or issue…"
                className="h-8 w-64 rounded-lg border border-slate-200 bg-white pl-8 pr-3 text-sm text-slate-700 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-300"
              />
            </div>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Wrench className="h-8 w-8 text-slate-300 mb-3" />
            <p className="text-sm font-medium text-slate-600">
              {requests.length === 0 ? "No maintenance requests yet" : "No requests match your filters"}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {requests.length === 0 ? "Create one with the button above." : "Try clearing search or status filter."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Issue</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Requested</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Scheduled</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">Warranty</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Total</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-slate-800 leading-tight">{r.order_customer_name ?? "—"}</div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {r.order_case_code ?? "—"}
                        {r.order_product_name && <span> · {r.order_product_name}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 max-w-[260px]">
                      <p className="text-slate-700 line-clamp-2">{r.issue_description ?? "—"}</p>
                      {r.parts_description && (
                        <p className="text-xs text-slate-400 mt-0.5">Parts: {r.parts_description}</p>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-500">{formatDate(r.requested_date)}</td>
                    <td className="px-4 py-3.5 text-xs text-slate-500">
                      {r.scheduled_date ? formatDate(r.scheduled_date) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      {r.is_under_warranty || r.is_active_rental ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                          <ShieldCheck className="h-3 w-3" />
                          {r.is_active_rental ? "Rental" : "Covered"}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600">
                          <ShieldAlert className="h-3 w-3" />
                          Expired
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <span className="font-semibold text-slate-800">RM {(r.total ?? 0).toLocaleString()}</span>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium", STATUS_COLORS[r.status] ?? "bg-slate-50 text-slate-600 border-slate-100")}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <button
                        onClick={() => setEditTarget(r)}
                        className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md bg-white text-slate-700 text-xs font-medium hover:bg-slate-100 transition-colors border border-slate-200"
                      >
                        <Pencil className="h-3 w-3" />
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-xs font-medium text-slate-500">{label}</span>
      </div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
    </div>
  )
}

function NewMaintenanceModal({
  orderOptions,
  onClose,
  onCreated,
}: {
  orderOptions: OrderOption[]
  onClose: () => void
  onCreated: (req: MaintenanceRequest) => void
}) {
  const [orderQuery, setOrderQuery] = useState("")
  const [selectedOrder, setSelectedOrder] = useState<OrderOption | null>(null)
  const [issueDescription, setIssueDescription] = useState("")
  const [scheduledDate, setScheduledDate] = useState("")
  const [transportFee, setTransportFee] = useState<string>(String(DEFAULT_TRANSPORT))
  const [labourFee, setLabourFee] = useState<string>(String(DEFAULT_LABOUR))
  const [partsDescription, setPartsDescription] = useState("")
  const [partsCost, setPartsCost] = useState<string>("")
  const [notes, setNotes] = useState("")
  const [saving, setSaving] = useState(false)

  const filteredOrders = useMemo(() => {
    const q = orderQuery.trim().toLowerCase()
    if (!q) return orderOptions.slice(0, 25)
    return orderOptions
      .filter((o) => {
        const code = (o.case_code ?? "").toLowerCase()
        const name = (o.customer_name ?? "").toLowerCase()
        return code.includes(q) || name.includes(q)
      })
      .slice(0, 25)
  }, [orderOptions, orderQuery])

  const underWarranty = selectedOrder ? isOrderUnderWarranty(selectedOrder.delivery_date) : false
  const isRental = isActiveRental(selectedOrder)
  const waived = underWarranty || isRental

  const effectiveTransport = waived ? 0 : (Number(transportFee) || 0)
  const effectiveLabour = waived ? 0 : (Number(labourFee) || 0)
  const effectiveParts = waived ? 0 : (Number(partsCost) || 0)
  const total = effectiveTransport + effectiveLabour + effectiveParts

  async function handleSave() {
    if (!selectedOrder) {
      toast.error("Pick a customer's order first")
      return
    }
    setSaving(true)
    try {
      const res = await fetch("/api/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: selectedOrder.id,
          scheduled_date: scheduledDate || null,
          issue_description: issueDescription.trim() || null,
          transport_fee: effectiveTransport,
          labour_fee: effectiveLabour,
          parts_description: partsDescription.trim() || null,
          parts_cost: effectiveParts,
          notes: notes.trim() || null,
        }),
      })
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: "Save failed" }))
        throw new Error(error || "Save failed")
      }
      const data = await res.json()
      const created: MaintenanceRequest = {
        ...data,
        order_case_code: selectedOrder.case_code,
        order_customer_name: selectedOrder.customer_name,
        order_phone: selectedOrder.phone,
        order_product_name: selectedOrder.product_name,
        order_delivery_date: selectedOrder.delivery_date,
        order_mode: selectedOrder.mode,
      }
      onCreated(created)
      toast.success("Maintenance request created")
    } catch (err) {
      console.error(err)
      toast.error(err instanceof Error ? err.message : "Save failed")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-2xl mx-4 rounded-2xl bg-white shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <Wrench className="h-4 w-4 text-indigo-500" />
              New maintenance request
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Service for an existing customer's equipment.</p>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Order picker */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Customer order *</label>
            {selectedOrder ? (
              <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-3 flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    {selectedOrder.customer_name} <span className="text-xs text-slate-500">· {selectedOrder.case_code ?? "no code"}</span>
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {selectedOrder.product_name ?? "—"} · Delivered {selectedOrder.delivery_date ? formatDate(selectedOrder.delivery_date) : "—"} · {selectedOrder.mode ?? "—"}
                  </p>
                </div>
                <button onClick={() => setSelectedOrder(null)} className="text-xs font-medium text-slate-500 hover:text-slate-700">
                  Change
                </button>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                  <input
                    type="search"
                    autoFocus
                    value={orderQuery}
                    onChange={(e) => setOrderQuery(e.target.value)}
                    placeholder="Search by case code or customer name…"
                    className="w-full h-10 pl-9 pr-3 text-sm border-b border-slate-200 focus:outline-none focus:border-indigo-400"
                  />
                </div>
                <div className="max-h-56 overflow-y-auto">
                  {filteredOrders.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-6">No matching orders</p>
                  ) : (
                    filteredOrders.map((o) => (
                      <button
                        key={o.id}
                        type="button"
                        onClick={() => setSelectedOrder(o)}
                        className="w-full text-left px-3 py-2 hover:bg-slate-50 border-b border-slate-50 last:border-0"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium text-slate-800">{o.customer_name}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{o.case_code ?? "—"}</span>
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {o.product_name ?? "—"} · {o.delivery_date ? formatDate(o.delivery_date) : "no delivery"} · {o.mode ?? "—"}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Warranty banner */}
          {selectedOrder && (
            <div
              className={cn(
                "rounded-xl border p-3 text-sm",
                waived ? "bg-emerald-50 border-emerald-100 text-emerald-800" : "bg-amber-50 border-amber-100 text-amber-800"
              )}
            >
              {isRental ? (
                <p className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4" />
                  <span><strong>Active rental</strong> — company covers maintenance, all charges waived.</span>
                </p>
              ) : underWarranty ? (
                <p className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4" />
                  <span><strong>Under warranty</strong> — delivered {formatDate(selectedOrder.delivery_date!)} ({monthsBetween(selectedOrder.delivery_date!, new Date()).toFixed(1)} months ago, &lt; 6). Charges waived.</span>
                </p>
              ) : (
                <p className="flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4" />
                  <span><strong>Warranty expired</strong> — delivered {selectedOrder.delivery_date ? formatDate(selectedOrder.delivery_date) : "—"}. Standard transport + labour applies.</span>
                </p>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Issue description</label>
            <textarea
              value={issueDescription}
              onChange={(e) => setIssueDescription(e.target.value)}
              placeholder="e.g. Spring loose on left side, customer says equipment makes noise on glide"
              rows={3}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-300 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Scheduled visit date</label>
            <input
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              className="w-full h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm focus:border-indigo-400 focus:outline-none"
            />
          </div>

          {/* Charges */}
          <div className={cn("rounded-xl border p-4", waived ? "bg-slate-50 border-slate-200" : "border-slate-200")}>
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3">Charges</p>
            <div className="space-y-2.5">
              <ChargeRow
                icon={<Truck className="h-3.5 w-3.5 text-slate-500" />}
                label="Transport"
                value={transportFee}
                onChange={setTransportFee}
                disabled={waived}
                effectiveValue={effectiveTransport}
              />
              <ChargeRow
                icon={<Hammer className="h-3.5 w-3.5 text-slate-500" />}
                label="Labour"
                value={labourFee}
                onChange={setLabourFee}
                disabled={waived}
                effectiveValue={effectiveLabour}
              />
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-1">
                  <Package className="h-3.5 w-3.5 text-slate-500" />
                  <input
                    type="text"
                    value={partsDescription}
                    onChange={(e) => setPartsDescription(e.target.value)}
                    placeholder="Parts (optional, e.g. footbar bolt)"
                    disabled={waived}
                    className="flex-1 h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs focus:border-indigo-400 focus:outline-none disabled:bg-slate-100 disabled:text-slate-400"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-400">RM</span>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={partsCost}
                    onChange={(e) => setPartsCost(e.target.value)}
                    disabled={waived}
                    className="w-24 h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-right focus:border-indigo-400 focus:outline-none disabled:bg-slate-100 disabled:text-slate-400"
                  />
                </div>
              </div>
              <div className="border-t border-slate-200 pt-2.5 flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-800">Total</span>
                <span className="text-base font-bold text-indigo-600">RM {total.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Internal notes, customer preferences, etc."
              rows={2}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-300 resize-none"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100 sticky bottom-0 bg-white">
          <button onClick={onClose} disabled={saving} className="inline-flex items-center h-9 px-4 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-60">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving || !selectedOrder} className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-indigo-500 text-white text-sm font-semibold hover:bg-indigo-600 transition-colors disabled:opacity-60">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {saving ? "Saving…" : "Create request"}
          </button>
        </div>
      </div>
    </div>
  )
}

function ChargeRow({
  icon,
  label,
  value,
  onChange,
  disabled,
  effectiveValue,
}: {
  icon: React.ReactNode
  label: string
  value: string
  onChange: (v: string) => void
  disabled: boolean
  effectiveValue: number
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 flex-1">
        {icon}
        <span className="text-xs text-slate-700">{label}</span>
        {disabled && <span className="text-[10px] text-emerald-600">(waived)</span>}
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-slate-400">RM</span>
        <input
          type="number"
          min={0}
          step="0.01"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="w-24 h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-right focus:border-indigo-400 focus:outline-none disabled:bg-slate-100 disabled:text-slate-400"
        />
      </div>
      {disabled && effectiveValue === 0 && (
        <span className="text-[10px] text-slate-400 line-through w-12 text-right">RM {(Number(value) || 0).toLocaleString()}</span>
      )}
    </div>
  )
}

function EditMaintenanceModal({
  request,
  onClose,
  onUpdated,
  onDeleted,
}: {
  request: MaintenanceRequest
  onClose: () => void
  onUpdated: (req: MaintenanceRequest) => void
  onDeleted: (id: string) => void
}) {
  const [scheduledDate, setScheduledDate] = useState(request.scheduled_date ?? "")
  const [completedDate, setCompletedDate] = useState(request.completed_date ?? "")
  const [issueDescription, setIssueDescription] = useState(request.issue_description ?? "")
  const [transportFee, setTransportFee] = useState(String(request.transport_fee ?? 0))
  const [labourFee, setLabourFee] = useState(String(request.labour_fee ?? 0))
  const [partsDescription, setPartsDescription] = useState(request.parts_description ?? "")
  const [partsCost, setPartsCost] = useState(String(request.parts_cost ?? 0))
  const [status, setStatus] = useState(request.status)
  const [notes, setNotes] = useState(request.notes ?? "")
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const waived = request.is_under_warranty || request.is_active_rental
  const effectiveTransport = waived ? 0 : (Number(transportFee) || 0)
  const effectiveLabour = waived ? 0 : (Number(labourFee) || 0)
  const effectiveParts = waived ? 0 : (Number(partsCost) || 0)
  const total = effectiveTransport + effectiveLabour + effectiveParts

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch(`/api/maintenance/${request.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduled_date: scheduledDate || null,
          completed_date: completedDate || null,
          issue_description: issueDescription.trim() || null,
          transport_fee: effectiveTransport,
          labour_fee: effectiveLabour,
          parts_description: partsDescription.trim() || null,
          parts_cost: effectiveParts,
          status,
          notes: notes.trim() || null,
        }),
      })
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: "Save failed" }))
        throw new Error(error || "Save failed")
      }
      const data = await res.json()
      onUpdated({
        ...request,
        ...data,
        order_case_code: request.order_case_code,
        order_customer_name: request.order_customer_name,
        order_phone: request.order_phone,
        order_product_name: request.order_product_name,
        order_delivery_date: request.order_delivery_date,
        order_mode: request.order_mode,
      })
      toast.success("Maintenance request updated")
    } catch (err) {
      console.error(err)
      toast.error(err instanceof Error ? err.message : "Save failed")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this maintenance request? This cannot be undone.")) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/maintenance/${request.id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Delete failed")
      onDeleted(request.id)
      toast.success("Maintenance request deleted")
    } catch (err) {
      console.error(err)
      toast.error(err instanceof Error ? err.message : "Delete failed")
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-2xl mx-4 rounded-2xl bg-white shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <Wrench className="h-4 w-4 text-indigo-500" />
              Edit maintenance request
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {request.order_customer_name} · {request.order_case_code ?? "no code"}
            </p>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm focus:border-indigo-400 focus:outline-none">
                {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Scheduled date</label>
              <input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} className="w-full h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm focus:border-indigo-400 focus:outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Completed date</label>
            <input type="date" value={completedDate} onChange={(e) => setCompletedDate(e.target.value)} className="w-full h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm focus:border-indigo-400 focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Issue description</label>
            <textarea value={issueDescription} onChange={(e) => setIssueDescription(e.target.value)} rows={3} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-300 resize-none" />
          </div>

          <div className={cn("rounded-xl border p-4", waived ? "bg-slate-50 border-slate-200" : "border-slate-200")}>
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3">Charges {waived && <span className="text-emerald-600 font-normal">(waived — {request.is_active_rental ? "active rental" : "under warranty"})</span>}</p>
            <div className="space-y-2.5">
              <ChargeRow icon={<Truck className="h-3.5 w-3.5 text-slate-500" />} label="Transport" value={transportFee} onChange={setTransportFee} disabled={waived} effectiveValue={effectiveTransport} />
              <ChargeRow icon={<Hammer className="h-3.5 w-3.5 text-slate-500" />} label="Labour" value={labourFee} onChange={setLabourFee} disabled={waived} effectiveValue={effectiveLabour} />
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-1">
                  <Package className="h-3.5 w-3.5 text-slate-500" />
                  <input type="text" value={partsDescription} onChange={(e) => setPartsDescription(e.target.value)} placeholder="Parts (optional)" disabled={waived} className="flex-1 h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs focus:border-indigo-400 focus:outline-none disabled:bg-slate-100 disabled:text-slate-400" />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-400">RM</span>
                  <input type="number" min={0} step="0.01" value={partsCost} onChange={(e) => setPartsCost(e.target.value)} disabled={waived} className="w-24 h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-right focus:border-indigo-400 focus:outline-none disabled:bg-slate-100 disabled:text-slate-400" />
                </div>
              </div>
              <div className="border-t border-slate-200 pt-2.5 flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-800">Total</span>
                <span className="text-base font-bold text-indigo-600">RM {total.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-300 resize-none" />
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 px-6 py-4 border-t border-slate-100 sticky bottom-0 bg-white">
          <button onClick={handleDelete} disabled={saving || deleting} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-60">
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Delete
          </button>
          <div className="flex items-center gap-2">
            <button onClick={onClose} disabled={saving || deleting} className="inline-flex items-center h-9 px-4 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-60">
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving || deleting} className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-indigo-500 text-white text-sm font-semibold hover:bg-indigo-600 transition-colors disabled:opacity-60">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
