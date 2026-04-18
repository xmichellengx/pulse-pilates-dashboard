"use client"

import { useState } from "react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { QuotationBuilder, type Product, type QuotationInitialData } from "@/components/quotations/quotation-builder"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { formatDate } from "@/lib/utils"
import {
  Plus,
  Eye,
  Pencil,
  ArrowRightCircle,
  Trash2,
  FileText,
  X,
  Package,
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
  total: number
  subtotal?: number | null
  delivery_fee?: number | null
  installation_fee?: number | null
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
  const [quotations, setQuotations] = useState<Quotation[]>(initialQuotations)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editSheetOpen, setEditSheetOpen] = useState(false)
  const [viewSheetOpen, setViewSheetOpen] = useState(false)
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null)

  async function handleDelete(id: string, quoNum: string) {
    if (!confirm(`Delete ${quoNum}?`)) return
    const supabase = createClient()
    const { error } = await supabase.from("quotations").delete().eq("id", id)
    if (error) {
      toast.error("Failed to delete")
      return
    }
    setQuotations((prev) => prev.filter((q) => q.id !== id))
    toast.success(`${quoNum} deleted`)
  }

  async function refreshList() {
    const supabase = createClient()
    const { data } = await supabase
      .from("quotations")
      .select("id, quotation_number, customer_name, customer_email, customer_phone, market, pricing_tier, total, subtotal, delivery_fee, installation_fee, items, email_sent, converted_to_order, created_at, expires_at")
      .order("created_at", { ascending: false })
      .limit(50)
    if (data) setQuotations(data)
  }

  function handleNewSaved() {
    refreshList()
    setSheetOpen(false)
  }

  function handleEditSaved() {
    refreshList()
    setEditSheetOpen(false)
    setSelectedQuotation(null)
  }

  function openView(q: Quotation) {
    setSelectedQuotation(q)
    setViewSheetOpen(true)
  }

  function openEdit(q: Quotation) {
    setSelectedQuotation(q)
    setEditSheetOpen(true)
  }

  const currency = (market: string) => (market === "SG" ? "SGD" : "RM")

  return (
    <div className="space-y-4">
      {/* Header action bar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {quotations.length} quotation{quotations.length !== 1 ? "s" : ""}
        </p>
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
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
              onClose={() => setSheetOpen(false)}
              onSaved={handleNewSaved}
            />
          </SheetContent>
        </Sheet>
      </div>

      {/* Edit sheet */}
      <Sheet open={editSheetOpen} onOpenChange={(open) => {
        setEditSheetOpen(open)
        if (!open) setSelectedQuotation(null)
      }}>
        <SheetContent side="right" className="w-full sm:max-w-lg p-6 overflow-y-auto">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-slate-900">Edit Quotation</h2>
            <p className="text-sm text-slate-500 mt-0.5">{selectedQuotation?.quotation_number}</p>
          </div>
          {selectedQuotation && (
            <QuotationBuilder
              key={selectedQuotation.id}
              products={products}
              onClose={() => { setEditSheetOpen(false); setSelectedQuotation(null) }}
              onSaved={handleEditSaved}
              initialData={selectedQuotation as QuotationInitialData}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* View sheet */}
      <Sheet open={viewSheetOpen} onOpenChange={(open) => {
        setViewSheetOpen(open)
        if (!open) setSelectedQuotation(null)
      }}>
        <SheetContent side="right" className="w-full sm:max-w-lg p-6 overflow-y-auto">
          {selectedQuotation && (
            <QuotationDetailView
              quotation={selectedQuotation}
              onClose={() => { setViewSheetOpen(false); setSelectedQuotation(null) }}
              onEdit={() => {
                setViewSheetOpen(false)
                openEdit(selectedQuotation)
              }}
              onDelete={() => {
                setViewSheetOpen(false)
                handleDelete(selectedQuotation.id, selectedQuotation.quotation_number)
              }}
              currency={currency(selectedQuotation.market)}
            />
          )}
        </SheetContent>
      </Sheet>

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
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    #
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Customer
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">
                    Items
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Total
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">
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
                      className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">
                        {q.quotation_number}
                      </td>
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
                          <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 border border-green-100">
                            Converted
                          </span>
                        ) : q.email_sent ? (
                          <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 border border-blue-100">
                            PDF Sent
                          </span>
                        ) : isExpired ? (
                          <span className="inline-flex items-center rounded-md bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600 border border-red-100">
                            Expired
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 border border-amber-100">
                            Draft
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            className="p-1.5 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                            title="View"
                            onClick={() => openView(q)}
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          <button
                            className="p-1.5 rounded-md text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                            title="Edit"
                            onClick={() => openEdit(q)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          {!q.converted_to_order && (
                            <button
                              className="p-1.5 rounded-md text-slate-400 hover:text-green-600 hover:bg-green-50 transition-colors"
                              title="Convert to Order"
                              onClick={() => toast.info("Convert to order coming soon")}
                            >
                              <ArrowRightCircle className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button
                            className="p-1.5 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                            title="Delete"
                            onClick={() => handleDelete(q.id, q.quotation_number)}
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
        </div>
      )}
    </div>
  )
}

// ---------- View Detail Component ----------

interface QuotationDetailViewProps {
  quotation: Quotation
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
  currency: string
}

function QuotationDetailView({ quotation: q, onClose, onEdit, onDelete, currency }: QuotationDetailViewProps) {
  const items = (Array.isArray(q.items) ? q.items : []) as LineItem[]
  const validItems = items.filter((i) => i.product_id)
  const isExpired = q.expires_at && new Date(q.expires_at) < new Date()

  const statusLabel = q.converted_to_order
    ? { text: "Converted", cls: "bg-green-50 text-green-700 border-green-100" }
    : q.email_sent
    ? { text: "PDF Sent", cls: "bg-blue-50 text-blue-700 border-blue-100" }
    : isExpired
    ? { text: "Expired", cls: "bg-red-50 text-red-600 border-red-100" }
    : { text: "Draft", cls: "bg-amber-50 text-amber-700 border-amber-100" }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{q.quotation_number}</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {new Date(q.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
          </p>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Status */}
      <span className={`self-start inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium border mb-5 ${statusLabel.cls}`}>
        {statusLabel.text}
      </span>

      {/* Customer info */}
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 mb-4">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Customer</p>
        <p className="font-semibold text-slate-800">{q.customer_name}</p>
        <p className="text-sm text-slate-500">{q.customer_phone}</p>
        {q.customer_email && <p className="text-sm text-slate-500">{q.customer_email}</p>}
        <div className="flex gap-4 mt-2 text-xs text-slate-400">
          <span>Market: <span className="font-medium text-slate-600">{q.market}</span></span>
          {q.pricing_tier && (
            <span>Tier: <span className="font-medium text-slate-600">{q.pricing_tier === "retail" ? "Retail" : q.pricing_tier === "p4b_t1" ? "P4B T1" : "P4B T2"}</span></span>
          )}
        </div>
      </div>

      {/* Line items */}
      <div className="mb-4">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Products</p>
        {validItems.length === 0 ? (
          <div className="flex items-center gap-2 py-4 text-slate-400">
            <Package className="h-4 w-4" />
            <span className="text-sm">No products</span>
          </div>
        ) : (
          <div className="space-y-2">
            {validItems.map((item, idx) => (
              <div key={idx} className="rounded-lg border border-slate-200 bg-white p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-800 text-sm leading-snug">{item.product_name}</p>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                      <span className="text-xs text-slate-400">Qty: {item.qty}</span>
                      <span className="text-xs text-slate-400 capitalize">{item.purchase_mode?.replace("_", " ")}</span>
                      {item.custom_colour && item.colour_name && (
                        <span className="text-xs text-slate-400">Colour: {item.colour_name}</span>
                      )}
                      {item.logo_engraving && (
                        <span className="text-xs text-slate-400">Logo engraving</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-semibold text-slate-800 text-sm">
                      {currency} {(item.unit_price * item.qty).toLocaleString()}
                    </p>
                    {item.customisation_surcharge > 0 && (
                      <p className="text-xs text-slate-400">+{currency} {item.customisation_surcharge} customisation</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Totals */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 mb-6 space-y-1.5">
        {q.subtotal != null && (
          <div className="flex justify-between text-sm text-slate-600">
            <span>Subtotal</span>
            <span>{currency} {q.subtotal.toLocaleString()}</span>
          </div>
        )}
        {q.delivery_fee != null && (
          <div className="flex justify-between text-sm text-slate-600">
            <span>Delivery</span>
            <span>{currency} {q.delivery_fee.toLocaleString()}</span>
          </div>
        )}
        {q.installation_fee != null && (
          <div className="flex justify-between text-sm text-slate-600">
            <span>Installation</span>
            <span>{currency} {q.installation_fee.toLocaleString()}</span>
          </div>
        )}
        <div className="flex justify-between font-semibold text-slate-900 pt-1.5 border-t border-slate-100">
          <span>Total</span>
          <span>{currency} {q.total?.toLocaleString() ?? "—"}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-auto">
        <button
          onClick={onEdit}
          className="flex-1 inline-flex items-center justify-center gap-2 h-9 rounded-lg bg-indigo-500 text-white text-sm font-semibold hover:bg-indigo-600 transition-colors"
        >
          <Pencil className="h-3.5 w-3.5" />
          Edit
        </button>
        <button
          onClick={onDelete}
          className="inline-flex items-center justify-center gap-2 h-9 px-3 rounded-lg border border-red-200 text-red-500 text-sm font-medium hover:bg-red-50 transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
