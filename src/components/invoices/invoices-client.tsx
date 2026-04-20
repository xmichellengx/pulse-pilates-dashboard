"use client"

import { useState } from "react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { InvoiceForm, type InvoiceInitialData } from "@/components/invoices/invoice-form"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { formatDate } from "@/lib/utils"
import { cn } from "@/lib/utils"
import {
  Plus, Receipt, Trash2, Mail, CheckCircle, X, Edit2, FileText, Loader2,
} from "lucide-react"

interface Invoice {
  id: string
  invoice_number: string
  type: string
  customer_name: string
  customer_email: string | null
  amount: number
  pdf_url: string | null
  sent_at: string | null
  created_at: string
  order_id: string | null
}

interface InvoicesClientProps {
  initialInvoices: Invoice[]
}

const TYPE_COLORS: Record<string, string> = {
  purchase: "bg-indigo-50 text-indigo-700 border-indigo-100",
  Purchase: "bg-indigo-50 text-indigo-700 border-indigo-100",
  rental: "bg-blue-50 text-blue-700 border-blue-100",
  Rental: "bg-blue-50 text-blue-700 border-blue-100",
  deposit: "bg-amber-50 text-amber-700 border-amber-100",
  Deposit: "bg-amber-50 text-amber-700 border-amber-100",
  invoice: "bg-violet-50 text-violet-700 border-violet-100",
  Invoice: "bg-violet-50 text-violet-700 border-violet-100",
  receipt: "bg-emerald-50 text-emerald-700 border-emerald-100",
  Receipt: "bg-emerald-50 text-emerald-700 border-emerald-100",
}

// ---------- Detail Modal ----------

function InvoiceDetailModal({
  invoice,
  onClose,
  onEdit,
  onDelete,
  onMarkSent,
}: {
  invoice: Invoice
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
  onMarkSent: () => void
}) {
  const [generatingPdf, setGeneratingPdf] = useState(false)
  const [markingSent, setMarkingSent] = useState(false)

  async function handleGeneratePDF() {
    setGeneratingPdf(true)
    try {
      const payload = {
        invoice_number: invoice.invoice_number,
        type: invoice.type,
        customer_name: invoice.customer_name,
        customer_email: invoice.customer_email,
        items: [],
        amount: invoice.amount,
        currency: "RM",
      }
      const res = await fetch("/api/invoices/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error("PDF failed")
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${invoice.invoice_number}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      toast.success("Invoice PDF downloaded")
    } catch {
      toast.error("Failed to generate PDF")
    } finally {
      setGeneratingPdf(false)
    }
  }

  async function handleToggleSent() {
    setMarkingSent(true)
    try {
      const res = await fetch("/api/invoices", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: invoice.id,
          sent_at: invoice.sent_at ? null : new Date().toISOString(),
        }),
      })
      if (!res.ok) throw new Error("Update failed")
      onMarkSent()
      toast.success(invoice.sent_at ? "Marked as draft" : "Marked as sent")
    } catch {
      toast.error("Failed to update")
    } finally {
      setMarkingSent(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-slate-100">
          <div>
            <p className="font-mono text-xs text-slate-400 mb-1">{invoice.invoice_number}</p>
            <h2 className="text-xl font-semibold text-slate-900">{invoice.customer_name}</h2>
            {invoice.customer_email && (
              <p className="text-sm text-slate-500 mt-0.5">{invoice.customer_email}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="ml-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Type + Status */}
          <div className="flex items-center gap-3">
            <span
              className={cn(
                "inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold border capitalize",
                TYPE_COLORS[invoice.type] ?? "bg-slate-100 text-slate-600 border-slate-200"
              )}
            >
              {invoice.type}
            </span>
            {invoice.sent_at ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700 border border-green-100">
                <CheckCircle className="h-3 w-3" />
                Sent {formatDate(invoice.sent_at)}
              </span>
            ) : (
              <span className="inline-flex items-center rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
                Draft
              </span>
            )}
          </div>

          {/* Amount */}
          <div className="rounded-xl bg-indigo-50 border border-indigo-100 p-4 text-center">
            <p className="text-xs text-indigo-500 font-medium uppercase tracking-wide mb-1">Amount</p>
            <p className="text-3xl font-bold text-indigo-900">
              {invoice.amount ? `RM ${invoice.amount.toLocaleString()}` : "—"}
            </p>
          </div>

          {/* Meta */}
          <div className="rounded-lg border border-slate-100 bg-slate-50 p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Created</span>
              <span className="text-slate-800 font-medium">{formatDate(invoice.created_at)}</span>
            </div>
            {invoice.order_id && (
              <div className="flex justify-between">
                <span className="text-slate-500">Order ID</span>
                <span className="font-mono text-xs text-slate-600">{invoice.order_id}</span>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 space-y-2">
          <div className="flex gap-2">
            <button
              onClick={handleGeneratePDF}
              disabled={generatingPdf}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border border-indigo-200 bg-indigo-50 text-sm font-semibold text-indigo-700 hover:bg-indigo-100 transition-all disabled:opacity-50"
            >
              {generatingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              Download PDF
            </button>
            <button
              onClick={handleToggleSent}
              disabled={markingSent}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-semibold transition-all",
                invoice.sent_at
                  ? "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  : "border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
              )}
            >
              <CheckCircle className="h-4 w-4" />
              {invoice.sent_at ? "Unmark Sent" : "Mark as Sent"}
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onEdit}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all"
            >
              <Edit2 className="h-4 w-4" />
              Edit
            </button>
            <button
              onClick={onDelete}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border border-red-100 bg-red-50 text-sm font-medium text-red-600 hover:bg-red-100 transition-all"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------- Main Component ----------

export function InvoicesClient({ initialInvoices }: InvoicesClientProps) {
  const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null)

  async function refreshInvoices() {
    const supabase = createClient()
    const { data } = await supabase
      .from("invoices")
      .select("id, invoice_number, type, customer_name, customer_email, amount, pdf_url, sent_at, created_at, order_id")
      .order("created_at", { ascending: false })
      .limit(50)
    if (data) setInvoices(data)
  }

  async function handleDelete(inv: Invoice) {
    if (!confirm(`Delete ${inv.invoice_number}?`)) return
    const supabase = createClient()
    const { error } = await supabase.from("invoices").delete().eq("id", inv.id)
    if (error) {
      toast.error("Failed to delete")
      return
    }
    setInvoices((prev) => prev.filter((i) => i.id !== inv.id))
    setSelectedInvoice(null)
    toast.success(`${inv.invoice_number} deleted`)
  }

  function handleSaved() {
    refreshInvoices()
    setSheetOpen(false)
    setEditingInvoice(null)
    setSelectedInvoice(null)
  }

  function handleMarkSent() {
    // Optimistic update — toggle sent_at on selected invoice
    setInvoices((prev) =>
      prev.map((inv) =>
        inv.id === selectedInvoice?.id
          ? { ...inv, sent_at: inv.sent_at ? null : new Date().toISOString() }
          : inv
      )
    )
    setSelectedInvoice((prev) =>
      prev ? { ...prev, sent_at: prev.sent_at ? null : new Date().toISOString() } : null
    )
    refreshInvoices()
  }

  const editInitialData: InvoiceInitialData | undefined = editingInvoice
    ? {
        id: editingInvoice.id,
        invoice_number: editingInvoice.invoice_number,
        type: editingInvoice.type,
        customer_name: editingInvoice.customer_name,
        customer_email: editingInvoice.customer_email,
        amount: editingInvoice.amount,
        sent_at: editingInvoice.sent_at,
      }
    : undefined

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {invoices.length} invoice{invoices.length !== 1 ? "s" : ""}
        </p>
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger
            render={
              <button className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-indigo-500 text-white text-sm font-semibold shadow-sm hover:bg-indigo-600 transition-all active:scale-95" />
            }
          >
            <Plus className="h-4 w-4" />
            New Invoice
          </SheetTrigger>
          <SheetContent side="right" className="w-full sm:max-w-lg p-6 overflow-y-auto">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-slate-900">New Invoice</h2>
              <p className="text-sm text-slate-500 mt-0.5">Create a purchase, rental, or deposit invoice.</p>
            </div>
            <InvoiceForm onClose={() => setSheetOpen(false)} onSaved={handleSaved} />
          </SheetContent>
        </Sheet>
      </div>

      {/* Edit sheet */}
      {editingInvoice && (
        <Sheet
          open={!!editingInvoice}
          onOpenChange={(open) => { if (!open) setEditingInvoice(null) }}
        >
          <SheetContent side="right" className="w-full sm:max-w-lg p-6 overflow-y-auto">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-slate-900">Edit Invoice</h2>
              <p className="text-sm text-slate-500 mt-0.5 font-mono">{editingInvoice.invoice_number}</p>
            </div>
            <InvoiceForm
              onClose={() => setEditingInvoice(null)}
              onSaved={handleSaved}
              initialData={editInitialData}
            />
          </SheetContent>
        </Sheet>
      )}

      {invoices.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white py-16 text-center">
          <Receipt className="h-8 w-8 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-500">No invoices yet</p>
          <p className="text-xs text-slate-400 mt-1">Click &quot;New Invoice&quot; to generate your first invoice</p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Invoice #
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Customer
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">
                    Type
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Amount
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">
                    Date
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Status
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr
                    key={inv.id}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60 transition-colors cursor-pointer"
                    onClick={() => setSelectedInvoice(inv)}
                  >
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">
                      {inv.invoice_number}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-800">{inv.customer_name}</p>
                      {inv.customer_email && (
                        <p className="text-xs text-slate-400">{inv.customer_email}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium border capitalize",
                          TYPE_COLORS[inv.type] ?? "bg-slate-50 text-slate-600 border-slate-100"
                        )}
                      >
                        {inv.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-800">
                      {inv.amount ? `RM ${inv.amount.toLocaleString()}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-500 hidden md:table-cell">
                      {formatDate(inv.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      {inv.sent_at ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 border border-green-100">
                          <CheckCircle className="h-3 w-3" />
                          Sent
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                          Draft
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          className="p-1.5 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                          title="Send email"
                          onClick={() => toast.info("Email sending coming soon — set RESEND_API_KEY to enable")}
                        >
                          <Mail className="h-3.5 w-3.5" />
                        </button>
                        <button
                          className="p-1.5 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                          title="Delete"
                          onClick={() => handleDelete(inv)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail modal */}
      {selectedInvoice && (
        <InvoiceDetailModal
          invoice={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
          onEdit={() => {
            setEditingInvoice(selectedInvoice)
            setSelectedInvoice(null)
          }}
          onDelete={() => handleDelete(selectedInvoice)}
          onMarkSent={handleMarkSent}
        />
      )}
    </div>
  )
}
