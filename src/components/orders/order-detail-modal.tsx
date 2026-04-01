"use client"

import { useEffect } from "react"
import { X, MapPin, Phone, Mail, Calendar, Tag, DollarSign, FileText } from "lucide-react"
import type { Order } from "./orders-table"
import { formatCurrency } from "@/lib/utils"

interface OrderDetailModalProps {
  order: Order
  onClose: () => void
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

export function OrderDetailModal({ order, onClose }: OrderDetailModalProps) {
  // Close on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [onClose])

  const statusCls = STATUS_COLORS[order.status ?? ""] ?? "bg-slate-50 text-slate-600 border-slate-100"
  const modeCls = MODE_COLORS[order.mode ?? ""] ?? "bg-slate-50 text-slate-600 border-slate-100"

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
                {order.case_code ?? "No Code"}
              </span>
              {order.status && (
                <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${statusCls}`}>
                  {order.status}
                </span>
              )}
              {order.mode && (
                <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${modeCls}`}>
                  {order.mode}
                </span>
              )}
            </div>
            <h2 className="text-lg font-semibold text-slate-900">{order.customer_name}</h2>
            <p className="text-sm text-slate-500 mt-0.5">{order.product_name ?? "No product"}</p>
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

          {/* Financials */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <DollarSign className="h-4 w-4 text-green-500" />
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Financials</h3>
            </div>
            <dl className="grid grid-cols-2 gap-4">
              <DetailRow
                label="Amount"
                value={order.amount != null ? (
                  <span className="text-lg font-bold text-slate-900">{formatCurrency(order.amount)}</span>
                ) : "—"}
              />
              <DetailRow
                label="Balance"
                value={order.balance != null && order.balance > 0 ? (
                  <span className="text-base font-semibold text-red-600">{formatCurrency(order.balance)}</span>
                ) : (
                  <span className="text-green-600 font-medium">Cleared</span>
                )}
              />
              {order.monthly_rental != null && (
                <DetailRow
                  label="Monthly Rental"
                  value={formatCurrency(order.monthly_rental) + "/mo"}
                />
              )}
              <DetailRow label="Payment Type" value={order.payment_type} />
              <DetailRow label="Payex Status" value={order.payex_status} />
              <DetailRow label="Units" value={order.units ?? 1} />
            </dl>
          </section>

          {/* Dates */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="h-4 w-4 text-blue-500" />
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Dates</h3>
            </div>
            <dl className="grid grid-cols-2 gap-4">
              <DetailRow label="Payment Date" value={formatDisplayDate(order.payment_date)} />
              <DetailRow label="Delivery Date" value={formatDisplayDate(order.delivery_date)} />
            </dl>
          </section>

          {/* Contact */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Phone className="h-4 w-4 text-purple-500" />
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Contact</h3>
            </div>
            <dl className="grid grid-cols-1 gap-3">
              {order.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 text-slate-400" />
                  <span className="text-sm text-slate-700">{order.phone}</span>
                </div>
              )}
              {order.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 text-slate-400" />
                  <span className="text-sm text-slate-700">{order.email}</span>
                </div>
              )}
              {order.location && (
                <div className="flex items-start gap-2">
                  <MapPin className="h-3.5 w-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-sm text-slate-700">{order.location}</div>
                    {order.address && (
                      <div className="text-xs text-slate-400 mt-0.5">{order.address}</div>
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
              <DetailRow label="Lead Source" value={order.lead_source} />
              <DetailRow label="Market" value={order.market} />
              <DetailRow label="Invoice Sent" value={order.invoice_sent ? "Yes" : "No"} />
            </dl>
          </section>

          {/* Remarks */}
          {order.remarks && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <FileText className="h-4 w-4 text-slate-400" />
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Remarks</h3>
              </div>
              <p className="text-sm text-slate-700 bg-slate-50 rounded-lg p-3 border border-slate-100 leading-relaxed">
                {order.remarks}
              </p>
            </section>
          )}

        </div>
      </div>
    </div>
  )
}
