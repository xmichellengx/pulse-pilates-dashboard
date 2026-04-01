"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { ArrowLeft, Copy, Save, Loader2, Check, RefreshCw } from "lucide-react"
import { toast } from "sonner"

// ── Types ──

interface Product {
  id: string
  name: string
  category: string | null
  price_myr: number | null
  price_sgd: number | null
  rental_myr: number | null
  p4b_t1_myr: number | null
  p4b_t2_myr: number | null
}

const LEAD_SOURCES = [
  "Google", "Facebook", "Instagram", "TikTok", "XHS",
  "Referral", "Walk In", "Shopee", "Shopify", "Repeat Customer",
]
const PAYMENT_TYPES = ["Bank Transfer", "Atome", "Credit Card", "Cash", "TNG", "Other"]
const STATUSES = ["Pending", "Pending Delivered", "Delivered", "Cancelled", "Returned"]

// ── WA order form builder ──

function buildWAText(f: typeof EMPTY_FORM, products: Product[]) {
  const product = products.find((p) => p.id === f.product_id)
  const productName = product?.name ?? f.product_name_manual
  const isRental = f.mode === "Rental"
  const currency = f.market === "SG" ? "SGD" : "RM"
  const total = isRental
    ? (Number(f.monthly_rental) || 0) + (Number(f.delivery_fee) || 0) + (Number(f.installation_fee) || 0)
    : (Number(f.amount) || 0)

  if (isRental) {
    return `To confirm your order:
Order no: ${f.case_code}
Units: ${f.units}x ${productName}
Purchase mode: Rental
Payment:
1st month rental: ${currency} ${(f.monthly_rental || 0).toLocaleString()}
Delivery: ${currency} ${(f.delivery_fee || 0).toLocaleString()}
Installation: ${currency} ${(f.installation_fee || 0).toLocaleString()}
Total: ${currency} ${total.toLocaleString()}

Estimated delivery: ${f.delivery_date || "TBC"}
Location: ${f.location}
Address: ${f.address}
Name: ${f.customer_name}
Phone: ${f.phone}
Email: ${f.email}
Lead: ${f.lead_source}

Send to: Sales group, Account group, Outstanding`
  }

  const equipment = (Number(f.amount) || 0) - (Number(f.delivery_fee) || 0) - (Number(f.installation_fee) || 0)

  return `To confirm your order:
Order no: ${f.case_code}
Units: ${f.units}x ${productName}
Purchase mode: ${f.mode}
Payment: ${f.payment_type}
Equipment: ${currency} ${Math.max(0, equipment).toLocaleString()}
Delivery: ${currency} ${(f.delivery_fee || 0).toLocaleString()}
Installation: ${currency} ${(f.installation_fee || 0).toLocaleString()}
Total: ${currency} ${(f.amount || 0).toLocaleString()}

Estimated delivery: ${f.delivery_date || "TBC"}
Location: ${f.location}
Address: ${f.address}
Name: ${f.customer_name}
Phone: ${f.phone}
Email: ${f.email}
Lead: ${f.lead_source}

Send to: Sales group, Account group, Outstanding`
}

// ── Default form state ──

const EMPTY_FORM = {
  case_code: "",
  customer_name: "",
  phone: "",
  email: "",
  product_id: "",
  product_name_manual: "",
  units: 1,
  mode: "Direct Purchase" as string,
  payment_type: "Bank Transfer",
  amount: "" as number | string,
  monthly_rental: "" as number | string,
  balance: "" as number | string,
  delivery_fee: 150 as number | string,
  installation_fee: 0 as number | string,
  delivery_date: "",
  location: "",
  address: "",
  lead_source: "",
  market: "MY" as "MY" | "SG",
  status: "Pending",
  remarks: "",
}

// ── Component ──

export default function NewOrderPage() {
  const router = useRouter()
  const [form, setForm] = useState(EMPTY_FORM)
  const [products, setProducts] = useState<Product[]>([])
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const [loadingCode, setLoadingCode] = useState(false)
  const [nextCodes, setNextCodes] = useState({ nextPP: "PP0001", nextPPAS: "PPAS001" })

  // Load products + next codes on mount
  useEffect(() => {
    fetch("/api/products")
      .then((r) => r.json())
      .then((d) => setProducts(d ?? []))
      .catch(() => {})

    fetchNextCodes()
  }, [])

  async function fetchNextCodes() {
    setLoadingCode(true)
    try {
      const r = await fetch("/api/orders/next-code")
      const d = await r.json()
      setNextCodes(d)
      // Auto-set the case code based on current market
      setForm((prev) => ({
        ...prev,
        case_code: prev.market === "SG" ? d.nextPPAS : d.nextPP,
      }))
    } catch {
      // ignore
    } finally {
      setLoadingCode(false)
    }
  }

  // When market changes, suggest the right code prefix
  const prevMarket = form.market
  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      case_code: prev.market === "SG" ? nextCodes.nextPPAS : nextCodes.nextPP,
      delivery_fee: prev.market === "SG" ? 80 : 150,
    }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.market])

  // Auto-fill price when product + market + mode changes
  useEffect(() => {
    if (!form.product_id) return
    const product = products.find((p) => p.id === form.product_id)
    if (!product) return

    if (form.mode === "Rental") {
      const rental = product.rental_myr ?? 0
      setForm((prev) => ({ ...prev, monthly_rental: rental, amount: "" }))
    } else {
      const price = form.market === "SG" ? (product.price_sgd ?? 0) : (product.price_myr ?? 0)
      const delivery = typeof form.delivery_fee === "number" ? form.delivery_fee : parseFloat(String(form.delivery_fee)) || 0
      const install = typeof form.installation_fee === "number" ? form.installation_fee : parseFloat(String(form.installation_fee)) || 0
      setForm((prev) => ({ ...prev, amount: price * prev.units + delivery + install }))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.product_id, form.mode, form.market])

  function set(key: keyof typeof EMPTY_FORM, value: unknown) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleCopyWA() {
    const text = buildWAText(form, products)
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      toast.success("WhatsApp order form copied!")
      setTimeout(() => setCopied(false), 3000)
    } catch {
      toast.error("Copy failed — please copy manually")
    }
  }

  async function handleSave() {
    if (!form.customer_name.trim()) { toast.error("Customer name required"); return }
    if (!form.case_code.trim()) { toast.error("Case code required"); return }

    setSaving(true)
    try {
      const product = products.find((p) => p.id === form.product_id)
      const payload = {
        case_code: form.case_code.trim().toUpperCase(),
        customer_name: form.customer_name.trim(),
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        product_name: (product?.name ?? form.product_name_manual.trim()) || null,
        units: form.units,
        mode: form.mode,
        payment_type: form.payment_type || null,
        amount: form.amount !== "" ? parseFloat(String(form.amount)) : null,
        monthly_rental: form.monthly_rental !== "" ? parseFloat(String(form.monthly_rental)) : null,
        balance: form.balance !== "" ? parseFloat(String(form.balance)) : 0,
        delivery_date: form.delivery_date || null,
        location: form.location.trim() || null,
        address: form.address.trim() || null,
        lead_source: form.lead_source || null,
        market: form.market,
        status: form.status,
        remarks: form.remarks.trim() || null,
      }

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed to save")

      toast.success(`Order ${form.case_code} saved`)
      router.push("/orders")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setSaving(false)
    }
  }

  const selectedProduct = products.find((p) => p.id === form.product_id)
  const isRental = form.mode === "Rental"
  const currency = form.market === "SG" ? "SGD" : "RM"

  const inputCls = "w-full h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 placeholder:text-slate-400"
  const selectCls = "w-full h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400"
  const labelCls = "block text-xs font-semibold text-slate-600 mb-1"

  // Live WA text preview
  const waText = buildWAText(form, products)

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto">

      {/* Header */}
      <div className="flex items-center gap-3">
        <SidebarTrigger className="text-slate-400 hover:text-slate-600 -ml-1" />
        <Link href="/orders" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
          <ArrowLeft className="h-4 w-4" /> Back to Orders
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">New Order</h1>
          <p className="text-sm text-slate-500 mt-0.5">Fill in details → copy WA form → send to customer → save.</p>
        </div>
        {/* Market toggle */}
        <div className="flex rounded-lg border border-slate-200 overflow-hidden bg-white shadow-sm">
          {(["MY", "SG"] as const).map((m) => (
            <button
              key={m}
              onClick={() => set("market", m)}
              className={`px-5 py-2 text-sm font-semibold transition-all ${
                form.market === m
                  ? "bg-indigo-500 text-white"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* LEFT — Order form */}
        <div className="space-y-4">

          {/* Case Code */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-5">
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <label className={labelCls}>
                  Case Code
                  <span className="ml-1 font-normal text-slate-400">(auto-suggested)</span>
                </label>
                <input
                  className={inputCls + " font-mono font-semibold"}
                  value={form.case_code}
                  onChange={(e) => set("case_code", e.target.value.toUpperCase())}
                  placeholder="e.g. PP0212"
                />
              </div>
              <button
                onClick={fetchNextCodes}
                disabled={loadingCode}
                title="Refresh suggestion"
                className="h-9 w-9 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${loadingCode ? "animate-spin" : ""}`} />
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-1.5">
              Next: <span className="font-mono text-slate-600">{nextCodes.nextPP}</span> (MY) ·{" "}
              <span className="font-mono text-slate-600">{nextCodes.nextPPAS}</span> (PPAS/SG)
            </p>
          </div>

          {/* Customer */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-5 space-y-3">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Customer</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className={labelCls}>Name *</label>
                <input className={inputCls} placeholder="e.g. Sarah Lim" value={form.customer_name} onChange={(e) => set("customer_name", e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Phone *</label>
                <input className={inputCls} placeholder="+60123456789" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Email</label>
                <input className={inputCls} type="email" placeholder="optional" value={form.email} onChange={(e) => set("email", e.target.value)} />
              </div>
            </div>
          </div>

          {/* Product & Mode */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-5 space-y-3">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Product & Mode</h2>

            <div>
              <label className={labelCls}>Product</label>
              <select
                className={selectCls}
                value={form.product_id}
                onChange={(e) => set("product_id", e.target.value)}
              >
                <option value="">Select product...</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              {!form.product_id && (
                <input
                  className={inputCls + " mt-1.5"}
                  placeholder="Or type product name manually..."
                  value={form.product_name_manual}
                  onChange={(e) => set("product_name_manual", e.target.value)}
                />
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Units</label>
                <input
                  className={inputCls}
                  type="number"
                  min={1}
                  value={form.units}
                  onChange={(e) => set("units", parseInt(e.target.value) || 1)}
                />
              </div>
              <div>
                <label className={labelCls}>Lead Source</label>
                <select className={selectCls} value={form.lead_source} onChange={(e) => set("lead_source", e.target.value)}>
                  <option value="">Select...</option>
                  {LEAD_SOURCES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>

            {/* Purchase mode buttons */}
            <div>
              <label className={labelCls}>Purchase Mode</label>
              <div className="flex flex-wrap gap-2">
                {["Direct Purchase", "CC Installment", "Rental"].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => set("mode", m)}
                    className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${
                      form.mode === m
                        ? "bg-indigo-500 text-white border-indigo-500"
                        : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {!isRental && (
              <div>
                <label className={labelCls}>Payment Method</label>
                <select className={selectCls} value={form.payment_type} onChange={(e) => set("payment_type", e.target.value)}>
                  {PAYMENT_TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
            )}
          </div>

          {/* Pricing */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-5 space-y-3">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pricing ({currency})</h2>
            <div className="grid grid-cols-2 gap-3">
              {isRental ? (
                <div className="col-span-2">
                  <label className={labelCls}>Monthly Rental ({currency})</label>
                  <input
                    className={inputCls}
                    type="number"
                    min={0}
                    placeholder={selectedProduct?.rental_myr ? String(selectedProduct.rental_myr) : "e.g. 390"}
                    value={form.monthly_rental}
                    onChange={(e) => set("monthly_rental", e.target.value)}
                  />
                </div>
              ) : (
                <div className="col-span-2">
                  <label className={labelCls}>Total Amount ({currency})</label>
                  <input
                    className={inputCls}
                    type="number"
                    min={0}
                    placeholder="0"
                    value={form.amount}
                    onChange={(e) => set("amount", e.target.value)}
                  />
                </div>
              )}
              <div>
                <label className={labelCls}>Delivery Fee</label>
                <input className={inputCls} type="number" min={0} value={form.delivery_fee} onChange={(e) => set("delivery_fee", e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Installation Fee</label>
                <input className={inputCls} type="number" min={0} value={form.installation_fee} onChange={(e) => set("installation_fee", e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Balance Outstanding</label>
                <input className={inputCls} type="number" min={0} placeholder="0" value={form.balance} onChange={(e) => set("balance", e.target.value)} />
              </div>
            </div>
          </div>

          {/* Delivery */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-5 space-y-3">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Delivery</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Status</label>
                <select className={selectCls} value={form.status} onChange={(e) => set("status", e.target.value)}>
                  {STATUSES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Estimated Delivery Date</label>
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
            <div>
              <label className={labelCls}>Remarks</label>
              <textarea
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none placeholder:text-slate-400"
                rows={2}
                placeholder="Any notes..."
                value={form.remarks}
                onChange={(e) => set("remarks", e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* RIGHT — WA preview + actions */}
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-5 sticky top-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">WhatsApp Order Form</h2>
              <span className="text-xs text-slate-400">Live preview</span>
            </div>

            {/* WA text preview */}
            <pre className="text-xs text-slate-700 bg-slate-50 rounded-lg p-4 whitespace-pre-wrap font-mono leading-relaxed border border-slate-100 min-h-[280px]">
              {waText}
            </pre>

            {/* Primary CTA — Copy WA */}
            <button
              onClick={handleCopyWA}
              className={`mt-4 w-full flex items-center justify-center gap-2 h-11 rounded-lg text-sm font-semibold shadow-sm transition-all active:scale-95 ${
                copied
                  ? "bg-green-500 text-white"
                  : "bg-indigo-500 text-white hover:bg-indigo-600"
              }`}
            >
              {copied ? (
                <><Check className="h-4 w-4" /> Copied! Paste into WhatsApp</>
              ) : (
                <><Copy className="h-4 w-4" /> Copy WhatsApp Order Form</>
              )}
            </button>

            <div className="mt-3 border-t border-slate-100 pt-3 flex items-center gap-2">
              <Link
                href="/orders"
                className="flex-1 flex items-center justify-center h-9 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-all"
              >
                Cancel
              </Link>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 h-9 rounded-lg bg-slate-800 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-60 transition-all active:scale-95"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Order
              </button>
            </div>

            <p className="text-xs text-slate-400 mt-2 text-center">
              Copy WA form first → send to customer → save once confirmed
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}
