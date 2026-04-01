"use client"

import { useState } from "react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { InvoiceForm } from "@/components/invoices/invoice-form"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { formatDate } from "@/lib/utils"
import { cn } from "@/lib/utils"
import { Plus, Receipt, Trash2, Mail, CheckCircle } from "lucide-react"

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
  rental: "bg-blue-50 text-blue-700 border-blue-100",
  deposit: "bg-amber-50 text-amber-700 border-amber-100",
}

export function InvoicesClient({ initialInvoices }: InvoicesClientProps) {
  const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices)
  const [sheetOpen, setSheetOpen] = useState(false)

  async function handleDelete(id: string, invNum: string) {
    if (!confirm(`Delete ${invNum}?`)) return
    const supabase = createClient()
    const { error } = await supabase.from("invoices").delete().eq("id", id)
    if (error) {
      toast.error("Failed to delete")
      return
    }
    setInvoices((prev) => prev.filter((inv) => inv.id !== id))
    toast.success(`${invNum} deleted`)
  }

  function handleSaved() {
    const supabase = createClient()
    supabase
      .from("invoices")
      .select("id, invoice_number, type, customer_name, customer_email, amount, pdf_url, sent_at, created_at, order_id")
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => {
        if (data) setInvoices(data)
      })
    setSheetOpen(false)
  }

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
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors"
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
                    <td className="px-4 py-3">
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
                          onClick={() => handleDelete(inv.id, inv.invoice_number)}
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
    </div>
  )
}
