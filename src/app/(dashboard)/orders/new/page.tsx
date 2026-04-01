"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { ArrowLeft, Save, Loader2 } from "lucide-react"
import { toast } from "sonner"

const LEAD_SOURCES = [
  "Google", "Facebook", "Instagram", "TikTok", "XHS",
  "Referral", "Walk In", "Shopee", "Shopify", "Repeat Customer",
]

const MODES = ["Direct Purchase", "CC Installment", "Rental", "P4B"]
const STATUSES = ["Pending", "Pending Delivered", "Delivered", "Cancelled", "Returned"]
const MARKETS = ["MY", "SG", "ID", "JB"]

export default function NewOrderPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    case_code: "",
    customer_name: "",
    phone: "",
    email: "",
    product_name: "",
    units: 1,
    mode: "Direct Purchase",
    amount: "",
    monthly_rental: "",
    balance: "",
    payment_date: "",
    delivery_date: "",
    location: "",
    address: "",
    status: "Pending",
    lead_source: "",
    market: "MY",
    remarks: "",
  })

  function set(key: string, value: string | number) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.customer_name.trim()) {
      toast.error("Customer name is required")
      return
    }

    setSaving(true)
    try {
      const payload = {
        ...form,
        case_code: form.case_code.trim() || null,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        amount: form.amount ? parseFloat(form.amount) : null,
        monthly_rental: form.monthly_rental ? parseFloat(form.monthly_rental) : null,
        balance: form.balance ? parseFloat(form.balance) : 0,
        payment_date: form.payment_date || null,
        delivery_date: form.delivery_date || null,
        location: form.location.trim() || null,
        address: form.address.trim() || null,
        lead_source: form.lead_source || null,
        remarks: form.remarks.trim() || null,
      }

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed to create order")

      toast.success("Order created")
      router.push("/orders")
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setSaving(false)
    }
  }

  const inputCls = "w-full h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 placeholder:text-slate-400"
  const selectCls = "w-full h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400"
  const labelCls = "block text-xs font-semibold text-slate-600 mb-1"

  return (
    <div className="flex flex-col gap-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <SidebarTrigger className="text-slate-400 hover:text-slate-600 -ml-1" />
        <Link
          href="/orders"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Orders
        </Link>
      </div>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">New Order</h1>
        <p className="text-sm text-slate-500 mt-0.5">Add a new customer order manually.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Customer Info */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-700 border-b border-slate-100 pb-3">Customer Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Customer Name <span className="text-red-500">*</span></label>
              <input className={inputCls} placeholder="e.g. Jane Doe" value={form.customer_name} onChange={(e) => set("customer_name", e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Phone</label>
              <input className={inputCls} placeholder="+60123456789" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Email</label>
              <input className={inputCls} type="email" placeholder="jane@email.com" value={form.email} onChange={(e) => set("email", e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Market</label>
              <select className={selectCls} value={form.market} onChange={(e) => set("market", e.target.value)}>
                {MARKETS.map((m) => <option key={m}>{m}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Order Details */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-700 border-b border-slate-100 pb-3">Order Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Case Code</label>
              <input className={inputCls} placeholder="e.g. PP0001 or PPAS001" value={form.case_code} onChange={(e) => set("case_code", e.target.value.toUpperCase())} />
            </div>
            <div>
              <label className={labelCls}>Lead Source</label>
              <select className={selectCls} value={form.lead_source} onChange={(e) => set("lead_source", e.target.value)}>
                <option value="">Select source...</option>
                {LEAD_SOURCES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Product</label>
              <input className={inputCls} placeholder="e.g. Alu II Reformer (Custom Colour)" value={form.product_name} onChange={(e) => set("product_name", e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Units</label>
              <input className={inputCls} type="number" min={1} value={form.units} onChange={(e) => set("units", parseInt(e.target.value) || 1)} />
            </div>
            <div>
              <label className={labelCls}>Purchase Mode</label>
              <select className={selectCls} value={form.mode} onChange={(e) => set("mode", e.target.value)}>
                {MODES.map((m) => <option key={m}>{m}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Pricing */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-700 border-b border-slate-100 pb-3">Pricing</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>Total Amount (RM)</label>
              <input className={inputCls} type="number" min={0} placeholder="0" value={form.amount} onChange={(e) => set("amount", e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Balance Outstanding (RM)</label>
              <input className={inputCls} type="number" min={0} placeholder="0" value={form.balance} onChange={(e) => set("balance", e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Monthly Rental (RM)</label>
              <input className={inputCls} type="number" min={0} placeholder="Leave blank if not rental" value={form.monthly_rental} onChange={(e) => set("monthly_rental", e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Payment Date</label>
              <input className={inputCls} type="date" value={form.payment_date} onChange={(e) => set("payment_date", e.target.value)} />
            </div>
          </div>
        </div>

        {/* Delivery */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-700 border-b border-slate-100 pb-3">Delivery</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Status</label>
              <select className={selectCls} value={form.status} onChange={(e) => set("status", e.target.value)}>
                {STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Delivery Date</label>
              <input className={inputCls} type="date" value={form.delivery_date} onChange={(e) => set("delivery_date", e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Location / City</label>
              <input className={inputCls} placeholder="e.g. Kuala Lumpur" value={form.location} onChange={(e) => set("location", e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Full Address</label>
              <input className={inputCls} placeholder="Street address" value={form.address} onChange={(e) => set("address", e.target.value)} />
            </div>
          </div>
        </div>

        {/* Remarks */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-700 border-b border-slate-100 pb-3">Notes</h2>
          <div>
            <label className={labelCls}>Remarks</label>
            <textarea
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 placeholder:text-slate-400 resize-none"
              rows={3}
              placeholder="Any notes about this order..."
              value={form.remarks}
              onChange={(e) => set("remarks", e.target.value)}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pb-8">
          <Link
            href="/orders"
            className="inline-flex items-center gap-2 h-9 px-4 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 h-9 px-5 rounded-lg bg-indigo-500 text-sm font-semibold text-white shadow-sm hover:bg-indigo-600 disabled:opacity-60 transition-all active:scale-95"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Order
          </button>
        </div>
      </form>
    </div>
  )
}
