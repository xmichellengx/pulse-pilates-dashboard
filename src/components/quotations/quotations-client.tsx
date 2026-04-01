"use client"

import { useState } from "react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { QuotationBuilder } from "@/components/quotations/quotation-builder"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { formatDate } from "@/lib/utils"
import {
  Plus,
  Eye,
  ArrowRightCircle,
  Trash2,
  FileText,
} from "lucide-react"

interface Quotation {
  id: string
  quotation_number: string
  customer_name: string
  customer_phone: string
  market: string
  total: number
  items: unknown[]
  email_sent: boolean
  converted_to_order: string | null
  created_at: string
  expires_at: string
}

interface QuotationsClientProps {
  initialQuotations: Quotation[]
}

export function QuotationsClient({ initialQuotations }: QuotationsClientProps) {
  const [quotations, setQuotations] = useState<Quotation[]>(initialQuotations)
  const [sheetOpen, setSheetOpen] = useState(false)

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

  function handleSaved() {
    // Refresh the list
    const supabase = createClient()
    supabase
      .from("quotations")
      .select("id, quotation_number, customer_name, customer_phone, market, total, items, email_sent, converted_to_order, created_at, expires_at")
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => {
        if (data) setQuotations(data)
      })
    setSheetOpen(false)
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
              onClose={() => setSheetOpen(false)}
              onSaved={handleSaved}
            />
          </SheetContent>
        </Sheet>
      </div>

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
                            onClick={() => toast.info("View detail coming soon")}
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          {!q.converted_to_order && (
                            <button
                              className="p-1.5 rounded-md text-slate-400 hover:text-green-600 hover:bg-green-50 transition-colors"
                              title="Convert to Order"
                              onClick={() => toast.info("Convert to order coming in Phase 4")}
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
