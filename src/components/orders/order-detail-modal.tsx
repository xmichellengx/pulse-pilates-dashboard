"use client"

import { useEffect, useState } from "react"
import {
  X,
  MapPin,
  Phone,
  Mail,
  Calendar,
  Tag,
  DollarSign,
  FileText,
  Loader2,
  Download,
  Pencil,
  Check,
  ChevronDown,
  Plus,
  Trash2,
  AlertTriangle,
  ShieldAlert,
  Receipt,
  Building2,
  Truck,
} from "lucide-react"
import type { Order } from "./orders-table"
import { formatCurrency } from "@/lib/utils"
import { toast } from "sonner"
import { createClient as createSupabaseClient } from "@/lib/supabase/client"

interface OrderDetailModalProps {
  order: Order
  onClose: () => void
  onUpdate?: (updatedOrder: Order) => void
  onDelete?: (orderId: string) => void
}

const STATUS_COLORS: Record<string, string> = {
  Delivered: "bg-green-50 text-green-700 border-green-100",
  "Pending Delivery": "bg-amber-50 text-amber-700 border-amber-100",
  "Pending Shipment Arrival": "bg-orange-50 text-orange-700 border-orange-100",
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

const QUICK_STATUSES = ["Pending Shipment Arrival", "Pending Delivery", "Delivered"] as const

const MODE_OPTIONS = [
  "Direct Purchase",
  "Direct Purchase- Cash Payment",
  "Direct Purchase- Cash On Delivery",
  "Direct Purchase- Installment",
  "Rental",
  "Converted - Purchase",
  "P4B",
  "KOL",
  "Returned",
]

const LEAD_SOURCE_OPTIONS = [
  "Google",
  "Facebook",
  "Instagram",
  "TikTok",
  "XHS",
  "Referral",
  "Returning Customer",
  "Shopee",
  "Shopify",
  "Repeat Customer",
  "Walk-in",
]

const MARKET_OPTIONS = ["MY", "SG", "ID", "JB"]
const PAYMENT_TYPE_OPTIONS = ["Full Payment", "Booking fee", "1st Month Rental", "Installment", "Deposit", "Conversion"]
const PAYEX_STATUS_OPTIONS = ["Done", "Pending", "Failed", ""]

const EMAIL_TO_NAME: Record<string, string> = {
  "michelleleng.ng@gmail.com": "Michelle",
  "aisypulsepilates@gmail.com": "Aisy",
}

function formatDisplayDate(dateStr: string | null) {
  if (!dateStr) return "—"
  try {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })
  } catch {
    return dateStr
  }
}

function Field({
  label,
  value,
  editing,
  children,
}: {
  label: string
  value: React.ReactNode
  editing: boolean
  children?: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs font-medium text-slate-400 uppercase tracking-wide">{label}</dt>
      <dd className="text-sm text-slate-800">{editing && children ? children : (value ?? "—")}</dd>
    </div>
  )
}

// Parse "Product A ×3 + Product B" into [{name, qty}]
function parseLineItems(productName: string | null): { name: string; qty: number }[] {
  if (!productName?.trim()) return [{ name: "", qty: 1 }]
  return productName.split("+").map((part) => {
    const match = part.trim().match(/^(.+?)\s+[×x](\d+)$/)
    if (match) return { name: match[1].trim(), qty: parseInt(match[2], 10) }
    return { name: part.trim(), qty: 1 }
  })
}

// Serialize [{name, qty}] back to "Product A ×3 + Product B"
function serializeLineItems(items: { name: string; qty: number }[]): string {
  return items
    .filter((i) => i.name.trim())
    .map((i) => (i.qty > 1 ? `${i.name} ×${i.qty}` : i.name))
    .join(" + ")
}

export function OrderDetailModal({ order, onClose, onUpdate, onDelete }: OrderDetailModalProps) {
  const supabase = createSupabaseClient()
  const [currentOrder, setCurrentOrder] = useState<Order>(order)
  const [editingOrder, setEditingOrder] = useState<Order>(order)
  const [lineItems, setLineItems] = useState<{ name: string; qty: number }[]>([{ name: "", qty: 1 }])
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null)
  const [generatingInvoice, setGeneratingInvoice] = useState(false)
  const [generatingReceipt, setGeneratingReceipt] = useState(false)
  const [currentUserName, setCurrentUserName] = useState("Aisy")

  // Delete state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deletePassword, setDeletePassword] = useState("")
  const [deleteError, setDeleteError] = useState("")
  const [isDeleting, setIsDeleting] = useState(false)

  // Rental invoice form state
  const [showRentalForm, setShowRentalForm] = useState(false)
  const [rentalFields, setRentalFields] = useState({ rental_start_date: "", monthly_billing_date: "", auto_debit_effective_date: "" })
  const [generatingRental, setGeneratingRental] = useState(false)

  const isRentalOrder = (currentOrder.mode ?? "").toLowerCase().includes("rental")

  // Get current user on mount
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const email = data.user?.email ?? ""
      setCurrentUserName(EMAIL_TO_NAME[email] ?? email.split("@")[0] ?? "Aisy")
    })
  }, [supabase])

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (isEditing) {
          setIsEditing(false)
          setEditingOrder(currentOrder)
        } else {
          onClose()
        }
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [onClose, isEditing, currentOrder])

  const statusCls = STATUS_COLORS[currentOrder.status ?? ""] ?? "bg-slate-50 text-slate-600 border-slate-100"
  const modeCls = MODE_COLORS[currentOrder.mode ?? ""] ?? "bg-slate-50 text-slate-600 border-slate-100"

  function startEdit() {
    setEditingOrder({ ...currentOrder })
    setLineItems(parseLineItems(currentOrder.product_name))
    setIsEditing(true)
  }

  function cancelEdit() {
    setEditingOrder(currentOrder)
    setIsEditing(false)
  }

  async function saveEdit() {
    setIsSaving(true)
    const combinedProduct = serializeLineItems(lineItems)
    const totalUnits = lineItems.filter((i) => i.name.trim()).reduce((s, i) => s + i.qty, 0)
    try {
      const res = await fetch(`/api/orders/${currentOrder.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          case_code: editingOrder.case_code,
          customer_name: editingOrder.customer_name,
          email: editingOrder.email,
          phone: editingOrder.phone,
          product_name: combinedProduct || editingOrder.product_name,
          units: totalUnits || editingOrder.units,
          mode: editingOrder.mode,
          payment_type: editingOrder.payment_type,
          amount: editingOrder.amount,
          monthly_rental: editingOrder.monthly_rental,
          balance: editingOrder.balance,
          payment_date: editingOrder.payment_date,
          delivery_date: editingOrder.delivery_date,
          location: editingOrder.location,
          address: editingOrder.address,
          status: editingOrder.status,
          lead_source: editingOrder.lead_source,
          market: editingOrder.market,
          invoice_sent: editingOrder.invoice_sent,
          payex_status: editingOrder.payex_status,
          remarks: editingOrder.remarks,
          warranty_start_date: editingOrder.warranty_start_date,
          warranty_end_date: editingOrder.warranty_end_date,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Save failed")
      const saved = { ...editingOrder, product_name: combinedProduct || editingOrder.product_name, units: totalUnits || editingOrder.units }
      setCurrentOrder(saved)
      onUpdate?.(saved)
      setIsEditing(false)
      toast.success("Order updated")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save")
    } finally {
      setIsSaving(false)
    }
  }

  async function handleStatusUpdate(newStatus: string) {
    if (newStatus === currentOrder.status) return
    setUpdatingStatus(newStatus)
    try {
      const res = await fetch(`/api/orders/${currentOrder.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Update failed")
      const updated = { ...currentOrder, status: newStatus }
      setCurrentOrder(updated)
      setEditingOrder(updated)
      onUpdate?.(updated)
      toast.success(`Status updated to "${newStatus}"`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update status")
    } finally {
      setUpdatingStatus(null)
    }
  }

  async function generateInvoicePDF(docType: "invoice" | "receipt" | "rental", extra?: Record<string, unknown>) {
    const setLoading =
      docType === "receipt" ? setGeneratingReceipt :
      docType === "rental" ? setGeneratingRental :
      setGeneratingInvoice
    setLoading(true)
    try {
      const metaRes = await fetch(`/api/invoices/from-order?order_id=${currentOrder.id}`)
      if (!metaRes.ok) throw new Error((await metaRes.json()).error ?? "Failed to load order data")
      const payload = await metaRes.json()
      payload.doc_type = docType
      payload.issued_by = currentUserName
      if (extra) Object.assign(payload, extra)

      const pdfRes = await fetch("/api/invoices/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!pdfRes.ok) throw new Error("PDF generation failed")

      const blob = await pdfRes.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = docType === "receipt"
        ? `${payload.bill_number}-receipt.pdf`
        : docType === "rental"
          ? `${payload.bill_number}-rental.pdf`
          : `${payload.bill_number}.pdf`
      a.click()
      URL.revokeObjectURL(url)

      await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: currentOrder.id,
          type: docType,
          invoice_number: payload.bill_number,
          customer_name: currentOrder.customer_name,
          customer_email: currentOrder.email,
          amount: currentOrder.amount,
          generated_by: currentUserName,
        }),
      })

      const label = docType === "receipt" ? "Receipt" : docType === "rental" ? "Rental Invoice" : "Invoice"
      toast.success(`${label} downloaded`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  function handleGeneratePDF(docType: "invoice" | "receipt") {
    generateInvoicePDF(docType)
  }

  async function handleGenerateRentalInvoice() {
    setShowRentalForm(false)
    await generateInvoicePDF("rental", {
      rental_start_date: rentalFields.rental_start_date || undefined,
      monthly_billing_date: rentalFields.monthly_billing_date || undefined,
      auto_debit_effective_date: rentalFields.auto_debit_effective_date || undefined,
    })
  }

  async function handleDelete() {
    setDeleteError("")
    setIsDeleting(true)
    try {
      const res = await fetch("/api/orders/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: currentOrder.id, password: deletePassword }),
      })
      const data = await res.json()
      if (!res.ok) {
        setDeleteError(data.error ?? "Deletion failed")
        return
      }
      toast.success("Order deleted")
      setShowDeleteDialog(false)
      onDelete?.(currentOrder.id)
      onClose()
    } catch {
      setDeleteError("Network error. Please try again.")
    } finally {
      setIsDeleting(false)
    }
  }

  function inp(field: keyof Order, type = "text") {
    return (
      <input
        type={type}
        value={(editingOrder[field] as string | number | undefined) ?? ""}
        onChange={(e) => setEditingOrder((p) => ({ ...p, [field]: e.target.value || null }))}
        className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-sm text-slate-800 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-200"
      />
    )
  }

  function sel(field: keyof Order, options: string[]) {
    return (
      <div className="relative">
        <select
          value={(editingOrder[field] as string | undefined) ?? ""}
          onChange={(e) => setEditingOrder((p) => ({ ...p, [field]: e.target.value || null }))}
          className="w-full appearance-none rounded-md border border-slate-200 bg-white px-2 py-1 pr-6 text-sm text-slate-800 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-200"
        >
          <option value="">—</option>
          {options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
      </div>
    )
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      aria-modal="true"
      role="dialog"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
        onClick={isEditing ? undefined : onClose}
      />

      {/* Panel */}
      <div className="relative z-10 w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl border border-slate-100">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-start justify-between px-6 py-5 bg-white border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-sm font-semibold text-indigo-600 bg-indigo-50 rounded px-2 py-0.5 border border-indigo-100">
                {currentOrder.case_code ?? "No Order #"}
              </span>
              {currentOrder.status && (
                <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${statusCls}`}>
                  {currentOrder.status}
                </span>
              )}
              {currentOrder.mode && (
                <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${modeCls}`}>
                  {currentOrder.mode}
                </span>
              )}
            </div>
            <h2 className="text-lg font-semibold text-slate-900">{currentOrder.customer_name}</h2>
            {currentOrder.studio_name && (
              <p className="text-sm text-slate-600 mt-0.5 flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-slate-400" />
                {currentOrder.studio_name}
              </p>
            )}
            <p className="text-sm text-slate-500 mt-0.5">{currentOrder.product_name ?? "No product"}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 ml-4">
            {isEditing ? (
              <>
                <button
                  onClick={cancelEdit}
                  className="flex h-8 items-center gap-1.5 px-3 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={saveEdit}
                  disabled={isSaving}
                  className="flex h-8 items-center gap-1.5 px-3 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors text-xs font-medium disabled:opacity-60"
                >
                  {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                  Save
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => { setDeletePassword(""); setDeleteError(""); setShowDeleteDialog(true) }}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                  title="Delete order"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <button
                  onClick={startEdit}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                  title="Edit order"
                >
                  <Pencil className="h-4 w-4" />
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-6">

          {/* ── Actions ── */}
          {!isEditing && (
            <section className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-4">
              {/* Quick status update */}
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Quick Status Update</p>
                <div className="flex flex-wrap gap-2">
                  {QUICK_STATUSES.map((s) => {
                    const isActive = currentOrder.status === s
                    const isLoading = updatingStatus === s
                    const activeColor =
                      s === "Delivered" ? "bg-green-500 text-white border-green-500" :
                      s === "Pending Delivery" ? "bg-amber-500 text-white border-amber-500" :
                      s === "Pending Shipment Arrival" ? "bg-orange-500 text-white border-orange-500" :
                      "bg-slate-700 text-white border-slate-700"
                    return (
                      <button
                        key={s}
                        onClick={() => handleStatusUpdate(s)}
                        disabled={!!updatingStatus}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all disabled:opacity-60 ${
                          isActive
                            ? activeColor
                            : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        {isLoading && <Loader2 className="h-3 w-3 animate-spin" />}
                        {s}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Invoice / Receipt buttons */}
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                  Generate Documents <span className="text-slate-400 font-normal normal-case">· Issued by {currentUserName}</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleGeneratePDF("invoice")}
                    disabled={generatingInvoice || generatingReceipt || generatingRental}
                    className="flex-1 inline-flex items-center justify-center gap-2 h-9 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 text-sm font-medium hover:bg-indigo-100 transition-all disabled:opacity-60"
                  >
                    {generatingInvoice ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                    Invoice
                  </button>
                  <button
                    onClick={() => handleGeneratePDF("receipt")}
                    disabled={generatingInvoice || generatingReceipt || generatingRental}
                    className="flex-1 inline-flex items-center justify-center gap-2 h-9 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 text-sm font-medium hover:bg-emerald-100 transition-all disabled:opacity-60"
                  >
                    {generatingReceipt ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                    Receipt
                  </button>
                  {isRentalOrder && (
                    <button
                      onClick={() => setShowRentalForm(true)}
                      disabled={generatingInvoice || generatingReceipt || generatingRental}
                      className="flex-1 inline-flex items-center justify-center gap-2 h-9 rounded-lg border border-purple-200 bg-purple-50 text-purple-700 text-sm font-medium hover:bg-purple-100 transition-all disabled:opacity-60"
                    >
                      {generatingRental ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                      Rental Invoice
                    </button>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* ── Order Number & Identity ── */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <FileText className="h-4 w-4 text-indigo-500" />
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Order Details</h3>
            </div>
            <dl className="grid grid-cols-2 gap-4">
              <Field label="Order Number" value={currentOrder.case_code ?? "—"} editing={isEditing}>
                {inp("case_code")}
              </Field>
              <Field label="Status" value={currentOrder.status ?? "—"} editing={isEditing}>
                {sel("status", ["Pending Shipment Arrival", "Pending Delivery", "Delivered", "Cancelled", "Returned"])}
              </Field>
              <Field label="Customer Name" value={currentOrder.customer_name} editing={isEditing}>
                {inp("customer_name")}
              </Field>
              {isEditing ? (
                <div className="col-span-2 flex flex-col gap-0.5">
                  <dt className="text-xs font-medium text-slate-400 uppercase tracking-wide">Products</dt>
                  <dd className="flex flex-col gap-2">
                    {lineItems.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Product name"
                          value={item.name}
                          onChange={(e) => setLineItems((prev) => prev.map((x, i) => i === idx ? { ...x, name: e.target.value } : x))}
                          className="flex-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-sm text-slate-800 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-200"
                        />
                        <input
                          type="number"
                          min={1}
                          value={item.qty}
                          onChange={(e) => setLineItems((prev) => prev.map((x, i) => i === idx ? { ...x, qty: Math.max(1, parseInt(e.target.value) || 1) } : x))}
                          className="w-16 rounded-md border border-slate-200 bg-white px-2 py-1 text-sm text-slate-800 text-center focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-200"
                        />
                        <button
                          type="button"
                          onClick={() => setLineItems((prev) => prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev)}
                          className="flex h-7 w-7 items-center justify-center rounded text-slate-300 hover:text-red-400 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => setLineItems((prev) => [...prev, { name: "", qty: 1 }])}
                      className="flex items-center gap-1.5 self-start px-2 py-1 rounded-md border border-dashed border-slate-300 text-xs text-slate-500 hover:text-indigo-600 hover:border-indigo-300 transition-colors"
                    >
                      <Plus className="h-3 w-3" /> Add product
                    </button>
                  </dd>
                </div>
              ) : (
                <Field label="Product" value={currentOrder.product_name ?? "—"} editing={false}>
                  {null}
                </Field>
              )}
              <Field label="Mode" value={currentOrder.mode ?? "—"} editing={isEditing}>
                {sel("mode", MODE_OPTIONS)}
              </Field>
              {!isEditing && (
                <Field label="Units" value={currentOrder.units ?? 1} editing={false}>
                  {null}
                </Field>
              )}
              {currentOrder.pricing_tier && !isEditing && (
                <Field label="Pricing Tier" value={currentOrder.pricing_tier} editing={false}>
                  {null}
                </Field>
              )}
            </dl>
          </section>

          {/* Pricing Breakdown — read-only, only when meaningful breakdown data exists */}
          {(() => {
            const items = Array.isArray(currentOrder.items) ? currentOrder.items : []
            const discounts = Array.isArray(currentOrder.discounts) ? currentOrder.discounts : []
            const additionalCharges = Array.isArray(currentOrder.additional_charges) ? currentOrder.additional_charges : []
            const hasBreakdown =
              currentOrder.subtotal != null ||
              (currentOrder.delivery_fee ?? 0) > 0 ||
              (currentOrder.installation_fee ?? 0) > 0 ||
              discounts.length > 0 ||
              additionalCharges.length > 0 ||
              items.length > 0
            if (!hasBreakdown || isEditing) return null
            return (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Receipt className="h-4 w-4 text-indigo-500" />
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Pricing Breakdown</h3>
                </div>

                {/* Line items */}
                {items.length > 0 && (
                  <div className="space-y-2 mb-3">
                    {items.map((item, idx) => {
                      const lineTotal = (item.unit_price ?? 0) * (item.qty ?? 1)
                      return (
                        <div key={idx} className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-slate-800">
                              {item.product_name} <span className="text-slate-400 font-normal">× {item.qty ?? 1}</span>
                            </div>
                            <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                              {item.purchase_mode && (
                                <span className="text-xs text-slate-500 capitalize">
                                  {item.purchase_mode === "cc_installment" ? "CC Installment" : item.purchase_mode === "direct" ? "Direct Purchase" : item.purchase_mode}
                                </span>
                              )}
                              {item.custom_colour && item.colour_name && (
                                <span className="text-xs text-indigo-600">Colour: {item.colour_name}</span>
                              )}
                              {item.logo_engraving && (
                                <span className="text-xs text-indigo-600">
                                  Logo engraving{item.engraving_notes ? `: ${item.engraving_notes}` : ""}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="text-sm font-semibold text-slate-800">{formatCurrency(lineTotal)}</div>
                            {(item.customisation_surcharge ?? 0) > 0 && (
                              <div className="text-xs text-slate-400 mt-0.5">
                                +{formatCurrency(item.customisation_surcharge ?? 0)} custom
                              </div>
                            )}
                            <div className="text-xs text-slate-400 mt-0.5">
                              {formatCurrency(item.unit_price ?? 0)} each
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Totals */}
                <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
                  <div className="divide-y divide-slate-100">
                    {currentOrder.subtotal != null && (
                      <div className="flex justify-between px-4 py-2.5 text-sm">
                        <span className="text-slate-500">Equipment subtotal</span>
                        <span className="font-medium text-slate-700">{formatCurrency(currentOrder.subtotal)}</span>
                      </div>
                    )}
                    {discounts.filter(d => (d?.amount ?? 0) > 0).map((d, i) => (
                      <div key={`disc-${i}`} className="flex justify-between px-4 py-2.5 text-sm">
                        <span className="text-red-500">(-) {d.label || "Discount"}</span>
                        <span className="font-medium text-red-500">-{formatCurrency(d.amount)}</span>
                      </div>
                    ))}
                    {additionalCharges.filter(c => (c?.amount ?? 0) > 0).map((c, i) => (
                      <div key={`add-${i}`} className="flex justify-between px-4 py-2.5 text-sm">
                        <span className="text-emerald-600">(+) {c.label || "Additional charge"}</span>
                        <span className="font-medium text-emerald-600">+{formatCurrency(c.amount)}</span>
                      </div>
                    ))}
                    {(currentOrder.delivery_fee ?? 0) > 0 && (
                      <div className="flex justify-between px-4 py-2.5 text-sm">
                        <span className="text-slate-500">Delivery</span>
                        <span className="font-medium text-slate-700">{formatCurrency(currentOrder.delivery_fee ?? 0)}</span>
                      </div>
                    )}
                    {(currentOrder.installation_fee ?? 0) > 0 && (
                      <div className="flex justify-between px-4 py-2.5 text-sm">
                        <span className="text-slate-500">Installation</span>
                        <span className="font-medium text-slate-700">{formatCurrency(currentOrder.installation_fee ?? 0)}</span>
                      </div>
                    )}
                    <div className="flex justify-between px-4 py-3 bg-slate-50 font-semibold border-t border-slate-200">
                      <span className="text-slate-800">Total</span>
                      <span className="text-slate-900">{currentOrder.amount != null ? formatCurrency(currentOrder.amount) : "—"}</span>
                    </div>
                  </div>
                </div>

                {/* Delivery & Notes (from quotation) */}
                {(currentOrder.delivery_location || currentOrder.estimated_delivery) && (
                  <div className="mt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Truck className="h-3.5 w-3.5 text-slate-400" />
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Delivery & Notes</p>
                    </div>
                    <div className="space-y-1.5 text-sm rounded-lg border border-slate-200 bg-white px-4 py-3">
                      {currentOrder.delivery_location && (
                        <div className="flex justify-between gap-3">
                          <span className="text-slate-500">Location</span>
                          <span className="font-medium text-slate-800 text-right">{currentOrder.delivery_location}</span>
                        </div>
                      )}
                      {currentOrder.estimated_delivery && (
                        <div className="flex justify-between gap-3">
                          <span className="text-slate-500">Est. Delivery</span>
                          <span className="font-medium text-slate-800 text-right">{currentOrder.estimated_delivery}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </section>
            )
          })()}

          {/* Financials */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <DollarSign className="h-4 w-4 text-green-500" />
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Financials</h3>
            </div>
            <dl className="grid grid-cols-2 gap-4">
              <Field
                label="Amount"
                value={currentOrder.amount != null ? (
                  <span className="text-lg font-bold text-slate-900">{formatCurrency(currentOrder.amount)}</span>
                ) : "—"}
                editing={isEditing}
              >
                {inp("amount", "number")}
              </Field>
              <Field
                label="Balance"
                value={currentOrder.balance != null && currentOrder.balance > 0 ? (
                  <span className="text-base font-semibold text-red-600">{formatCurrency(currentOrder.balance)}</span>
                ) : (
                  <span className="text-green-600 font-medium">Cleared</span>
                )}
                editing={isEditing}
              >
                {inp("balance", "number")}
              </Field>
              {(currentOrder.monthly_rental != null || isEditing) && (
                <Field
                  label="Monthly Rental"
                  value={currentOrder.monthly_rental != null ? formatCurrency(currentOrder.monthly_rental) + "/mo" : "—"}
                  editing={isEditing}
                >
                  {inp("monthly_rental", "number")}
                </Field>
              )}
              <Field label="Payment Type" value={currentOrder.payment_type ?? "—"} editing={isEditing}>
                {sel("payment_type", PAYMENT_TYPE_OPTIONS)}
              </Field>
              <Field label="Payex Status" value={currentOrder.payex_status ?? "—"} editing={isEditing}>
                {sel("payex_status", PAYEX_STATUS_OPTIONS)}
              </Field>
            </dl>
          </section>

          {/* Dates */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="h-4 w-4 text-blue-500" />
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Dates</h3>
            </div>
            <dl className="grid grid-cols-2 gap-4">
              <Field label="Payment Date" value={formatDisplayDate(currentOrder.payment_date)} editing={isEditing}>
                {inp("payment_date", "date")}
              </Field>
              <Field label="Delivery Date" value={formatDisplayDate(currentOrder.delivery_date)} editing={isEditing}>
                {inp("delivery_date", "date")}
              </Field>
            </dl>
          </section>

          {/* Contact */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Phone className="h-4 w-4 text-purple-500" />
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Contact</h3>
            </div>
            {isEditing ? (
              <dl className="grid grid-cols-1 gap-3">
                <Field label="Phone" value={currentOrder.phone ?? "—"} editing={isEditing}>
                  {inp("phone", "tel")}
                </Field>
                <Field label="Email" value={currentOrder.email ?? "—"} editing={isEditing}>
                  {inp("email", "email")}
                </Field>
                <Field label="Location" value={currentOrder.location ?? "—"} editing={isEditing}>
                  {inp("location")}
                </Field>
                <Field label="Address" value={currentOrder.address ?? "—"} editing={isEditing}>
                  <textarea
                    value={editingOrder.address ?? ""}
                    onChange={(e) => setEditingOrder((p) => ({ ...p, address: e.target.value || null }))}
                    rows={2}
                    className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-sm text-slate-800 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-200 resize-none"
                  />
                </Field>
              </dl>
            ) : (
              <dl className="grid grid-cols-1 gap-3">
                {currentOrder.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-slate-400" />
                    <span className="text-sm text-slate-700">{currentOrder.phone}</span>
                  </div>
                )}
                {currentOrder.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-slate-400" />
                    <span className="text-sm text-slate-700">{currentOrder.email}</span>
                  </div>
                )}
                {currentOrder.location && (
                  <div className="flex items-start gap-2">
                    <MapPin className="h-3.5 w-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-sm text-slate-700">{currentOrder.location}</div>
                      {currentOrder.address && (
                        <div className="text-xs text-slate-400 mt-0.5">{currentOrder.address}</div>
                      )}
                    </div>
                  </div>
                )}
              </dl>
            )}
          </section>

          {/* Marketing */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Tag className="h-4 w-4 text-orange-500" />
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Marketing & Meta</h3>
            </div>
            <dl className="grid grid-cols-2 gap-4">
              <Field label="Lead Source" value={currentOrder.lead_source ?? "—"} editing={isEditing}>
                {sel("lead_source", LEAD_SOURCE_OPTIONS)}
              </Field>
              <Field label="Market" value={currentOrder.market ?? "—"} editing={isEditing}>
                {sel("market", MARKET_OPTIONS)}
              </Field>
              <Field
                label="Invoice Sent"
                value={currentOrder.invoice_sent ? "Yes" : "No"}
                editing={isEditing}
              >
                <select
                  value={editingOrder.invoice_sent ? "true" : "false"}
                  onChange={(e) => setEditingOrder((p) => ({ ...p, invoice_sent: e.target.value === "true" }))}
                  className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-sm text-slate-800 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-200"
                >
                  <option value="false">No</option>
                  <option value="true">Yes</option>
                </select>
              </Field>
            </dl>
          </section>

          {/* Warranty */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="h-4 w-4 text-slate-400" />
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Warranty Period</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-slate-400 mb-1">Start Date</p>
                {isEditing ? (
                  <input
                    type="date"
                    value={editingOrder.warranty_start_date ?? ""}
                    onChange={(e) => setEditingOrder((p) => ({ ...p, warranty_start_date: e.target.value || null }))}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-800 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-200"
                  />
                ) : (
                  <p className="text-sm text-slate-700">{currentOrder.warranty_start_date ? formatDisplayDate(currentOrder.warranty_start_date) : <span className="text-slate-400 italic">Not set</span>}</p>
                )}
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1">End Date</p>
                {isEditing ? (
                  <input
                    type="date"
                    value={editingOrder.warranty_end_date ?? ""}
                    onChange={(e) => setEditingOrder((p) => ({ ...p, warranty_end_date: e.target.value || null }))}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-800 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-200"
                  />
                ) : (
                  <p className="text-sm text-slate-700">{currentOrder.warranty_end_date ? formatDisplayDate(currentOrder.warranty_end_date) : <span className="text-slate-400 italic">Not set</span>}</p>
                )}
              </div>
            </div>
            {currentOrder.warranty_start_date && currentOrder.warranty_end_date && (
              <p className={`text-xs mt-2 font-medium ${new Date(currentOrder.warranty_end_date) >= new Date() ? "text-green-600" : "text-red-500"}`}>
                {new Date(currentOrder.warranty_end_date) >= new Date() ? "✓ Under warranty" : "✗ Warranty expired"}
              </p>
            )}
          </section>

          {/* Remarks */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <FileText className="h-4 w-4 text-slate-400" />
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Remarks</h3>
            </div>
            {isEditing ? (
              <textarea
                value={editingOrder.remarks ?? ""}
                onChange={(e) => setEditingOrder((p) => ({ ...p, remarks: e.target.value || null }))}
                rows={3}
                placeholder="Add remarks..."
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-200 resize-none"
              />
            ) : currentOrder.remarks ? (
              <p className="text-sm text-slate-700 bg-slate-50 rounded-lg p-3 border border-slate-100 leading-relaxed">
                {currentOrder.remarks}
              </p>
            ) : (
              <p className="text-sm text-slate-400 italic">No remarks</p>
            )}
          </section>

        </div>
      </div>

      {/* ── Delete confirmation dialog ── */}
      {showDeleteDialog && (
        <div className="absolute inset-0 z-20 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowDeleteDialog(false)} />
          <div className="relative z-10 w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-red-100 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                <ShieldAlert className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Delete Order</h3>
                <p className="text-xs text-slate-500">{currentOrder.customer_name} · {currentOrder.case_code ?? "No order #"}</p>
              </div>
            </div>

            <div className="bg-red-50 border border-red-100 rounded-lg p-3 mb-4">
              <div className="flex gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-700 leading-relaxed">
                  This will permanently delete the order and cannot be undone. Admin password required.
                </p>
              </div>
            </div>

            <label className="block text-xs font-medium text-slate-600 mb-1">Admin Password</label>
            <input
              type="password"
              value={deletePassword}
              onChange={(e) => { setDeletePassword(e.target.value); setDeleteError("") }}
              onKeyDown={(e) => e.key === "Enter" && handleDelete()}
              placeholder="Enter admin password"
              autoFocus
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-red-400 focus:outline-none focus:ring-1 focus:ring-red-200 mb-2"
            />
            {deleteError && (
              <p className="text-xs text-red-600 mb-2 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> {deleteError}
              </p>
            )}

            <div className="flex gap-2 mt-3">
              <button
                onClick={() => setShowDeleteDialog(false)}
                className="flex-1 h-9 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting || !deletePassword}
                className="flex-1 h-9 rounded-lg bg-red-600 text-sm text-white font-medium hover:bg-red-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Delete Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Rental invoice form ── */}
      {showRentalForm && (
        <div className="absolute inset-0 z-20 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowRentalForm(false)} />
          <div className="relative z-10 w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-purple-100 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100">
                <FileText className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Rental Invoice Details</h3>
                <p className="text-xs text-slate-500">{currentOrder.customer_name}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Rental Start Date</label>
                <input
                  type="date"
                  value={rentalFields.rental_start_date}
                  onChange={(e) => setRentalFields(p => ({ ...p, rental_start_date: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-200"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Monthly Billing Date</label>
                <input
                  type="text"
                  value={rentalFields.monthly_billing_date}
                  onChange={(e) => setRentalFields(p => ({ ...p, monthly_billing_date: e.target.value }))}
                  placeholder="e.g. 20th"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-200"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Auto Debit Effective Date</label>
                <input
                  type="date"
                  value={rentalFields.auto_debit_effective_date}
                  onChange={(e) => setRentalFields(p => ({ ...p, auto_debit_effective_date: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-200"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setShowRentalForm(false)}
                className="flex-1 h-9 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateRentalInvoice}
                className="flex-1 h-9 rounded-lg bg-purple-600 text-sm text-white font-medium hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
              >
                <Download className="h-4 w-4" />
                Generate PDF
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
