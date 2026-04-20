"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { FileText, Mail, Loader2, Plus, Trash2, ToggleLeft, ToggleRight } from "lucide-react"

// ---- types ----

interface LineItem {
  description: string
  qty: number
  unit_price: number
  amount: number
}

// ---- schema ----

const schema = z.object({
  customer_name: z.string().min(1, "Name required"),
  customer_email: z.string().optional(),
  order_case_code: z.string().optional(),
  type: z.string().min(1),
  currency: z.enum(["RM", "SGD"]),
  amount: z.number().min(0),
})

type FormValues = z.infer<typeof schema>

const INVOICE_TYPES = ["purchase", "rental", "deposit", "invoice", "receipt"]

function generateInvoiceNumber(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "")
  const rand = Math.floor(Math.random() * 900) + 100
  return `INV-${date}-${rand}`
}

export interface InvoiceInitialData {
  id: string
  invoice_number: string
  type: string
  customer_name: string
  customer_email?: string | null
  amount?: number | null
  currency?: string | null
  line_items?: LineItem[] | null
  order_case_code?: string | null
  sent_at?: string | null
}

interface InvoiceFormProps {
  onClose: () => void
  onSaved: () => void
  initialData?: InvoiceInitialData
}

export function InvoiceForm({ onClose, onSaved, initialData }: InvoiceFormProps) {
  const [lineItems, setLineItems] = useState<LineItem[]>(
    () => initialData?.line_items?.length ? initialData.line_items : [{ description: "", qty: 1, unit_price: 0, amount: 0 }]
  )
  const [saving, setSaving] = useState(false)
  const [generatingPdf, setGeneratingPdf] = useState(false)
  const [sendingEmail, setSendingEmail] = useState(false)
  const [markedSent, setMarkedSent] = useState(!!initialData?.sent_at)

  const isEditing = !!initialData?.id

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: initialData?.type ?? "purchase",
      currency: (initialData?.currency as "RM" | "SGD") ?? "RM",
      amount: initialData?.amount ?? 0,
      customer_name: initialData?.customer_name ?? "",
      customer_email: initialData?.customer_email ?? "",
      order_case_code: initialData?.order_case_code ?? "",
    },
  })

  const watchedValues = watch()

  function updateLineItem(index: number, field: keyof LineItem, value: string | number) {
    setLineItems((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      // Auto-calculate amount
      if (field === "qty" || field === "unit_price") {
        const qty = field === "qty" ? Number(value) : updated[index].qty
        const unitPrice = field === "unit_price" ? Number(value) : updated[index].unit_price
        updated[index].amount = qty * unitPrice
      }
      // Update total
      const total = updated.reduce((s, i) => s + i.amount, 0)
      setValue("amount", total)
      return updated
    })
  }

  function addLineItem() {
    setLineItems((prev) => [
      ...prev,
      { description: "", qty: 1, unit_price: 0, amount: 0 },
    ])
  }

  function removeLineItem(index: number) {
    setLineItems((prev) => {
      const updated = prev.filter((_, i) => i !== index)
      const total = updated.reduce((s, i) => s + i.amount, 0)
      setValue("amount", total)
      return updated
    })
  }

  async function handleGeneratePDF() {
    if (!watchedValues.customer_name) {
      toast.error("Enter customer name first")
      return
    }
    setGeneratingPdf(true)
    try {
      const invoiceNumber = generateInvoiceNumber()
      const payload = {
        invoice_number: invoiceNumber,
        type: watchedValues.type,
        customer_name: watchedValues.customer_name,
        customer_email: watchedValues.customer_email,
        order_case_code: watchedValues.order_case_code,
        items: lineItems.filter((i) => i.description),
        amount: watchedValues.amount,
        currency: watchedValues.currency,
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
      a.download = `${invoiceNumber}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      toast.success("Invoice PDF downloaded")
    } catch {
      toast.error("Failed to generate PDF")
    } finally {
      setGeneratingPdf(false)
    }
  }

  async function handleSendEmail() {
    setSendingEmail(true)
    try {
      const res = await fetch("/api/invoices/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer_email: watchedValues.customer_email }),
      })
      if (res.status === 503) {
        toast.info("Email sending coming soon — set RESEND_API_KEY to enable")
      } else {
        toast.success("Email sent")
      }
    } catch {
      toast.info("Email sending coming soon")
    } finally {
      setSendingEmail(false)
    }
  }

  async function handleSave(values: FormValues) {
    setSaving(true)
    try {
      const invoicePayload = {
        type: values.type,
        customer_name: values.customer_name,
        customer_email: values.customer_email || null,
        order_case_code: values.order_case_code || null,
        currency: values.currency,
        line_items: lineItems.filter((i) => i.description),
        amount: values.amount,
        sent_at: markedSent ? (initialData?.sent_at ?? new Date().toISOString()) : null,
      }

      if (isEditing) {
        const res = await fetch("/api/invoices", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: initialData!.id, ...invoicePayload }),
        })
        if (!res.ok) {
          const { error } = await res.json()
          throw new Error(error)
        }
        toast.success(`Invoice ${initialData!.invoice_number} updated`)
      } else {
        const supabase = createClient()
        const invoiceNumber = generateInvoiceNumber()

        const { error } = await supabase.from("invoices").insert({
          invoice_number: invoiceNumber,
          ...invoicePayload,
        })

        if (error) throw error
        toast.success(`Invoice ${invoiceNumber} saved`)
      }
      onSaved()
    } catch (err) {
      console.error(err)
      toast.error("Failed to save invoice")
    } finally {
      setSaving(false)
    }
  }

  const currency = watchedValues.currency

  return (
    <div className="space-y-5">
      {/* Customer */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-4">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Customer</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs text-slate-600">Customer Name <span className="text-red-500">*</span></Label>
            <Input {...register("customer_name")} placeholder="e.g. Sarah Lim" className="h-8" />
            {errors.customer_name && (
              <p className="text-xs text-red-500">{errors.customer_name.message}</p>
            )}
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-slate-600">Email (optional)</Label>
            <Input
              type="email"
              {...register("customer_email")}
              placeholder="customer@email.com"
              className="h-8"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs text-slate-600">Link to Order (Case Code)</Label>
            <Input
              {...register("order_case_code")}
              placeholder="e.g. PP0238"
              className="h-8 font-mono"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-slate-600">Currency</Label>
            <div className="flex gap-2">
              {(["RM", "SGD"] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setValue("currency", c)}
                  className={cn(
                    "flex-1 py-1.5 rounded-lg border text-xs font-semibold transition-all",
                    watchedValues.currency === c
                      ? "bg-slate-800 text-white border-slate-800"
                      : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Invoice type */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Invoice Type</p>
        <div className="flex gap-2 flex-wrap">
          {INVOICE_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setValue("type", t)}
              className={cn(
                "px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all capitalize",
                watchedValues.type === t
                  ? "bg-indigo-500 text-white border-indigo-500"
                  : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300"
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Line items */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Line Items</p>

        {lineItems.map((item, i) => (
          <div key={i} className="grid grid-cols-12 gap-2 items-center">
            <div className="col-span-5">
              <Input
                value={item.description}
                onChange={(e) => updateLineItem(i, "description", e.target.value)}
                placeholder="Description"
                className="h-8 text-xs"
              />
            </div>
            <div className="col-span-2">
              <Input
                type="number"
                min={1}
                value={item.qty}
                onChange={(e) => updateLineItem(i, "qty", parseFloat(e.target.value) || 1)}
                className="h-8 text-xs text-center"
              />
            </div>
            <div className="col-span-3">
              <Input
                type="number"
                min={0}
                value={item.unit_price}
                onChange={(e) => updateLineItem(i, "unit_price", parseFloat(e.target.value) || 0)}
                placeholder="Price"
                className="h-8 text-xs"
              />
            </div>
            <div className="col-span-1 text-xs text-slate-600 font-semibold text-right">
              {item.amount.toLocaleString()}
            </div>
            <div className="col-span-1 flex justify-center">
              {lineItems.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeLineItem(i)}
                  className="text-slate-300 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        ))}

        {/* Column headers */}
        <div className="grid grid-cols-12 gap-2 text-xs text-slate-400">
          <div className="col-span-5">Description</div>
          <div className="col-span-2 text-center">Qty</div>
          <div className="col-span-3">Unit Price</div>
          <div className="col-span-1 text-right">Total</div>
          <div className="col-span-1" />
        </div>

        <button
          type="button"
          onClick={addLineItem}
          className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Add line item
        </button>

        {/* Total */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-200">
          <span className="text-sm font-semibold text-slate-700">Total</span>
          <span className="text-lg font-bold text-slate-900">
            {currency} {(watchedValues.amount || 0).toLocaleString()}
          </span>
        </div>
      </div>

      {/* Mark as sent toggle */}
      <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4">
        <div>
          <p className="text-sm font-medium text-slate-700">Mark as Sent</p>
          <p className="text-xs text-slate-400">Records the timestamp when invoice was sent</p>
        </div>
        <button
          type="button"
          onClick={() => setMarkedSent((v) => !v)}
          className={cn(
            "transition-colors",
            markedSent ? "text-indigo-500" : "text-slate-300"
          )}
        >
          {markedSent ? (
            <ToggleRight className="h-7 w-7" />
          ) : (
            <ToggleLeft className="h-7 w-7" />
          )}
        </button>
      </div>

      {/* Actions */}
      <div className="space-y-2">
        <button
          type="button"
          onClick={handleGeneratePDF}
          disabled={generatingPdf}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 py-2.5 text-sm font-semibold text-indigo-700 hover:bg-indigo-100 transition-all disabled:opacity-50"
        >
          {generatingPdf ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FileText className="h-4 w-4" />
          )}
          Generate Invoice PDF
        </button>

        <button
          type="button"
          onClick={handleSendEmail}
          disabled={sendingEmail || !watchedValues.customer_email}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all disabled:opacity-40"
        >
          {sendingEmail ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Mail className="h-4 w-4 text-slate-500" />
          )}
          Send via Email
          {!watchedValues.customer_email && (
            <span className="text-xs text-slate-400">(enter email above)</span>
          )}
        </button>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-all"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={handleSubmit(handleSave)}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-indigo-500 text-sm font-semibold text-white shadow-sm hover:bg-indigo-600 transition-all disabled:opacity-50"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Save Invoice
          </button>
        </div>
      </div>
    </div>
  )
}
