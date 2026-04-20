"use client"

import { useState } from "react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { QuotationBuilder, type Product, type QuotationInitialData } from "@/components/quotations/quotation-builder"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { formatDate } from "@/lib/utils"
import { useRouter } from "next/navigation"
import {
  Plus,
  Pencil,
  Trash2,
  FileText,
  X,
  Package,
  User,
  Phone,
  Mail,
  Loader2,
  Download,
  ShoppingCart,
  Send,
} from "lucide-react"

interface LineItem {
  product_id: string
  product_name: string
  qty: number
  unit_price: number
  purchase_mode: string
  custom_colour: boolean
  colour_name: string
  logo_engraving: boolean
  engraving_notes: string
  customisation_surcharge: number
}

interface Quotation {
  id: string
  quotation_number: string
  customer_name: string
  customer_email?: string | null
  customer_phone: string
  market: string
  pricing_tier?: string | null
  lead_source?: string | null
  total: number
  subtotal?: number | null
  delivery_fee?: number | null
  installation_fee?: number | null
  delivery_location?: string | null
  estimated_delivery?: string | null
  remarks?: string | null
  discounts?: Array<{ label: string; amount: number }> | null
  additional_charges?: Array<{ label: string; amount: number }> | null
  items: unknown[]
  email_sent: boolean
  converted_to_order: string | null
  created_at: string
  expires_at: string
}

interface QuotationsClientProps {
  initialQuotations: Quotation[]
  products: Product[]
}

export function QuotationsClient({ initialQuotations, products }: QuotationsClientProps) {
  const router = useRouter()
  const [quotations, setQuotations] = useState<Quotation[]>(initialQuotations)
  const [newSheetOpen, setNewSheetOpen] = useState(false)
  const [editSheetOpen, setEditSheetOpen] = useState(false)
  const [viewModal, setViewModal] = useState<Quotation | null>(null)
  const [editTarget, setEditTarget] = useState<Quotation | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [generatingPdf, setGeneratingPdf] = useState(false)
  const [converting, setConverting] = useState(false)
  const [markingSent, setMarkingSent] = useState(false)

  async function refreshList() {
    const supabase = createClient()
    const { data } = await supabase
      .from("quotations")
      .select("id, quotation_number, customer_name, customer_email, customer_phone, market, pricing_tier, lead_source, total, subtotal, delivery_fee, installation_fee, delivery_location, estimated_delivery, remarks, discounts, additional_charges, items, email_sent, converted_to_order, created_at, expires_at")
      .order("created_at", { ascending: false })
      .limit(50)
    if (data) setQuotations(data)
  }

  async function handleDelete(q: Quotation) {
    if (!confirm(`Delete quotation ${q.quotation_number}? This cannot be undone.`)) return
    setDeleting(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from("quotations").delete().eq("id", q.id)
      if (error) throw error
      setQuotations((prev) => prev.filter((x) => x.id !== q.id))
      setViewModal(null)
      toast.success(`${q.quotation_number} deleted`)
    } catch {
      toast.error("Failed to delete quotation")
    } finally {
      setDeleting(false)
    }
  }

  function openEdit(q: Quotation) {
    setViewModal(null)
    setEditTarget(q)
    setEditSheetOpen(true)
  }

  async function handleGeneratePdf(q: Quotation) {
    setGeneratingPdf(true)
    try {
      const items = (Array.isArray(q.items) ? q.items : []) as LineItem[]
      const payload = {
        quotation_number: q.quotation_number,
        customer_name: q.customer_name,
        customer_email: q.customer_email,
        customer_phone: q.customer_phone,
        market: q.market,
        pricing_tier: q.pricing_tier,
        items,
        delivery_fee: q.delivery_fee ?? 0,
        installation_fee: q.installation_fee ?? 0,
        subtotal: q.subtotal ?? 0,
        total: q.total,
      }
      const res = await fetch("/api/quotations/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error("PDF failed")
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${q.quotation_number}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      toast.success("PDF downloaded")
    } catch {
      toast.error("Failed to generate PDF")
    } finally {
      setGeneratingPdf(false)
    }
  }

  async function handleConvertToOrder(q: Quotation) {
    setConverting(true)
    try {
      const items = (Array.isArray(q.items) ? q.items : []) as LineItem[]
      const validItems = items.filter((i) => i.product_id)
      const productSummary = validItems.map((i) => `${i.qty}x ${i.product_name}`).join(", ")
      const firstItem = validItems[0]
      const mode = firstItem?.purchase_mode === "rental"
        ? "Rental"
        : firstItem?.purchase_mode === "cc_installment"
        ? "CC Installment"
        : "Direct Purchase"

      // Create order entry in the DB
      const supabase = createClient()
      const { error } = await supabase.from("orders").insert({
        customer_name: q.customer_name,
        email: q.customer_email || null,
        phone: q.customer_phone || null,
        product_name: productSummary || firstItem?.product_name || "See quotation",
        units: firstItem?.qty ?? 1,
        mode,
        amount: q.total,
        market: q.market,
        status: "Pending",
        remarks: `Converted from ${q.quotation_number}`,
        created_at: new Date().toISOString(),
      })
      if (error) throw error

      // Mark quotation as converted
      await supabase.from("quotations").update({ converted_to_order: q.quotation_number }).eq("id", q.id)

      setQuotations((prev) =>
        prev.map((x) => x.id === q.id ? { ...x, converted_to_order: q.quotation_number } : x)
      )
      setViewModal(null)
      toast.success("Order created! Go to Orders to complete the details.")
      router.refresh()
    } catch (err) {
      console.error(err)
      toast.error("Failed to convert to order")
    } finally {
      setConverting(false)
    }
  }

  async function handleMarkSent(q: Quotation) {
    setMarkingSent(true)
    try {
      const supabase = createClient()
      const newValue = !q.email_sent
      await supabase.from("quotations").update({ email_sent: newValue }).eq("id", q.id)
      setQuotations((prev) => prev.map((x) => x.id === q.id ? { ...x, email_sent: newValue } : x))
      setViewModal((prev) => prev ? { ...prev, email_sent: newValue } : null)
      toast.success(newValue ? "Marked as Sent to Customer" : "Marked as Active")
    } catch {
      toast.error("Failed to update")
    } finally {
      setMarkingSent(false)
    }
  }

  const currency = (market: string) => (market === "SG" ? "SGD" : "RM")

  return (
    <div className="space-y-4">
      {/* Header action bar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {quotations.length} quotation{quotations.length !== 1 ? "s" : ""}
        </p>
        <Sheet open={newSheetOpen} onOpenChange={setNewSheetOpen}>
          <SheetTrigger
            render={
              <button className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-indigo-500 text-white text-sm font-semibold shadow-sm hover:bg-indigo-600 transition-all active:scale-95" />
            }
          >
            <Plus className="h-4 w-4" />
            New Quotation
          </SheetTrigger>
          <SheetContent side="right" className="w-full sm:max-w-lg p-6 overflow-y-auto">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-slate-900">New Quotation</h2>
              <p className="text-sm text-slate-500 mt-0.5">Fill in the details below to generate a quote.</p>
            </div>
            <QuotationBuilder
              products={products}
              onClose={() => setNewSheetOpen(false)}
              onSaved={() => { refreshList(); setNewSheetOpen(false) }}
            />
          </SheetContent>
        </Sheet>
      </div>

      {/* Edit sheet */}
      <Sheet open={editSheetOpen} onOpenChange={(open) => { setEditSheetOpen(open); if (!open) setEditTarget(null) }}>
        <SheetContent side="right" className="w-full sm:max-w-lg p-6 overflow-y-auto">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-slate-900">Edit Quotation</h2>
            <p className="text-sm text-slate-500 mt-0.5">{editTarget?.quotation_number}</p>
          </div>
          {editTarget && (
            <QuotationBuilder
              key={editTarget.id}
              products={products}
              onClose={() => { setEditSheetOpen(false); setEditTarget(null) }}
              onSaved={() => { refreshList(); setEditSheetOpen(false); setEditTarget(null) }}
              initialData={editTarget as QuotationInitialData}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* View modal — same pattern as order detail modal */}
      {viewModal && (
        <QuotationDetailModal
          quotation={viewModal}
          currency={currency(viewModal.market)}
          onClose={() => setViewModal(null)}
          onEdit={() => openEdit(viewModal)}
          onDelete={() => handleDelete(viewModal)}
          onGeneratePdf={() => handleGeneratePdf(viewModal)}
          onConvertToOrder={() => handleConvertToOrder(viewModal)}
          onMarkSent={() => handleMarkSent(viewModal)}
          deleting={deleting}
          generatingPdf={generatingPdf}
          converting={converting}
          markingSent={markingSent}
        />
      )}

      {/* Table */}
      {quotations.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white py-16 text-center">
          <FileText className="h-8 w-8 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-500">No quotations yet</p>
          <p className="text-xs text-slate-400 mt-1">Click &quot;New Quotation&quot; to create your first one</p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">#</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Customer</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Items</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Total</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                </tr>
              </thead>
              <tbody>
                {quotations.map((q) => {
                  const itemCount = Array.isArray(q.items)
                    ? q.items.filter((i: unknown) => {
                        if (typeof i === "object" && i !== null && "product_id" in i) {
                          return (i as { product_id: string }).product_id
                        }
                        return false
                      }).length
                    : 0
                  const isExpired = q.expires_at && new Date(q.expires_at) < new Date()

                  return (
                    <tr
                      key={q.id}
                      className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors cursor-pointer"
                      onClick={() => setViewModal(q)}
                    >
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">{q.quotation_number}</td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-800">{q.customer_name}</p>
                        <p className="text-xs text-slate-400">{q.customer_phone}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-600 hidden md:table-cell">
                        {itemCount} item{itemCount !== 1 ? "s" : ""}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-800">
                        {currency(q.market)} {q.total?.toLocaleString() ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-500 hidden sm:table-cell">
                        {formatDate(q.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        {q.converted_to_order ? (
                          <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 border border-green-100">Converted</span>
                        ) : q.email_sent ? (
                          <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 border border-blue-100">PDF Sent</span>
                        ) : isExpired ? (
                          <span className="inline-flex items-center rounded-md bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600 border border-red-100">Expired</span>
                        ) : (
                          <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 border border-emerald-100">Active</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ---------- Detail Modal ----------

interface QuotationDetailModalProps {
  quotation: Quotation
  currency: string
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
  onGeneratePdf: () => void
  onConvertToOrder: () => void
  onMarkSent: () => void
  deleting: boolean
  generatingPdf: boolean
  converting: boolean
  markingSent: boolean
}

function QuotationDetailModal({ quotation: q, currency, onClose, onEdit, onDelete, onGeneratePdf, onConvertToOrder, onMarkSent, deleting, generatingPdf, converting, markingSent }: QuotationDetailModalProps) {
  const items = (Array.isArray(q.items) ? q.items : []) as LineItem[]
  const validItems = items.filter((i) => i.product_id)
  const isExpired = q.expires_at && new Date(q.expires_at) < new Date()

  const statusLabel = q.converted_to_order
    ? { text: "Converted to Order", cls: "bg-green-50 text-green-700 border-green-100" }
    : q.email_sent
    ? { text: "PDF Sent", cls: "bg-blue-50 text-blue-700 border-blue-100" }
    : isExpired
    ? { text: "Expired", cls: "bg-red-50 text-red-600 border-red-100" }
    : { text: "Active", cls: "bg-emerald-50 text-emerald-700 border-emerald-100" }

  const tierLabel: Record<string, string> = {
    retail: "Retail",
    p4b_t1: "P4B T1",
    p4b_t2: "P4B T2",
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={onClose} />

      {/* Panel */}
      <div className="relative z-10 w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl border border-slate-100">
        {/* Sticky header */}
        <div className="sticky top-0 z-10 flex items-start justify-between px-6 py-5 bg-white border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-sm font-semibold text-indigo-600 bg-indigo-50 rounded px-2 py-0.5 border border-indigo-100">
                {q.quotation_number}
              </span>
              <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${statusLabel.cls}`}>
                {statusLabel.text}
              </span>
            </div>
            <h2 className="text-lg font-semibold text-slate-900">{q.customer_name}</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              {new Date(q.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
              {q.expires_at && ` · Expires ${new Date(q.expires_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 ml-4">
            <button
              onClick={onDelete}
              disabled={deleting}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
              title="Delete quotation"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            </button>
            <button
              onClick={onEdit}
              className="flex h-8 items-center gap-1.5 px-3 rounded-lg bg-indigo-500 text-white text-xs font-semibold hover:bg-indigo-600 transition-colors"
            >
              <Pencil className="h-3 w-3" />
              Edit
            </button>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Customer info */}
          <section>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Customer Details</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-start gap-2">
                <User className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-slate-400">Name</p>
                  <p className="text-sm font-medium text-slate-800">{q.customer_name}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Phone className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-slate-400">Phone</p>
                  <p className="text-sm font-medium text-slate-800">{q.customer_phone || "—"}</p>
                </div>
              </div>
              {q.customer_email && (
                <div className="flex items-start gap-2">
                  <Mail className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-slate-400">Email</p>
                    <p className="text-sm font-medium text-slate-800">{q.customer_email}</p>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-2">
                <FileText className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-slate-400">Market / Pricing</p>
                  <p className="text-sm font-medium text-slate-800">
                    {q.market} &middot; {q.pricing_tier ? tierLabel[q.pricing_tier] ?? q.pricing_tier : "Retail"}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <div className="border-t border-slate-100" />

          {/* Products */}
          <section>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Products</p>
            {validItems.length === 0 ? (
              <div className="flex items-center gap-2 py-3 text-slate-400">
                <Package className="h-4 w-4" />
                <span className="text-sm">No products listed</span>
              </div>
            ) : (
              <div className="space-y-2">
                {validItems.map((item, idx) => (
                  <div key={idx} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-800 text-sm">{item.product_name}</p>
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                          <span className="text-xs text-slate-500">Qty: {item.qty}</span>
                          <span className="text-xs text-slate-500 capitalize">
                            {item.purchase_mode === "cc_installment" ? "CC Installment" : item.purchase_mode === "direct" ? "Direct Purchase" : "Rental"}
                          </span>
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
                        <p className="font-semibold text-slate-800 text-sm">
                          {currency} {(item.unit_price * item.qty).toLocaleString()}
                        </p>
                        {item.customisation_surcharge > 0 && (
                          <p className="text-xs text-slate-400">
                            +{currency} {item.customisation_surcharge.toLocaleString()} custom
                          </p>
                        )}
                        <p className="text-xs text-slate-400 mt-0.5">
                          {currency} {item.unit_price.toLocaleString()} each
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <div className="border-t border-slate-100" />

          {/* Pricing breakdown */}
          <section>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Pricing</p>
            <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
              <div className="divide-y divide-slate-100">
                {q.subtotal != null && (
                  <div className="flex justify-between px-4 py-2.5 text-sm">
                    <span className="text-slate-500">Equipment subtotal</span>
                    <span className="font-medium text-slate-700">{currency} {q.subtotal.toLocaleString()}</span>
                  </div>
                )}
                {Array.isArray(q.discounts) && q.discounts.filter(d => d.amount > 0).map((d, i) => (
                  <div key={i} className="flex justify-between px-4 py-2.5 text-sm">
                    <span className="text-red-500">(-) {d.label || "Discount"}</span>
                    <span className="font-medium text-red-500">-{currency} {d.amount.toLocaleString()}</span>
                  </div>
                ))}
                {Array.isArray(q.additional_charges) && q.additional_charges.filter(c => c.amount > 0).map((c, i) => (
                  <div key={i} className="flex justify-between px-4 py-2.5 text-sm">
                    <span className="text-emerald-600">(+) {c.label || "Additional charge"}</span>
                    <span className="font-medium text-emerald-600">+{currency} {c.amount.toLocaleString()}</span>
                  </div>
                ))}
                {q.delivery_fee != null && (
                  <div className="flex justify-between px-4 py-2.5 text-sm">
                    <span className="text-slate-500">Delivery</span>
                    <span className="font-medium text-slate-700">{currency} {q.delivery_fee.toLocaleString()}</span>
                  </div>
                )}
                {q.installation_fee != null && (
                  <div className="flex justify-between px-4 py-2.5 text-sm">
                    <span className="text-slate-500">Installation</span>
                    <span className="font-medium text-slate-700">{currency} {q.installation_fee.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between px-4 py-3 bg-slate-50 font-semibold">
                  <span className="text-slate-800">Total</span>
                  <span className="text-slate-900">{currency} {q.total?.toLocaleString() ?? "—"}</span>
                </div>
              </div>
            </div>
          </section>

          {/* Delivery info */}
          {(q.delivery_location || q.estimated_delivery || q.remarks) && (
            <>
              <div className="border-t border-slate-100" />
              <section>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Delivery & Notes</p>
                <div className="space-y-2 text-sm">
                  {q.delivery_location && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Location</span>
                      <span className="font-medium text-slate-800">{q.delivery_location}</span>
                    </div>
                  )}
                  {q.estimated_delivery && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Est. Delivery</span>
                      <span className="font-medium text-slate-800">{q.estimated_delivery}</span>
                    </div>
                  )}
                  {q.remarks && (
                    <div className="pt-1">
                      <p className="text-slate-500 mb-1">Remarks</p>
                      <p className="text-slate-800 bg-slate-50 rounded-lg px-3 py-2 text-xs leading-relaxed">{q.remarks}</p>
                    </div>
                  )}
                </div>
              </section>
            </>
          )}

          {/* Lead source */}
          {q.lead_source && (
            <>
              <div className="border-t border-slate-100" />
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Lead Source</span>
                <span className="font-medium text-slate-800">{q.lead_source}</span>
              </div>
            </>
          )}
        </div>

        {/* Footer actions */}
        <div className="sticky bottom-0 px-6 py-4 bg-white border-t border-slate-100 space-y-2">
          {/* Row 1: PDF + Mark Sent */}
          <div className="flex gap-2">
            <button
              onClick={onGeneratePdf}
              disabled={generatingPdf}
              className="flex-1 inline-flex items-center justify-center gap-2 h-9 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 text-sm font-semibold hover:bg-indigo-100 transition-colors disabled:opacity-60"
            >
              {generatingPdf ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              Download PDF
            </button>
            <button
              onClick={onMarkSent}
              disabled={markingSent}
              className={`flex-1 inline-flex items-center justify-center gap-2 h-9 rounded-lg border text-sm font-semibold transition-colors disabled:opacity-60 ${
                q.email_sent
                  ? "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  : "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
              }`}
            >
              {markingSent ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              {q.email_sent ? "Unmark Sent" : "Mark as Sent"}
            </button>
          </div>
          {/* Row 2: Edit */}
          <button
            onClick={onEdit}
            className="w-full inline-flex items-center justify-center gap-2 h-9 rounded-lg bg-indigo-500 text-white text-sm font-semibold hover:bg-indigo-600 transition-colors"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit Quotation
          </button>
          {/* Row 3: Convert + Delete */}
          <div className="flex gap-2">
            {!q.converted_to_order && (
              <button
                onClick={onConvertToOrder}
                disabled={converting}
                className="flex-1 inline-flex items-center justify-center gap-2 h-9 rounded-lg border border-green-200 bg-green-50 text-green-700 text-sm font-semibold hover:bg-green-100 transition-colors disabled:opacity-60"
              >
                {converting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShoppingCart className="h-3.5 w-3.5" />}
                Convert to Order
              </button>
            )}
            <button
              onClick={onDelete}
              disabled={deleting}
              className="inline-flex items-center justify-center gap-2 h-9 px-4 rounded-lg border border-red-200 text-red-500 text-sm font-medium hover:bg-red-50 transition-colors disabled:opacity-60"
            >
              {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
