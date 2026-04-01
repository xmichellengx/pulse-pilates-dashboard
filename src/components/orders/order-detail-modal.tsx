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
} from "lucide-react"
import type { Order } from "./orders-table"
import { formatCurrency } from "@/lib/utils"
import { toast } from "sonner"

interface OrderDetailModalProps {
  order: Order
  onClose: () => void
  onUpdate?: (updatedOrder: Order) => void
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

const QUICK_STATUSES = ["Pending", "Pending Delivered", "Delivered", "Cancelled"] as const

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

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs font-medium text-slate-400 uppercase tracking-wide">{label}</dt>
      <dd className="text-sm text-slate-800">{value ?? "—"}</dd>
    </div>
  )
}

export function OrderDetailModal({ order, onClose, onUpdate }: OrderDetailModalProps) {
  const [currentOrder, setCurrentOrder] = useState<Order>(order)
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null)
  const [generatingInvoice, setGeneratingInvoice] = useState(false)
  const [generatingReceipt, setGeneratingReceipt] = useState(false)

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [onClose])

  const statusCls = STATUS_COLORS[currentOrder.status ?? ""] ?? "bg-slate-50 text-slate-600 border-slate-100"
  const modeCls = MODE_COLORS[currentOrder.mode ?? ""] ?? "bg-slate-50 text-slate-600 border-slate-100"

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
      onUpdate?.(updated)
      toast.success(`Status updated to "${newStatus}"`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update status")
    } finally {
      setUpdatingStatus(null)
    }
  }

  async function handleGeneratePDF(docType: "invoice" | "receipt") {
    const setLoading = docType === "receipt" ? setGeneratingReceipt : setGeneratingInvoice
    setLoading(true)
    try {
      // Step 1: fetch order data formatted for PDF
      const metaRes = await fetch(`/api/invoices/from-order?order_id=${currentOrder.id}`)
      if (!metaRes.ok) {
        const err = await metaRes.json()
        throw new Error(err.error ?? "Failed to load order data")
      }
      const payload = await metaRes.json()
      payload.doc_type = docType

      // Step 2: POST to PDF route
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
      const filename = docType === "receipt"
        ? `${payload.bill_number}-receipt.pdf`
        : `${payload.bill_number}.pdf`
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
      toast.success(`${docType === "receipt" ? "Receipt" : "Invoice"} downloaded`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setLoading(false)
    }
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
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative z-10 w-full sm:max-w-xl max-h-[90vh] overflow-y-auto bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl border border-slate-100">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-start justify-between px-6 py-5 bg-white border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-sm font-semibold text-indigo-600 bg-indigo-50 rounded px-2 py-0.5 border border-indigo-100">
                {currentOrder.case_code ?? "No Code"}
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
            <p className="text-sm text-slate-500 mt-0.5">{currentOrder.product_name ?? "No product"}</p>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 ml-4 flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-6">

          {/* ── Actions ── */}
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
                    s === "Cancelled" ? "bg-red-500 text-white border-red-500" :
                    s === "Pending Delivered" ? "bg-amber-500 text-white border-amber-500" :
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
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Generate Documents</p>
              <div className="flex gap-2">
                <button
                  onClick={() => handleGeneratePDF("invoice")}
                  disabled={generatingInvoice || generatingReceipt}
                  className="flex-1 inline-flex items-center justify-center gap-2 h-9 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 text-sm font-medium hover:bg-indigo-100 transition-all disabled:opacity-60"
                >
                  {generatingInvoice
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <Download className="h-4 w-4" />}
                  Generate Invoice
                </button>
                <button
                  onClick={() => handleGeneratePDF("receipt")}
                  disabled={generatingInvoice || generatingReceipt}
                  className="flex-1 inline-flex items-center justify-center gap-2 h-9 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 text-sm font-medium hover:bg-emerald-100 transition-all disabled:opacity-60"
                >
                  {generatingReceipt
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <Download className="h-4 w-4" />}
                  Generate Receipt
                </button>
              </div>
            </div>
          </section>

          {/* Financials */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <DollarSign className="h-4 w-4 text-green-500" />
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Financials</h3>
            </div>
            <dl className="grid grid-cols-2 gap-4">
              <DetailRow
                label="Amount"
                value={currentOrder.amount != null ? (
                  <span className="text-lg font-bold text-slate-900">{formatCurrency(currentOrder.amount)}</span>
                ) : "—"}
              />
              <DetailRow
                label="Balance"
                value={currentOrder.balance != null && currentOrder.balance > 0 ? (
                  <span className="text-base font-semibold text-red-600">{formatCurrency(currentOrder.balance)}</span>
                ) : (
                  <span className="text-green-600 font-medium">Cleared</span>
                )}
              />
              {currentOrder.monthly_rental != null && (
                <DetailRow
                  label="Monthly Rental"
                  value={formatCurrency(currentOrder.monthly_rental) + "/mo"}
                />
              )}
              <DetailRow label="Payment Type" value={currentOrder.payment_type} />
              <DetailRow label="Payex Status" value={currentOrder.payex_status} />
              <DetailRow label="Units" value={currentOrder.units ?? 1} />
            </dl>
          </section>

          {/* Dates */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="h-4 w-4 text-blue-500" />
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Dates</h3>
            </div>
            <dl className="grid grid-cols-2 gap-4">
              <DetailRow label="Payment Date" value={formatDisplayDate(currentOrder.payment_date)} />
              <DetailRow label="Delivery Date" value={formatDisplayDate(currentOrder.delivery_date)} />
            </dl>
          </section>

          {/* Contact */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Phone className="h-4 w-4 text-purple-500" />
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Contact</h3>
            </div>
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
          </section>

          {/* Marketing */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Tag className="h-4 w-4 text-orange-500" />
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Marketing & Meta</h3>
            </div>
            <dl className="grid grid-cols-2 gap-4">
              <DetailRow label="Lead Source" value={currentOrder.lead_source} />
              <DetailRow label="Market" value={currentOrder.market} />
              <DetailRow label="Invoice Sent" value={currentOrder.invoice_sent ? "Yes" : "No"} />
            </dl>
          </section>

          {/* Remarks */}
          {currentOrder.remarks && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <FileText className="h-4 w-4 text-slate-400" />
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Remarks</h3>
              </div>
              <p className="text-sm text-slate-700 bg-slate-50 rounded-lg p-3 border border-slate-100 leading-relaxed">
                {currentOrder.remarks}
              </p>
            </section>
          )}

        </div>
      </div>
    </div>
  )
}
