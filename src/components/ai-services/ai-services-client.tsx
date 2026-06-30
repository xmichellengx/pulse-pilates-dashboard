"use client"

import { useMemo, useState } from "react"
import {
  Sparkles,
  Plus,
  X,
  Check,
  Loader2,
  Pencil,
  Trash2,
  FileDown,
  Receipt,
  CalendarDays,
  Wrench,
  Wallet,
} from "lucide-react"
import { toast } from "sonner"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

export type UpfrontItem = { description: string }

export type Engagement = {
  id: string
  engagement_number: string | null
  client_name: string
  project_name: string
  client_email: string | null
  client_phone: string | null
  client_address: string | null
  status: "active" | "paused" | "completed" | "cancelled"
  upfront_items: UpfrontItem[]
  upfront_amount: number
  upfront_paid_date: string | null
  maintenance_start_date: string | null
  trial_months_free: number
  year_one_monthly: number
  year_two_plus_monthly: number
  scope_notes: string | null
  internal_notes: string | null
  created_at: string
  updated_at: string
}

export type Invoice = {
  id: string
  engagement_id: string
  invoice_number: string
  invoice_type: "upfront" | "maintenance"
  period_label: string | null
  period_year: number | null
  period_month: number | null
  amount: number
  invoice_date: string
  due_date: string | null
  payment_date: string | null
  status: "draft" | "sent" | "paid" | "void"
  notes: string | null
  created_at: string
}

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700 border-emerald-100",
  paused: "bg-amber-50 text-amber-700 border-amber-100",
  completed: "bg-slate-100 text-slate-600 border-slate-200",
  cancelled: "bg-red-50 text-red-700 border-red-100",
}

const INVOICE_STATUS_COLORS: Record<string, string> = {
  draft: "bg-slate-50 text-slate-600 border-slate-200",
  sent: "bg-indigo-50 text-indigo-700 border-indigo-100",
  paid: "bg-emerald-50 text-emerald-700 border-emerald-100",
  void: "bg-red-50 text-red-600 border-red-100",
}

function formatDate(iso: string | null): string {
  if (!iso) return "—"
  const d = new Date(iso)
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
}

function formatShortDate(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`
}

/** Compute the monthly maintenance rate for a given period under an engagement's plan. */
function computeMonthlyRate(eng: Engagement, periodYear: number, periodMonth: number): {
  amount: number
  reason: "trial" | "year_one" | "year_two_plus" | "before_start"
} {
  if (!eng.maintenance_start_date) {
    return { amount: eng.year_one_monthly, reason: "year_one" }
  }
  const start = new Date(eng.maintenance_start_date)
  const period = new Date(periodYear, periodMonth - 1, 1)
  if (period < start) return { amount: 0, reason: "before_start" }
  const monthsSinceStart =
    (period.getFullYear() - start.getFullYear()) * 12 + (period.getMonth() - start.getMonth())
  if (monthsSinceStart < eng.trial_months_free) return { amount: 0, reason: "trial" }
  if (monthsSinceStart < 12) return { amount: eng.year_one_monthly, reason: "year_one" }
  return { amount: eng.year_two_plus_monthly, reason: "year_two_plus" }
}

interface Props {
  engagements: Engagement[]
  invoices: Invoice[]
}

export function AiServicesClient({ engagements: initialEng, invoices: initialInv }: Props) {
  const [engagements, setEngagements] = useState<Engagement[]>(initialEng)
  const [invoices, setInvoices] = useState<Invoice[]>(initialInv)
  const [showNewEng, setShowNewEng] = useState(false)
  const [editTarget, setEditTarget] = useState<Engagement | null>(null)
  const [invoiceTarget, setInvoiceTarget] = useState<{ engagement: Engagement } | null>(null)

  // KPI calcs
  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()
  const paidThisMonth = invoices
    .filter((inv) => {
      if (inv.status !== "paid" || !inv.payment_date) return false
      const d = new Date(inv.payment_date)
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear
    })
    .reduce((s, i) => s + (i.amount ?? 0), 0)
  const totalLifetime = invoices.filter((i) => i.status === "paid").reduce((s, i) => s + (i.amount ?? 0), 0)
  const outstandingSent = invoices
    .filter((i) => i.status === "sent")
    .reduce((s, i) => s + (i.amount ?? 0), 0)
  const activeEngagements = engagements.filter((e) => e.status === "active").length

  function handleEngagementCreated(e: Engagement) {
    setEngagements((prev) => [e, ...prev])
  }
  function handleEngagementUpdated(e: Engagement) {
    setEngagements((prev) => prev.map((x) => (x.id === e.id ? e : x)))
  }
  function handleEngagementDeleted(id: string) {
    setEngagements((prev) => prev.filter((x) => x.id !== id))
    setInvoices((prev) => prev.filter((i) => i.engagement_id !== id))
  }
  function handleInvoiceCreated(inv: Invoice) {
    setInvoices((prev) => [inv, ...prev])
  }
  function handleInvoiceUpdated(inv: Invoice) {
    setInvoices((prev) => prev.map((x) => (x.id === inv.id ? inv : x)))
  }
  function handleInvoiceDeleted(id: string) {
    setInvoices((prev) => prev.filter((x) => x.id !== id))
  }

  return (
    <>
      {showNewEng && (
        <EngagementModal
          mode="create"
          onClose={() => setShowNewEng(false)}
          onCreated={(e) => {
            handleEngagementCreated(e)
            setShowNewEng(false)
          }}
        />
      )}
      {editTarget && (
        <EngagementModal
          mode="edit"
          engagement={editTarget}
          onClose={() => setEditTarget(null)}
          onUpdated={(e) => {
            handleEngagementUpdated(e)
            setEditTarget(null)
          }}
          onDeleted={(id) => {
            handleEngagementDeleted(id)
            setEditTarget(null)
          }}
        />
      )}
      {invoiceTarget && (
        <GenerateInvoiceModal
          engagement={invoiceTarget.engagement}
          existingInvoices={invoices.filter((i) => i.engagement_id === invoiceTarget.engagement.id)}
          onClose={() => setInvoiceTarget(null)}
          onCreated={(inv) => {
            handleInvoiceCreated(inv)
          }}
          onUpdated={handleInvoiceUpdated}
          onDeleted={handleInvoiceDeleted}
        />
      )}

      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <SidebarTrigger className="text-slate-400 hover:text-slate-600 mt-0.5 -ml-1" />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-indigo-500" />
              AI Services
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">Engagements + invoices for AI/software side work. Private to Michelle.</p>
          </div>
        </div>
        <button
          onClick={() => setShowNewEng(true)}
          className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-indigo-500 text-white text-sm font-semibold shadow-sm hover:bg-indigo-600 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Engagement
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={<Sparkles className="h-4 w-4 text-indigo-500" />} label="Active engagements" value={activeEngagements.toString()} />
        <StatCard icon={<Wallet className="h-4 w-4 text-emerald-500" />} label="Earnings (this month)" value={`RM ${paidThisMonth.toLocaleString()}`} />
        <StatCard icon={<Receipt className="h-4 w-4 text-amber-500" />} label="Outstanding (sent, unpaid)" value={`RM ${outstandingSent.toLocaleString()}`} />
        <StatCard icon={<CalendarDays className="h-4 w-4 text-slate-500" />} label="Lifetime earnings" value={`RM ${totalLifetime.toLocaleString()}`} />
      </div>

      {/* Engagements */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden mb-6">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-800">Engagements</span>
          <span className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700 border border-indigo-100">
            {engagements.length}
          </span>
        </div>
        {engagements.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Sparkles className="h-8 w-8 text-slate-300 mb-3" />
            <p className="text-sm font-medium text-slate-600">No engagements yet</p>
            <p className="text-xs text-slate-400 mt-1">Create one with the button above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Client / Project</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Maintenance plan</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Upfront</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {engagements.map((e) => {
                  const engInvCount = invoices.filter((i) => i.engagement_id === e.id).length
                  return (
                    <tr
                      key={e.id}
                      className="hover:bg-slate-50/50 transition-colors cursor-pointer"
                      onClick={() => setEditTarget(e)}
                    >
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5 leading-tight">
                          <span className="font-semibold text-slate-800">{e.client_name}</span>
                          {e.engagement_number && (
                            <span className="inline-flex items-center rounded-md bg-indigo-50 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-indigo-700 border border-indigo-100">
                              {e.engagement_number}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">{e.project_name}</div>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-600">
                        {e.maintenance_start_date ? (
                          <div className="space-y-0.5">
                            <div>Delivery: {formatDate(e.maintenance_start_date)}</div>
                            <div className="text-slate-500">
                              {e.trial_months_free}mo FOC · then RM {e.year_one_monthly}/mo (yr 1) · RM {e.year_two_plus_monthly}/mo (yr 2+)
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="font-semibold text-slate-800">RM {(e.upfront_amount ?? 0).toLocaleString()}</div>
                        {e.upfront_paid_date && (
                          <div className="text-[10px] text-emerald-600 mt-0.5">Paid {formatDate(e.upfront_paid_date)}</div>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize", STATUS_COLORS[e.status])}>
                          {e.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5" onClick={(ev) => ev.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setInvoiceTarget({ engagement: e })}
                            className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md bg-indigo-50 text-indigo-700 text-xs font-medium hover:bg-indigo-100 transition-colors border border-indigo-100"
                          >
                            <Receipt className="h-3 w-3" />
                            Invoices ({engInvCount})
                          </button>
                          <button
                            onClick={() => setEditTarget(e)}
                            className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md bg-white text-slate-700 text-xs font-medium hover:bg-slate-100 transition-colors border border-slate-200"
                          >
                            <Pencil className="h-3 w-3" />
                            Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* All invoices */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-800">All invoices</span>
          <span className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700 border border-indigo-100">
            {invoices.length}
          </span>
        </div>
        {invoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Receipt className="h-8 w-8 text-slate-300 mb-3" />
            <p className="text-sm font-medium text-slate-600">No invoices yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Invoice #</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Engagement</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Type / Period</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Invoice date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Payment date</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Amount</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.map((i) => {
                  const eng = engagements.find((e) => e.id === i.engagement_id)
                  return (
                    <tr key={i.id} className="hover:bg-slate-50/50 cursor-pointer" onClick={() => eng && setInvoiceTarget({ engagement: eng })}>
                      <td className="px-4 py-3 font-mono text-xs">{i.invoice_number}</td>
                      <td className="px-4 py-3">
                        <div className="text-slate-800">{eng?.client_name ?? "—"}</div>
                        <div className="text-xs text-slate-500">{eng?.project_name ?? "—"}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="capitalize text-slate-700">{i.invoice_type}</div>
                        {i.period_label && <div className="text-xs text-slate-500">{i.period_label}</div>}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">{formatDate(i.invoice_date)}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {i.payment_date ? formatDate(i.payment_date) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-800">RM {(i.amount ?? 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize", INVOICE_STATUS_COLORS[i.status])}>
                          {i.status}
                        </span>
                      </td>
                      <td className="px-4 py-3" onClick={(ev) => ev.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={async () => {
                              if (!confirm(`Delete invoice ${i.invoice_number}? This cannot be undone.`)) return
                              try {
                                const res = await fetch(`/api/ai-invoices/${i.id}`, { method: "DELETE" })
                                if (!res.ok) throw new Error("Delete failed")
                                handleInvoiceDeleted(i.id)
                                toast.success("Invoice deleted")
                              } catch (err) {
                                console.error(err)
                                toast.error(err instanceof Error ? err.message : "Delete failed")
                              }
                            }}
                            className="inline-flex items-center gap-1 h-7 px-2 rounded-md text-red-600 text-xs font-medium hover:bg-red-50 transition-colors"
                            title="Delete invoice"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
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

// ────────────────────────────────────────────────────────────────────────────
// Engagement modal (create + edit)
// ────────────────────────────────────────────────────────────────────────────

const inputCls =
  "w-full h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-300"

function EngagementModal(props:
  | { mode: "create"; onClose: () => void; onCreated: (e: Engagement) => void }
  | { mode: "edit"; engagement: Engagement; onClose: () => void; onUpdated: (e: Engagement) => void; onDeleted: (id: string) => void }
) {
  const initial = props.mode === "edit" ? props.engagement : null
  const [engagementNumber, setEngagementNumber] = useState(initial?.engagement_number ?? "")
  const [clientName, setClientName] = useState(initial?.client_name ?? "")
  const [projectName, setProjectName] = useState(initial?.project_name ?? "")
  const [clientEmail, setClientEmail] = useState(initial?.client_email ?? "")
  const [clientPhone, setClientPhone] = useState(initial?.client_phone ?? "")
  const [clientAddress, setClientAddress] = useState(initial?.client_address ?? "")
  const [status, setStatus] = useState<Engagement["status"]>(initial?.status ?? "active")
  const [items, setItems] = useState<UpfrontItem[]>(initial?.upfront_items ?? [{ description: "" }])
  const [upfrontAmount, setUpfrontAmount] = useState(String(initial?.upfront_amount ?? ""))
  const [upfrontPaidDate, setUpfrontPaidDate] = useState(initial?.upfront_paid_date ?? "")
  const [maintenanceStartDate, setMaintenanceStartDate] = useState(initial?.maintenance_start_date ?? "")
  const [trialMonthsFree, setTrialMonthsFree] = useState(String(initial?.trial_months_free ?? 2))
  const [yearOneMonthly, setYearOneMonthly] = useState(String(initial?.year_one_monthly ?? ""))
  const [yearTwoPlusMonthly, setYearTwoPlusMonthly] = useState(String(initial?.year_two_plus_monthly ?? ""))
  const [scopeNotes, setScopeNotes] = useState(initial?.scope_notes ?? "")
  const [internalNotes, setInternalNotes] = useState(initial?.internal_notes ?? "")
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  function updateItem(idx: number, value: string) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { description: value } : it)))
  }
  function addItem() {
    setItems((prev) => [...prev, { description: "" }])
  }
  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx))
  }

  async function handleSave() {
    if (!clientName.trim() || !projectName.trim()) {
      toast.error("Client and project name are required")
      return
    }
    setSaving(true)
    try {
      const body = {
        engagement_number: engagementNumber.trim() || undefined,
        client_name: clientName.trim(),
        project_name: projectName.trim(),
        client_email: clientEmail.trim() || null,
        client_phone: clientPhone.trim() || null,
        client_address: clientAddress.trim() || null,
        status,
        upfront_items: items.filter((i) => i.description.trim()).map((i) => ({ description: i.description.trim() })),
        upfront_amount: Number(upfrontAmount) || 0,
        upfront_paid_date: upfrontPaidDate || null,
        maintenance_start_date: maintenanceStartDate || null,
        trial_months_free: Number(trialMonthsFree) || 0,
        year_one_monthly: Number(yearOneMonthly) || 0,
        year_two_plus_monthly: Number(yearTwoPlusMonthly) || 0,
        scope_notes: scopeNotes.trim() || null,
        internal_notes: internalNotes.trim() || null,
      }
      const url = props.mode === "edit" ? `/api/ai-engagements/${props.engagement.id}` : "/api/ai-engagements"
      const method = props.mode === "edit" ? "PATCH" : "POST"
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: "Save failed" }))
        throw new Error(error || "Save failed")
      }
      const data = (await res.json()) as Engagement
      if (props.mode === "edit") props.onUpdated(data)
      else props.onCreated(data)
      toast.success(props.mode === "edit" ? "Engagement updated" : "Engagement created")
    } catch (err) {
      console.error(err)
      toast.error(err instanceof Error ? err.message : "Save failed")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (props.mode !== "edit") return
    if (!confirm("Delete this engagement and all its invoices? This cannot be undone.")) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/ai-engagements/${props.engagement.id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Delete failed")
      props.onDeleted(props.engagement.id)
      toast.success("Engagement deleted")
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
              <Sparkles className="h-4 w-4 text-indigo-500" />
              {props.mode === "edit" ? "Edit engagement" : "New engagement"}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {props.mode === "edit" ? `${initial?.client_name} · ${initial?.project_name}` : "AI / software services side work"}
            </p>
          </div>
          <button onClick={props.onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Order no. (engagement #)</label>
            <input
              value={engagementNumber}
              onChange={(e) => setEngagementNumber(e.target.value)}
              placeholder={props.mode === "create" ? "Leave blank to auto-generate (e.g. PPAI002)" : "PPAI001"}
              className={inputCls}
            />
            <p className="text-xs text-slate-400 mt-1">Becomes the base of invoice numbers for this client (e.g. PPAI001 for upfront, PPAI001-2026-07 for July maintenance).</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Client name *</label>
              <input value={clientName} onChange={(e) => setClientName(e.target.value)} className={inputCls} placeholder="e.g. Kumi Space Pilates" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Project name *</label>
              <input value={projectName} onChange={(e) => setProjectName(e.target.value)} className={inputCls} placeholder="e.g. Booking System" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Client email</label>
              <input type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Client phone</label>
              <input value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} className={inputCls} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Client address (optional)</label>
            <input value={clientAddress} onChange={(e) => setClientAddress(e.target.value)} className={inputCls} />
          </div>

          <div className="border-t border-slate-100 pt-4">
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3">Upfront deliverables</p>
            <div className="space-y-2">
              {items.map((it, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    value={it.description}
                    onChange={(e) => updateItem(idx, e.target.value)}
                    placeholder={idx === 0 ? "e.g. Simplified landing page" : "Item description"}
                    className={inputCls}
                  />
                  <button
                    type="button"
                    onClick={() => removeItem(idx)}
                    disabled={items.length === 1}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addItem}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-dashed border-slate-300 text-xs font-medium text-slate-600 hover:border-indigo-300 hover:text-indigo-600 transition-colors"
              >
                <Plus className="h-3 w-3" />
                Add item
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Upfront amount (RM)</label>
                <input type="number" min={0} step="0.01" value={upfrontAmount} onChange={(e) => setUpfrontAmount(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Upfront paid date</label>
                <input type="date" value={upfrontPaidDate} onChange={(e) => setUpfrontPaidDate(e.target.value)} className={inputCls} />
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3 flex items-center gap-2">
              <Wrench className="h-3.5 w-3.5 text-slate-500" />
              Maintenance plan
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Estimated delivery date</label>
                <input type="date" value={maintenanceStartDate} onChange={(e) => setMaintenanceStartDate(e.target.value)} className={inputCls} />
                <p className="text-xs text-slate-400 mt-1">FOC trial + monthly billing schedule are computed from this date.</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Trial months (FOC)</label>
                <input type="number" min={0} value={trialMonthsFree} onChange={(e) => setTrialMonthsFree(e.target.value)} className={inputCls} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Year 1 monthly (RM)</label>
                <input type="number" min={0} step="0.01" value={yearOneMonthly} onChange={(e) => setYearOneMonthly(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Year 2+ monthly (RM)</label>
                <input type="number" min={0} step="0.01" value={yearTwoPlusMonthly} onChange={(e) => setYearTwoPlusMonthly(e.target.value)} className={inputCls} />
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3">Scope &amp; notes</p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Maintenance scope (shown on invoice)</label>
                <textarea
                  value={scopeNotes}
                  onChange={(e) => setScopeNotes(e.target.value)}
                  rows={2}
                  placeholder="e.g. Covers bug fixes, system errors, debugging. Excludes new feature development."
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-300 resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Internal notes (private)</label>
                <textarea
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-300 resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Status</label>
                <select value={status} onChange={(e) => setStatus(e.target.value as Engagement["status"])} className={inputCls}>
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 px-6 py-4 border-t border-slate-100 sticky bottom-0 bg-white">
          {props.mode === "edit" ? (
            <button onClick={handleDelete} disabled={saving || deleting} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-60">
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Delete
            </button>
          ) : <span />}
          <div className="flex items-center gap-2">
            <button onClick={props.onClose} disabled={saving || deleting} className="inline-flex items-center h-9 px-4 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-60">
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving || deleting} className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-indigo-500 text-white text-sm font-semibold hover:bg-indigo-600 transition-colors disabled:opacity-60">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {saving ? "Saving…" : props.mode === "edit" ? "Save changes" : "Create engagement"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Generate Invoice modal
// ────────────────────────────────────────────────────────────────────────────

function GenerateInvoiceModal({
  engagement,
  existingInvoices,
  onClose,
  onCreated,
  onUpdated,
  onDeleted,
}: {
  engagement: Engagement
  existingInvoices: Invoice[]
  onClose: () => void
  onCreated: (inv: Invoice) => void
  onUpdated: (inv: Invoice) => void
  onDeleted: (id: string) => void
}) {
  const today = new Date()
  const [invoiceType, setInvoiceType] = useState<"upfront" | "maintenance">("upfront")
  const [periodYear, setPeriodYear] = useState(today.getFullYear())
  const [periodMonth, setPeriodMonth] = useState(today.getMonth() + 1)
  const [amount, setAmount] = useState("")
  const [invoiceNumber, setInvoiceNumber] = useState("")
  const [invoiceDate, setInvoiceDate] = useState(today.toISOString().slice(0, 10))
  const [dueDays, setDueDays] = useState(14)
  const [notes, setNotes] = useState("")
  const [creating, setCreating] = useState(false)
  const [downloading, setDownloading] = useState<{ kind: "invoice" | "receipt"; id: string } | null>(null)

  // Suggested invoice number — derives from the engagement's order number
  // (e.g. PPAI001 → upfront "PPAI001", maintenance Jul 2026 → "PPAI001-2026-07").
  // Empty if no engagement_number on the engagement (falls back to server-side PPAI-YYYY-XXXX).
  const suggestedInvoiceNumber = useMemo(() => {
    if (!engagement.engagement_number) return ""
    if (invoiceType === "upfront") return engagement.engagement_number
    return `${engagement.engagement_number}-${periodYear}-${String(periodMonth).padStart(2, "0")}`
  }, [engagement.engagement_number, invoiceType, periodYear, periodMonth])

  const upfrontInvoiced = existingInvoices.some((i) => i.invoice_type === "upfront" && i.status !== "void")
  const sortedInvoices = useMemo(() => [...existingInvoices].sort((a, b) => b.invoice_date.localeCompare(a.invoice_date)), [existingInvoices])

  // Auto-populate amount when type/period changes
  const computedMaintenance = invoiceType === "maintenance" ? computeMonthlyRate(engagement, periodYear, periodMonth) : null
  const computedAmount = invoiceType === "upfront"
    ? engagement.upfront_amount
    : computedMaintenance?.amount ?? 0

  function applyComputed() {
    setAmount(String(computedAmount))
  }

  async function handleCreate() {
    setCreating(true)
    try {
      const amt = Number(amount) || computedAmount
      const dueDate = new Date(invoiceDate)
      dueDate.setDate(dueDate.getDate() + dueDays)
      const periodLabel = invoiceType === "maintenance"
        ? new Date(periodYear, periodMonth - 1, 1).toLocaleDateString("en-GB", { month: "long", year: "numeric" })
        : null
      const body = {
        engagement_id: engagement.id,
        invoice_type: invoiceType,
        period_year: invoiceType === "maintenance" ? periodYear : null,
        period_month: invoiceType === "maintenance" ? periodMonth : null,
        period_label: periodLabel,
        amount: amt,
        invoice_date: invoiceDate,
        due_date: dueDate.toISOString().slice(0, 10),
        notes: notes.trim() || null,
        status: "draft",
        invoice_number: (invoiceNumber.trim() || suggestedInvoiceNumber) || undefined,
      }
      const res = await fetch("/api/ai-invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: "Failed" }))
        throw new Error(error || "Failed")
      }
      const inv = (await res.json()) as Invoice
      onCreated(inv)
      toast.success(`Invoice ${inv.invoice_number} created`)
      setAmount("")
      setNotes("")
      setInvoiceNumber("")
    } catch (err) {
      console.error(err)
      toast.error(err instanceof Error ? err.message : "Failed")
    } finally {
      setCreating(false)
    }
  }

  async function handleStatusChange(inv: Invoice, next: Invoice["status"]) {
    try {
      const body: Record<string, unknown> = { status: next }
      if (next === "paid" && !inv.payment_date) {
        body.payment_date = new Date().toISOString().slice(0, 10)
      }
      const res = await fetch(`/api/ai-invoices/${inv.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error("Update failed")
      const updated = (await res.json()) as Invoice
      onUpdated(updated)
      toast.success(`Marked ${next}`)
    } catch (err) {
      console.error(err)
      toast.error(err instanceof Error ? err.message : "Update failed")
    }
  }

  async function handleDelete(inv: Invoice) {
    if (!confirm(`Delete invoice ${inv.invoice_number}? This cannot be undone.`)) return
    try {
      const res = await fetch(`/api/ai-invoices/${inv.id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Delete failed")
      onDeleted(inv.id)
      toast.success("Invoice deleted")
    } catch (err) {
      console.error(err)
      toast.error(err instanceof Error ? err.message : "Delete failed")
    }
  }

  async function handleDownloadPdf(inv: Invoice, kind: "invoice" | "receipt") {
    setDownloading({ kind, id: inv.id })
    try {
      // Items: use the engagement's upfront_items for upfront invoices,
      // a single "Maintenance — <period>" line for maintenance.
      const items = inv.invoice_type === "upfront"
        ? (engagement.upfront_items.length > 0
            ? engagement.upfront_items.map((it) => ({
                description: it.description,
                qty: 1,
                unit_price: 0,
                amount: 0,
              }))
            : [{ description: engagement.project_name, qty: 1, unit_price: inv.amount, amount: inv.amount }])
        : [{
            description: `Maintenance — ${inv.period_label ?? engagement.project_name}`,
            sub_description: engagement.scope_notes ?? "Bug fixes, system errors, debugging. Excludes new feature development.",
            qty: 1,
            unit_price: inv.amount,
            amount: inv.amount,
          }]
      // For upfront, all items are bundled — show one line with the total, plus the deliverable bullet list
      if (inv.invoice_type === "upfront" && items.length > 0) {
        // Replace with a single summary line + sub_description of the bundled scope
        const scope = engagement.upfront_items.map((it) => `• ${it.description}`).join("\n")
        items.length = 0
        items.push({
          description: `${engagement.project_name} — initial setup`,
          sub_description: scope || engagement.scope_notes || "Initial setup and delivery",
          qty: 1,
          unit_price: inv.amount,
          amount: inv.amount,
        } as never)
      }

      // Maintenance schedule text — only on upfront invoices, only when plan
      // is set. Surfaces the recurring fee plan to the customer so they know
      // what to expect after the upfront.
      const showSchedule = inv.invoice_type === "upfront" && !!engagement.maintenance_start_date
      const maintenanceScheduleText = showSchedule
        ? (() => {
            const delivery = formatDate(engagement.maintenance_start_date!)
            const trial = engagement.trial_months_free
            const y1 = engagement.year_one_monthly
            const y2 = engagement.year_two_plus_monthly
            const trialLine = trial > 0
              ? `First ${trial} month${trial > 1 ? "s" : ""} from delivery: FOC (free of charge).`
              : `No FOC trial period.`
            return [
              `Estimated delivery: ${delivery}. The recurring maintenance fee begins from delivery.`,
              trialLine,
              y1 > 0 ? `Year 1 (after FOC trial): RM ${y1.toLocaleString()}/month.` : null,
              y2 > 0 ? `Year 2 onwards: RM ${y2.toLocaleString()}/month.` : null,
              engagement.scope_notes ?? null,
            ].filter(Boolean).join("\n")
          })()
        : undefined

      const payload = {
        doc_type: kind,
        bill_number: inv.invoice_number,
        bill_date: formatShortDate(inv.payment_date ?? inv.invoice_date),
        reference: engagement.engagement_number
          ? `${engagement.engagement_number} · ${engagement.project_name}`
          : engagement.project_name,
        customer_name: engagement.client_name,
        customer_email: engagement.client_email ?? undefined,
        customer_phone: engagement.client_phone ?? undefined,
        customer_address: engagement.client_address ?? undefined,
        items,
        total: inv.amount,
        deposit: kind === "receipt" ? inv.amount : 0,
        balance: kind === "receipt" ? 0 : inv.amount,
        payment_date: inv.payment_date ? formatShortDate(inv.payment_date) : undefined,
        issued_by: "Michelle",
        is_ai_service: true,
        maintenance_schedule_text: maintenanceScheduleText,
      }
      const res = await fetch("/api/invoices/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: "PDF failed" }))
        throw new Error(error || "PDF failed")
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${inv.invoice_number}${kind === "receipt" ? "-receipt" : ""}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success(`${kind === "receipt" ? "Receipt" : "Invoice"} downloaded`)
    } catch (err) {
      console.error(err)
      toast.error(err instanceof Error ? err.message : "PDF failed")
    } finally {
      setDownloading(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-3xl mx-4 rounded-2xl bg-white shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <Receipt className="h-4 w-4 text-indigo-500" />
              Invoices — {engagement.client_name}
              {engagement.engagement_number && (
                <span className="inline-flex items-center rounded-md bg-indigo-50 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-indigo-700 border border-indigo-100">
                  {engagement.engagement_number}
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">{engagement.project_name}</p>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Create new invoice */}
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3">Create new invoice</p>
            <div className="space-y-3">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setInvoiceType("upfront"); setAmount(String(engagement.upfront_amount)) }}
                  disabled={upfrontInvoiced}
                  className={cn(
                    "flex-1 inline-flex items-center justify-center gap-1.5 h-9 rounded-lg border text-sm font-medium transition-colors",
                    invoiceType === "upfront"
                      ? "bg-indigo-500 text-white border-indigo-500"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50",
                    upfrontInvoiced && invoiceType !== "upfront" && "opacity-50"
                  )}
                  title={upfrontInvoiced ? "Upfront already invoiced (void it first to regenerate)" : undefined}
                >
                  Upfront {upfrontInvoiced && "(already invoiced)"}
                </button>
                <button
                  type="button"
                  onClick={() => setInvoiceType("maintenance")}
                  className={cn(
                    "flex-1 inline-flex items-center justify-center gap-1.5 h-9 rounded-lg border text-sm font-medium transition-colors",
                    invoiceType === "maintenance" ? "bg-indigo-500 text-white border-indigo-500" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  )}
                >
                  Maintenance (monthly)
                </button>
              </div>

              {invoiceType === "maintenance" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1.5">Period — month</label>
                    <select value={periodMonth} onChange={(e) => setPeriodMonth(Number(e.target.value))} className={inputCls}>
                      {Array.from({ length: 12 }).map((_, i) => (
                        <option key={i + 1} value={i + 1}>{new Date(2000, i, 1).toLocaleDateString("en-GB", { month: "long" })}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1.5">Period — year</label>
                    <input type="number" value={periodYear} onChange={(e) => setPeriodYear(Number(e.target.value))} className={inputCls} />
                  </div>
                </div>
              )}

              <div className="rounded-lg bg-indigo-50/50 border border-indigo-100 px-3 py-2 text-xs flex items-center justify-between gap-3">
                <span className="text-slate-700">
                  {invoiceType === "upfront"
                    ? <>Suggested: <strong>RM {engagement.upfront_amount.toLocaleString()}</strong> (engagement upfront)</>
                    : computedMaintenance?.reason === "trial"
                      ? <>Suggested: <strong>RM 0</strong> (trial period — FOC)</>
                      : computedMaintenance?.reason === "before_start"
                        ? <>Period is before maintenance start date</>
                        : <>Suggested: <strong>RM {computedMaintenance?.amount.toLocaleString()}</strong> ({computedMaintenance?.reason === "year_two_plus" ? "year 2+" : "year 1"} rate)</>
                  }
                </span>
                <button type="button" onClick={applyComputed} className="text-xs font-medium text-indigo-600 hover:text-indigo-700">
                  Use this
                </button>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">
                  Invoice number
                  {suggestedInvoiceNumber && (
                    <button
                      type="button"
                      onClick={() => setInvoiceNumber(suggestedInvoiceNumber)}
                      className="ml-2 text-[11px] font-medium text-indigo-600 hover:text-indigo-700"
                    >
                      Use suggested: {suggestedInvoiceNumber}
                    </button>
                  )}
                </label>
                <input
                  type="text"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  placeholder={suggestedInvoiceNumber || `PPAI-${today.getFullYear()}-XXXX`}
                  className={inputCls}
                />
                <p className="text-xs text-slate-400 mt-1">
                  {suggestedInvoiceNumber
                    ? `Defaults to the engagement order # (with period suffix for monthly invoices). Leave blank to use the suggestion.`
                    : `Leave blank to auto-generate PPAI-YYYY-XXXX. Tip: set an "Order no." on the engagement to use that as the invoice prefix instead.`
                  }
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Amount (RM)</label>
                  <input type="number" min={0} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={String(computedAmount)} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Invoice date</label>
                  <input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Due in (days)</label>
                  <input type="number" min={0} value={dueDays} onChange={(e) => setDueDays(Number(e.target.value))} className={inputCls} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Notes (optional)</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-300 resize-none" />
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleCreate}
                  disabled={creating}
                  className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-indigo-500 text-white text-sm font-semibold hover:bg-indigo-600 transition-colors disabled:opacity-60"
                >
                  {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  {creating ? "Creating…" : "Create invoice"}
                </button>
              </div>
            </div>
          </div>

          {/* Existing invoices */}
          <div>
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3">Existing invoices ({sortedInvoices.length})</p>
            {sortedInvoices.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">No invoices yet for this engagement</p>
            ) : (
              <div className="space-y-2">
                {sortedInvoices.map((inv) => (
                  <div key={inv.id} className="rounded-lg border border-slate-200 p-3">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-slate-700">{inv.invoice_number}</span>
                          <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize", INVOICE_STATUS_COLORS[inv.status])}>
                            {inv.status}
                          </span>
                          <span className="text-[10px] text-slate-400 capitalize">{inv.invoice_type}{inv.period_label ? ` · ${inv.period_label}` : ""}</span>
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          Invoiced {formatDate(inv.invoice_date)}
                          {inv.payment_date && <> · Paid {formatDate(inv.payment_date)}</>}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-base font-bold text-slate-900">RM {inv.amount.toLocaleString()}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        onClick={() => handleDownloadPdf(inv, "invoice")}
                        disabled={downloading?.id === inv.id}
                        className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md bg-white border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                      >
                        {downloading?.kind === "invoice" && downloading?.id === inv.id
                          ? <Loader2 className="h-3 w-3 animate-spin" />
                          : <FileDown className="h-3 w-3" />}
                        Invoice
                      </button>
                      <button
                        onClick={() => handleDownloadPdf(inv, "receipt")}
                        disabled={downloading?.id === inv.id}
                        className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md bg-white border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                      >
                        {downloading?.kind === "receipt" && downloading?.id === inv.id
                          ? <Loader2 className="h-3 w-3 animate-spin" />
                          : <FileDown className="h-3 w-3" />}
                        Receipt
                      </button>
                      {inv.status === "draft" && (
                        <button onClick={() => handleStatusChange(inv, "sent")} className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100 text-xs font-medium hover:bg-indigo-100">
                          Mark sent
                        </button>
                      )}
                      {inv.status !== "paid" && inv.status !== "void" && (
                        <button onClick={() => handleStatusChange(inv, "paid")} className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-100 text-xs font-medium hover:bg-emerald-100">
                          Mark paid
                        </button>
                      )}
                      {inv.status !== "void" && (
                        <button onClick={() => handleStatusChange(inv, "void")} className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md bg-white text-slate-600 border border-slate-200 text-xs font-medium hover:bg-slate-50">
                          Void
                        </button>
                      )}
                      <button onClick={() => handleDelete(inv)} className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md bg-red-50 text-red-700 border border-red-100 text-xs font-medium hover:bg-red-100 transition-colors ml-auto">
                        <Trash2 className="h-3 w-3" />
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
