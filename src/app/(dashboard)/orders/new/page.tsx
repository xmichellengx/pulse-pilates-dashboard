"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { ArrowLeft, Copy, Save, Loader2, Check, RefreshCw, Plus, Trash2 } from "lucide-react"
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

interface LineItem {
  product_id: string
  product_name_manual: string
  units: number
  unit_price: number
}

const LEAD_SOURCES = [
  "Google", "Facebook", "Instagram", "TikTok", "XHS",
  "Referral", "Walk In", "Shopee", "Shopify", "Repeat Customer",
]
const PAYMENT_TYPES = ["Bank Transfer", "Atome", "Credit Card", "Cash", "TNG", "Other"]
const STATUSES = ["Pending", "Pending Delivered", "Delivered", "Cancelled", "Returned"]

function emptyLineItem(): LineItem {
  return { product_id: "", product_name_manual: "", units: 1, unit_price: 0 }
}

// ── WA order form builder ──

function buildWAText(f: typeof EMPTY_FORM, lineItems: LineItem[], products: Product[]) {
  const isRental = f.mode === "Rental"
  const currency = f.market === "SG" ? "SGD" : "RM"
  const deliveryFee = parseFloat(String(f.delivery_fee)) || 0
  const installationFee = parseFloat(String(f.installation_fee)) || 0

  const productLines = lineItems
    .map((item) => {
      const p = products.find((x) => x.id === item.product_id)
      const name = (p?.name ?? item.product_name_manual) || "Product"
      return `${item.units}x ${name}`
    })
    .join(", ")

  const totalUnits = lineItems.reduce((s, i) => s + i.units, 0)
  const equipmentTotal = lineItems.reduce((s, i) => s + i.unit_price * i.units, 0)
  const total = equipmentTotal + deliveryFee + installationFee

  if (isRental) {
    const monthly = parseFloat(String(f.monthly_rental)) || 0
    const rentalTotal = monthly + deliveryFee + installationFee
    return `To confirm your order:
Order no: ${f.case_code}
Units: ${productLines}
Purchase mode: Rental
Payment:
1st month rental: ${currency} ${monthly.toLocaleString()}
Delivery: ${currency} ${deliveryFee.toLocaleString()}
Installation: ${currency} ${installationFee.toLocaleString()}
Total: ${currency} ${rentalTotal.toLocaleString()}

Estimated delivery: ${f.delivery_date || "TBC"}
Location: ${f.location}
Address: ${f.address}
Name: ${f.customer_name}
Phone: ${f.phone}
Email: ${f.email}
Lead: ${f.lead_source}

Send to: Sales group, Account group, Outstanding`
  }

  return `To confirm your order:
Order no: ${f.case_code}
Units: ${productLines}
Purchase mode: ${f.mode}
Payment: ${f.payment_type}
Equipment: ${currency} ${equipmentTotal.toLocaleString()}
Delivery: ${currency} ${deliveryFee.toLocaleString()}
Installation: ${currency} ${installationFee.toLocaleString()}
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

// ── Default form state ──

const EMPTY_FORM = {
  case_code: "",
  customer_name: "",
  phone: "",
  email: "",
  mode: "Direct Purchase" as string,
  payment_type: "Bank Transfer",
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
  const [lineItems, setLineItems] = useState<LineItem[]>([emptyLineItem()])
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

  // When market changes, suggest the right code prefix + default delivery fee
  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      case_code: prev.market === "SG" ? nextCodes.nextPPAS : nextCodes.nextPP,
      delivery_fee: prev.market === "SG" ? 80 : 150,
    }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.market])

  function set(key: keyof typeof EMPTY_FORM, value: unknown) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  // ── Line item helpers ──

  function updateLineItem(index: number, patch: Partial<LineItem>) {
    setLineItems((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], ...patch }

      // If product_id changed, auto-fill unit_price
      if ("product_id" in patch && patch.product_id) {
        const p = products.find((x) => x.id === patch.product_id)
        if (p) {
          const price = form.market === "SG" ? (p.price_sgd ?? 0) : (p.price_myr ?? 0)
          next[index].unit_price = price
        }
      }

      return next
    })
  }

  function addLineItem() {
    setLineItems((prev) => [...prev, emptyLineItem()])
  }

  function removeLineItem(index: number) {
    setLineItems((prev) => prev.filter((_, i) => i !== index))
  }

  // ── Totals ──

  const deliveryFee = parseFloat(String(form.delivery_fee)) || 0
  const installationFee = parseFloat(String(form.installation_fee)) || 0
  const equipmentTotal = lineItems.reduce((s, i) => s + i.unit_price * i.units, 0)
  const computedTotal = equipmentTotal + deliveryFee + installationFee
  const isRental = form.mode === "Rental"
  const currency = form.market === "SG" ? "SGD" : "RM"

  async function handleCopyWA() {
    const text = buildWAText(form, lineItems, products)
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
      // Build combined product name and total units
      const productNameParts = lineItems.map((item) => {
        const p = products.find((x) => x.id === item.product_id)
        return (p?.name ?? item.product_name_manual.trim()) || "Product"
      })
      const combinedProductName = productNameParts.filter(Boolean).join(" + ") || null
      const totalUnits = lineItems.reduce((s, i) => s + i.units, 0)

      // Build remarks prefix for multi-item detail
      let remarksValue = form.remarks.trim()
      if (lineItems.length > 1) {
        const itemsStr = lineItems
          .map((item, i) => {
            const p = products.find((x) => x.id === item.product_id)
            const name = (p?.name ?? item.product_name_manual) || "Product"
            return `${name} x${item.units}`
          })
          .join(", ")
        const prefix = `Items: ${itemsStr}.`
        remarksValue = remarksValue ? `${prefix} ${remarksValue}` : prefix
      }

      const payload = {
        case_code: form.case_code.trim().toUpperCase(),
        customer_name: form.customer_name.trim(),
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        product_name: combinedProductName,
        units: totalUnits,
        mode: form.mode,
        payment_type: form.payment_type || null,
        amount: isRental ? null : computedTotal,
        monthly_rental: isRental && form.monthly_rental !== ""
          ? parseFloat(String(form.monthly_rental))
          : null,
        balance: form.balance !== "" ? parseFloat(String(form.balance)) : 0,
        delivery_date: form.delivery_date || null,
        location: form.location.trim() || null,
        address: form.address.trim() || null,
        lead_source: form.lead_source || null,
        market: form.market,
        status: form.status,
        remarks: remarksValue || null,
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

  const inputCls = "w-full h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 placeholder:text-slate-400"
  const selectCls = "w-full h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400"
  const labelCls = "block text-xs font-semibold text-slate-600 mb-1"

  const waText = buildWAText(form, lineItems, products)

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
          <p className="text-sm text-slate-500 mt-0.5">Fill in details &rarr; copy WA form &rarr; send to customer &rarr; save.</p>
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
              Next: <span className="font-mono text-slate-600">{nextCodes.nextPP}</span> (MY) &middot;{" "}
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

          {/* Line Items */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Line Items</h2>
              <button
                type="button"
                onClick={addLineItem}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 text-xs font-medium hover:bg-indigo-100 transition-all"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Item
              </button>
            </div>

            <div className="space-y-3">
              {lineItems.map((item, idx) => (
                <div key={idx} className="rounded-lg border border-slate-100 bg-slate-50 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">Item {idx + 1}</span>
                    {lineItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeLineItem(idx)}
                        className="h-6 w-6 flex items-center justify-center rounded text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  <div>
                    <label className={labelCls}>Product</label>
                    <select
                      className={selectCls}
                      value={item.product_id}
                      onChange={(e) => updateLineItem(idx, { product_id: e.target.value, product_name_manual: "" })}
                    >
                      <option value="">Select product...</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                    {!item.product_id && (
                      <input
                        className={inputCls + " mt-1.5"}
                        placeholder="Or type product name manually..."
                        value={item.product_name_manual}
                        onChange={(e) => updateLineItem(idx, { product_name_manual: e.target.value })}
                      />
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className={labelCls}>Units</label>
                      <input
                        className={inputCls}
                        type="number"
                        min={1}
                        value={item.units}
                        onChange={(e) => updateLineItem(idx, { units: parseInt(e.target.value) || 1 })}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Unit Price ({currency})</label>
                      <input
                        className={inputCls}
                        type="number"
                        min={0}
                        value={item.unit_price}
                        onChange={(e) => updateLineItem(idx, { unit_price: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                  </div>

                  <div className="text-right text-xs text-slate-500">
                    Subtotal:{" "}
                    <span className="font-semibold text-slate-700">
                      {currency} {(item.unit_price * item.units).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Running total */}
            {!isRental && (
              <div className="mt-2 pt-3 border-t border-slate-100 space-y-1 text-sm">
                <div className="flex justify-between text-slate-500">
                  <span>Equipment</span>
                  <span>{currency} {equipmentTotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Delivery</span>
                  <span>{currency} {deliveryFee.toLocaleString()}</span>
                </div>
                {installationFee > 0 && (
                  <div className="flex justify-between text-slate-500">
                    <span>Installation</span>
                    <span>{currency} {installationFee.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-slate-900 pt-1 border-t border-slate-100">
                  <span>Total</span>
                  <span>{currency} {computedTotal.toLocaleString()}</span>
                </div>
              </div>
            )}
          </div>

          {/* Mode & Payment */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-5 space-y-3">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Mode & Payment</h2>

            <div className="grid grid-cols-2 gap-3">
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

            {isRental && (
              <div>
                <label className={labelCls}>Monthly Rental ({currency})</label>
                <input
                  className={inputCls}
                  type="number"
                  min={0}
                  placeholder="e.g. 390"
                  value={form.monthly_rental}
                  onChange={(e) => set("monthly_rental", e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Pricing */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-5 space-y-3">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Fees & Balance ({currency})</h2>
            <div className="grid grid-cols-2 gap-3">
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
              Copy WA form first &rarr; send to customer &rarr; save once confirmed
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}
