"use client"

import React, { useState, useEffect } from "react"
import { useForm, useFieldArray, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import {
  ChevronRight,
  ChevronLeft,
  Plus,
  Trash2,
  Copy,
  FileText,
  Save,
  Check,
  Loader2,
} from "lucide-react"

// ---------- types ----------

export interface Product {
  id: string
  name: string
  category: string | null
  price_myr: number | null
  price_sgd: number | null
  p4b_t1_myr: number | null
  p4b_t2_myr: number | null
  p4b_t1_sgd: number | null
  p4b_t2_sgd: number | null
  rental_myr: number | null
}

interface LineItem {
  product_id: string
  product_name: string
  qty: number
  unit_price: number
  purchase_mode: "direct" | "cc_installment" | "rental"
  custom_colour: boolean
  colour_name: string
  logo_engraving: boolean
  engraving_notes: string
  customisation_surcharge: number
}

// ---------- zod schema ----------

const schema = z.object({
  // step 1
  customer_name: z.string().min(1, "Name required"),
  phone: z.string().min(1, "Phone required"),
  email: z.string().optional(),
  studio_name: z.string().optional(),
  market: z.enum(["MY", "SG"]),
  pricing_tier: z.enum(["retail", "p4b_t2", "p4b_t1"]),
  lead_source: z.string().min(1, "Lead source required"),
  // step 2 — line items handled separately
  // step 3
  delivery_location: z.string().optional(),
  delivery_fee: z.number().min(0),
  installation_fee: z.number().min(0),
  estimated_delivery: z.string().optional(),
  remarks: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

// ---------- helpers ----------

const LEAD_SOURCES = [
  "Google",
  "Facebook",
  "Instagram",
  "TikTok",
  "XHS",
  "Referral",
  "Walk In",
  "Shopee",
  "Shopify",
]

const STEPS = ["Customer", "Products", "Delivery", "Review"]

function getUnitPrice(product: Product, market: "MY" | "SG", tier: string): number {
  if (market === "SG") {
    if (tier === "p4b_t1") return product.p4b_t1_sgd ?? product.price_sgd ?? 0
    if (tier === "p4b_t2") return product.p4b_t2_sgd ?? product.price_sgd ?? 0
    return product.price_sgd ?? 0
  }
  if (tier === "p4b_t1") return product.p4b_t1_myr ?? product.price_myr ?? 0
  if (tier === "p4b_t2") return product.p4b_t2_myr ?? product.price_myr ?? 0
  return product.price_myr ?? 0
}

function defaultDeliveryFee(market: "MY" | "SG"): number {
  return market === "SG" ? 80 : 150
}

function isReformer(productName: string): boolean {
  const lower = productName.toLowerCase()
  return lower.includes("reformer") && !lower.includes("cadillac")
}

function isCadillac(productName: string): boolean {
  return productName.toLowerCase().includes("cadillac")
}

function calcInstallFee(items: LineItem[]): number {
  let fee = 0
  for (const item of items) {
    if (isReformer(item.product_name)) fee += 80 * item.qty
    else if (isCadillac(item.product_name)) fee += 150 * item.qty
  }
  return fee
}

function buildWAText(
  values: FormValues,
  items: LineItem[],
  caseCode: string,
  subtotal: number,
  isRental: boolean
): string {
  const totalEquipment = items.reduce((s, i) => s + i.unit_price * i.qty + i.customisation_surcharge, 0)
  const total = totalEquipment + values.delivery_fee + values.installation_fee
  const currency = values.market === "SG" ? "SGD" : "RM"

  const modeLabel = isRental
    ? "Rental"
    : items[0]?.purchase_mode === "cc_installment"
    ? "CC Installment"
    : "Direct Purchase"

  if (isRental) {
    const monthly = items[0]?.unit_price ?? 0
    return `To confirm your order:
Order no: ${caseCode}
Units: ${items[0]?.qty ?? 1}x ${items[0]?.product_name ?? ""}
Purchase mode: Rental
Payment:
1st month rental: ${currency} ${monthly}
Delivery: ${currency} ${values.delivery_fee}
Installation: ${currency} ${values.installation_fee}
Total: ${currency} ${total}

Estimated delivery: ${values.estimated_delivery ?? "TBC"}
Location: ${values.delivery_location ?? ""}
Address:
Name: ${values.customer_name}
Phone: ${values.phone}
Email: ${values.email ?? ""}
Lead: ${values.lead_source}

Send to: Sales group, Account group, Outstanding`
  }

  const itemsSummary = items
    .map((i) => `${i.qty}x ${i.product_name}`)
    .join(", ")

  return `To confirm your order:
Order no: ${caseCode}
Units: ${itemsSummary}
Purchase mode: ${modeLabel}
Payment:
Equipment: ${currency} ${totalEquipment}
Delivery: ${currency} ${values.delivery_fee}
Installation: ${currency} ${values.installation_fee}
Total: ${currency} ${total}

Estimated delivery: ${values.estimated_delivery ?? "TBC"}
Location: ${values.delivery_location ?? ""}
Address:
Name: ${values.customer_name}
Phone: ${values.phone}
Email: ${values.email ?? ""}
Lead: ${values.lead_source}

Send to: Sales group, Account group`
}

function generateQuotationNumber(): string {
  const now = new Date()
  const date = now.toISOString().slice(0, 10).replace(/-/g, "")
  const rand = Math.floor(Math.random() * 900) + 100
  return `QUO-${date}-${rand}`
}

// ---------- Step indicators ----------

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2 mb-6">
      {STEPS.map((label, i) => (
        <React.Fragment key={label}>
          <div className="flex items-center gap-1.5">
            <div
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold transition-all",
                i < current
                  ? "bg-indigo-500 text-white"
                  : i === current
                  ? "bg-indigo-100 text-indigo-700 ring-2 ring-indigo-500"
                  : "bg-slate-100 text-slate-400"
              )}
            >
              {i < current ? <Check className="h-3 w-3" /> : i + 1}
            </div>
            <span
              className={cn(
                "text-xs font-medium hidden sm:block",
                i === current ? "text-slate-800" : "text-slate-400"
              )}
            >
              {label}
            </span>
          </div>
          {i < total - 1 && (
            <div
              className={cn(
                "h-px flex-1 transition-all",
                i < current ? "bg-indigo-400" : "bg-slate-200"
              )}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  )
}

// ---------- Line Item Row ----------

interface LineItemRowProps {
  item: LineItem
  index: number
  products: Product[]
  market: "MY" | "SG"
  pricingTier: string
  onChange: (index: number, updated: Partial<LineItem>) => void
  onRemove: (index: number) => void
  canRemove: boolean
}

function LineItemRow({
  item,
  index,
  products,
  market,
  pricingTier,
  onChange,
  onRemove,
  canRemove,
}: LineItemRowProps) {
  const currency = market === "SG" ? "SGD" : "RM"
  const selectedProduct = products.find((p) => p.id === item.product_id)
  const canRent = !!selectedProduct?.rental_myr

  const lineSubtotal =
    item.unit_price * item.qty + item.customisation_surcharge

  function handleProductChange(productId: string) {
    const product = products.find((p) => p.id === productId)
    if (!product) return
    const unitPrice = getUnitPrice(product, market, pricingTier)
    onChange(index, {
      product_id: productId,
      product_name: product.name,
      unit_price: unitPrice,
      purchase_mode: "direct",
    })
  }

  function handleModeChange(mode: "direct" | "cc_installment" | "rental") {
    if (mode === "rental" && selectedProduct?.rental_myr) {
      onChange(index, { purchase_mode: mode, unit_price: selectedProduct.rental_myr })
    } else if (selectedProduct) {
      const unitPrice = getUnitPrice(selectedProduct, market, pricingTier)
      onChange(index, { purchase_mode: mode, unit_price: unitPrice })
    }
  }

  function recalcCustomisation(updates: Partial<LineItem>) {
    const colour = updates.custom_colour ?? item.custom_colour
    const logo = updates.logo_engraving ?? item.logo_engraving
    const surcharge = (colour ? 300 : 0) + (logo ? 200 : 0)
    onChange(index, { ...updates, customisation_surcharge: surcharge })
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
          Item {index + 1}
        </span>
        {canRemove && (
          <button
            type="button"
            onClick={() => onRemove(index)}
            className="text-slate-400 hover:text-red-500 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Product selector */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs text-slate-600">Product</Label>
          <select
            value={item.product_id}
            onChange={(e) => handleProductChange(e.target.value)}
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus:border-ring focus:ring-3 focus:ring-ring/50"
          >
            <option value="">Select product...</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-slate-600">Qty</Label>
          <Input
            type="number"
            min={1}
            value={item.qty}
            onChange={(e) => onChange(index, { qty: parseInt(e.target.value) || 1 })}
            className="h-8"
          />
        </div>
      </div>

      {/* Purchase mode */}
      {item.product_id && (
        <div className="space-y-1">
          <Label className="text-xs text-slate-600">Purchase Mode</Label>
          <div className="flex gap-2 flex-wrap">
            {(["direct", "cc_installment"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => handleModeChange(mode)}
                className={cn(
                  "px-3 py-1 rounded-lg text-xs font-medium border transition-all",
                  item.purchase_mode === mode
                    ? "bg-indigo-500 text-white border-indigo-500"
                    : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300"
                )}
              >
                {mode === "direct" ? "Direct Purchase" : "CC Installment"}
              </button>
            ))}
            {canRent && (
              <button
                type="button"
                onClick={() => handleModeChange("rental")}
                className={cn(
                  "px-3 py-1 rounded-lg text-xs font-medium border transition-all",
                  item.purchase_mode === "rental"
                    ? "bg-indigo-500 text-white border-indigo-500"
                    : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300"
                )}
              >
                Rental
              </button>
            )}
          </div>
        </div>
      )}

      {/* Customisation */}
      {item.product_id && item.purchase_mode !== "rental" && (
        <div className="space-y-2">
          <Label className="text-xs text-slate-600">Customisation</Label>
          <div className="space-y-2">
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={item.custom_colour}
                onChange={(e) =>
                  recalcCustomisation({ custom_colour: e.target.checked })
                }
                className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-indigo-500"
              />
              <div>
                <span className="text-sm text-slate-700">
                  Colour customisation{" "}
                  <span className="text-xs text-indigo-600 font-medium">
                    (+RM 300)
                  </span>
                </span>
                {item.custom_colour && (
                  <Input
                    placeholder="Colour name..."
                    value={item.colour_name}
                    onChange={(e) =>
                      onChange(index, { colour_name: e.target.value })
                    }
                    className="mt-1.5 h-7 text-xs"
                  />
                )}
              </div>
            </label>

            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={item.logo_engraving}
                onChange={(e) =>
                  recalcCustomisation({ logo_engraving: e.target.checked })
                }
                className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-indigo-500"
              />
              <div>
                <span className="text-sm text-slate-700">
                  Logo / engraving{" "}
                  <span className="text-xs text-indigo-600 font-medium">
                    (+RM 200)
                  </span>
                </span>
                {item.logo_engraving && (
                  <Input
                    placeholder="Engraving notes..."
                    value={item.engraving_notes}
                    onChange={(e) =>
                      onChange(index, { engraving_notes: e.target.value })
                    }
                    className="mt-1.5 h-7 text-xs"
                  />
                )}
              </div>
            </label>
          </div>
        </div>
      )}

      {/* Line subtotal */}
      {item.product_id && (
        <div className="flex items-center justify-between pt-1 border-t border-slate-200">
          <span className="text-xs text-slate-500">
            {currency} {item.unit_price.toLocaleString()} × {item.qty}
            {item.customisation_surcharge > 0 && (
              <> + {currency} {item.customisation_surcharge} customisation</>
            )}
          </span>
          <span className="text-sm font-semibold text-slate-800">
            {currency} {lineSubtotal.toLocaleString()}
          </span>
        </div>
      )}
    </div>
  )
}

// ---------- Main builder component ----------

interface QuotationBuilderProps {
  products: Product[]
  onClose: () => void
  onSaved: () => void
}

export function QuotationBuilder({ products, onClose, onSaved }: QuotationBuilderProps) {
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [generatingPdf, setGeneratingPdf] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const loadingProducts = false
  const [copied, setCopied] = useState(false)
  const [savedQuotationNumber, setSavedQuotationNumber] = useState("")

  const [lineItems, setLineItems] = useState<LineItem[]>([
    {
      product_id: "",
      product_name: "",
      qty: 1,
      unit_price: 0,
      purchase_mode: "direct",
      custom_colour: false,
      colour_name: "",
      logo_engraving: false,
      engraving_notes: "",
      customisation_surcharge: 0,
    },
  ])

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      market: "MY",
      pricing_tier: "retail",
      lead_source: "",
      delivery_fee: 150,
      installation_fee: 0,
    },
  })

  const market = watch("market")
  const pricingTier = watch("pricing_tier")
  const watchedValues = watch()

  // Update delivery fee when market changes
  useEffect(() => {
    setValue("delivery_fee", defaultDeliveryFee(market))
  }, [market, setValue])

  // Update installation fee when items change
  useEffect(() => {
    const fee = calcInstallFee(lineItems)
    setValue("installation_fee", fee)
  }, [lineItems, setValue])

  // Update unit prices when market/tier changes
  useEffect(() => {
    setLineItems((prev) =>
      prev.map((item) => {
        if (!item.product_id) return item
        const product = products.find((p) => p.id === item.product_id)
        if (!product) return item
        if (item.purchase_mode === "rental") return item
        return { ...item, unit_price: getUnitPrice(product, market, pricingTier) }
      })
    )
  }, [market, pricingTier, products])

  const currency = market === "SG" ? "SGD" : "RM"

  const subtotal = lineItems.reduce(
    (s, i) => s + i.unit_price * i.qty + i.customisation_surcharge,
    0
  )
  const total = subtotal + watchedValues.delivery_fee + watchedValues.installation_fee
  const isRentalMode = lineItems.length === 1 && lineItems[0].purchase_mode === "rental"

  function addItem() {
    setLineItems((prev) => [
      ...prev,
      {
        product_id: "",
        product_name: "",
        qty: 1,
        unit_price: 0,
        purchase_mode: "direct",
        custom_colour: false,
        colour_name: "",
        logo_engraving: false,
        engraving_notes: "",
        customisation_surcharge: 0,
      },
    ])
  }

  function removeItem(index: number) {
    setLineItems((prev) => prev.filter((_, i) => i !== index))
  }

  function updateItem(index: number, updated: Partial<LineItem>) {
    setLineItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...updated } : item))
    )
  }

  async function handleCopyWA() {
    const caseCode = savedQuotationNumber || generateQuotationNumber()
    const text = buildWAText(watchedValues, lineItems, caseCode, subtotal, isRentalMode)
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      toast.success("WhatsApp text copied to clipboard")
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error("Failed to copy")
    }
  }

  async function handleGeneratePDF() {
    setGeneratingPdf(true)
    try {
      const quotationNumber = savedQuotationNumber || generateQuotationNumber()
      const payload = {
        quotation_number: quotationNumber,
        customer_name: watchedValues.customer_name,
        customer_email: watchedValues.email,
        customer_phone: watchedValues.phone,
        studio_name: watchedValues.studio_name,
        market,
        items: lineItems,
        delivery_fee: watchedValues.delivery_fee,
        installation_fee: watchedValues.installation_fee,
        subtotal,
        total,
        estimated_delivery: watchedValues.estimated_delivery,
        delivery_location: watchedValues.delivery_location,
        remarks: watchedValues.remarks,
      }
      const res = await fetch("/api/quotations/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error("PDF generation failed")
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${quotationNumber}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      toast.success("PDF downloaded")
    } catch {
      toast.error("Failed to generate PDF")
    } finally {
      setGeneratingPdf(false)
    }
  }

  async function handleSave(values: FormValues) {
    if (lineItems.every((i) => !i.product_id)) {
      toast.error("Please add at least one product")
      return
    }
    setSaving(true)
    try {
      const quotationNumber = generateQuotationNumber()

      const customisationNotes = lineItems
        .filter((i) => i.custom_colour || i.logo_engraving)
        .map((i) => {
          const parts = []
          if (i.custom_colour) parts.push(`Colour: ${i.colour_name}`)
          if (i.logo_engraving) parts.push(`Engraving: ${i.engraving_notes}`)
          return `${i.product_name} — ${parts.join(", ")}`
        })
        .join("; ")

      const res = await fetch("/api/quotations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quotation_number: quotationNumber,
          created_by: "Michelle",
          customer_name: values.customer_name,
          customer_email: values.email || null,
          customer_phone: values.phone,
          market,
          pricing_tier: values.pricing_tier,
          items: lineItems,
          subtotal,
          delivery_fee: values.delivery_fee,
          installation_fee: values.installation_fee,
          total,
          customisation_notes: customisationNotes || null,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            .toISOString()
            .slice(0, 10),
        }),
      })

      if (!res.ok) {
        const { error } = await res.json()
        throw new Error(error)
      }

      setSavedQuotationNumber(quotationNumber)
      toast.success(`Quotation ${quotationNumber} saved`)
      onSaved()
    } catch (err) {
      console.error(err)
      toast.error("Failed to save quotation")
    } finally {
      setSaving(false)
    }
  }

  function canProceed() {
    if (step === 0) {
      return (
        watchedValues.customer_name &&
        watchedValues.phone &&
        watchedValues.lead_source
      )
    }
    if (step === 1) {
      return lineItems.some((i) => i.product_id)
    }
    return true
  }

  // ---------- Render steps ----------

  return (
    <div className="flex flex-col h-full">
      <StepIndicator current={step} total={STEPS.length} />

      <div className="flex-1 overflow-y-auto">
        {/* Step 0: Customer */}
        {step === 0 && (
          <div className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="customer_name" className="text-sm font-medium text-slate-700">
                Customer Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="customer_name"
                {...register("customer_name")}
                placeholder="e.g. Sarah Lim"
                className="h-9"
              />
              {errors.customer_name && (
                <p className="text-xs text-red-500">{errors.customer_name.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="phone" className="text-sm font-medium text-slate-700">
                Phone <span className="text-red-500">*</span>
              </Label>
              <Input
                id="phone"
                {...register("phone")}
                placeholder="+60123456789"
                className="h-9"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="email" className="text-sm font-medium text-slate-700">
                Email <span className="text-slate-400 font-normal">(optional)</span>
              </Label>
              <Input
                id="email"
                type="email"
                {...register("email")}
                placeholder="customer@email.com"
                className="h-9"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="studio_name" className="text-sm font-medium text-slate-700">
                Studio Name <span className="text-slate-400 font-normal">(optional)</span>
              </Label>
              <Input
                id="studio_name"
                {...register("studio_name")}
                placeholder="e.g. Bliss Pilates Studio"
                className="h-9"
              />
            </div>

            {/* Market toggle */}
            <div className="space-y-1">
              <Label className="text-sm font-medium text-slate-700">Market</Label>
              <Controller
                name="market"
                control={control}
                render={({ field }) => (
                  <div className="flex gap-2">
                    {(["MY", "SG"] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => field.onChange(m)}
                        className={cn(
                          "flex-1 py-2 rounded-lg border text-sm font-semibold transition-all",
                          field.value === m
                            ? "bg-indigo-500 text-white border-indigo-500"
                            : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300"
                        )}
                      >
                        {m === "MY" ? "Malaysia" : "Singapore"}
                      </button>
                    ))}
                  </div>
                )}
              />
            </div>

            {/* Pricing tier */}
            <div className="space-y-1">
              <Label className="text-sm font-medium text-slate-700">Pricing Tier</Label>
              <Controller
                name="pricing_tier"
                control={control}
                render={({ field }) => (
                  <div className="flex gap-2">
                    {(["retail", "p4b_t2", "p4b_t1"] as const).map((tier) => (
                      <button
                        key={tier}
                        type="button"
                        onClick={() => field.onChange(tier)}
                        className={cn(
                          "flex-1 py-1.5 rounded-lg border text-xs font-semibold transition-all",
                          field.value === tier
                            ? "bg-indigo-500 text-white border-indigo-500"
                            : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300"
                        )}
                      >
                        {tier === "retail" ? "Retail" : tier === "p4b_t2" ? "P4B T2" : "P4B T1"}
                      </button>
                    ))}
                  </div>
                )}
              />
            </div>

            {/* Lead source */}
            <div className="space-y-1">
              <Label className="text-sm font-medium text-slate-700">
                Lead Source <span className="text-red-500">*</span>
              </Label>
              <Controller
                name="lead_source"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select source..." />
                    </SelectTrigger>
                    <SelectContent>
                      {LEAD_SOURCES.map((src) => (
                        <SelectItem key={src} value={src}>
                          {src}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>
        )}

        {/* Step 1: Products */}
        {step === 1 && (
          <div className="space-y-4">
            {loadingProducts ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
              </div>
            ) : (
              <>
                {lineItems.map((item, i) => (
                  <LineItemRow
                    key={i}
                    item={item}
                    index={i}
                    products={products}
                    market={market}
                    pricingTier={pricingTier}
                    onChange={updateItem}
                    onRemove={removeItem}
                    canRemove={lineItems.length > 1}
                  />
                ))}

                <button
                  type="button"
                  onClick={addItem}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 py-3 text-sm font-medium text-slate-500 hover:border-indigo-400 hover:text-indigo-600 transition-all"
                >
                  <Plus className="h-4 w-4" />
                  Add another product
                </button>

                {/* Live price summary */}
                {lineItems.some((i) => i.product_id) && (
                  <div className="rounded-lg bg-indigo-50 border border-indigo-100 p-4 space-y-2">
                    <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wide">
                      Price Summary
                    </p>
                    {lineItems
                      .filter((i) => i.product_id)
                      .map((item, i) => (
                        <div key={i} className="flex justify-between text-sm text-slate-700">
                          <span>
                            {item.qty}x {item.product_name}
                            {item.customisation_surcharge > 0 && (
                              <span className="text-xs text-indigo-600 ml-1">
                                +custom
                              </span>
                            )}
                          </span>
                          <span className="font-medium">
                            {currency} {(item.unit_price * item.qty + item.customisation_surcharge).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    <div className="pt-2 border-t border-indigo-200 flex justify-between font-semibold text-slate-800">
                      <span>Equipment subtotal</span>
                      <span>{currency} {subtotal.toLocaleString()}</span>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Step 2: Delivery */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="space-y-1">
              <Label className="text-sm font-medium text-slate-700">Delivery Location</Label>
              <Input
                {...register("delivery_location")}
                placeholder="e.g. Petaling Jaya, Selangor"
                className="h-9"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-sm font-medium text-slate-700">
                  Delivery Fee ({currency})
                </Label>
                <Input
                  type="number"
                  {...register("delivery_fee", { valueAsNumber: true })}
                  className="h-9"
                />
                <p className="text-xs text-slate-400">
                  {market === "MY" ? "KV/Sel: RM150, Outer: RM250" : "SG: SGD 80"}
                </p>
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-medium text-slate-700">
                  Installation Fee ({currency})
                </Label>
                <Input
                  type="number"
                  {...register("installation_fee", { valueAsNumber: true })}
                  className="h-9"
                />
                <p className="text-xs text-slate-400">
                  Auto: RM80/reformer, RM150/cadillac
                </p>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-sm font-medium text-slate-700">Estimated Delivery Date</Label>
              <Input
                type="date"
                {...register("estimated_delivery")}
                className="h-9"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-sm font-medium text-slate-700">Notes / Remarks</Label>
              <Textarea
                {...register("remarks")}
                placeholder="Additional notes..."
                className="resize-none"
                rows={3}
              />
            </div>

            {/* Totals preview */}
            <div className="rounded-lg bg-slate-50 border border-slate-200 p-4 space-y-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Fee Summary
              </p>
              <div className="flex justify-between text-sm text-slate-700">
                <span>Equipment</span>
                <span>{currency} {subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm text-slate-700">
                <span>Delivery</span>
                <span>{currency} {(watchedValues.delivery_fee || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm text-slate-700">
                <span>Installation</span>
                <span>{currency} {(watchedValues.installation_fee || 0).toLocaleString()}</span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-slate-900 text-base">
                <span>Total</span>
                <span>{currency} {total.toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Review */}
        {step === 3 && (
          <div className="space-y-4">
            {/* Customer summary */}
            <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Customer
              </p>
              <div className="text-sm space-y-1">
                <p className="font-semibold text-slate-800">{watchedValues.customer_name}</p>
                <p className="text-slate-600">{watchedValues.phone}</p>
                {watchedValues.email && <p className="text-slate-600">{watchedValues.email}</p>}
                <div className="flex gap-2 mt-1.5">
                  <span className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700 border border-indigo-100">
                    {market}
                  </span>
                  <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                    {pricingTier === "retail" ? "Retail" : pricingTier === "p4b_t2" ? "P4B T2" : "P4B T1"}
                  </span>
                  <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                    {watchedValues.lead_source}
                  </span>
                </div>
              </div>
            </div>

            {/* Items summary */}
            <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Products
              </p>
              {lineItems.filter((i) => i.product_id).map((item, i) => (
                <div key={i} className="flex justify-between text-sm border-b border-slate-100 pb-2 last:border-0 last:pb-0">
                  <div>
                    <p className="font-medium text-slate-800">
                      {item.qty}x {item.product_name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {item.purchase_mode === "rental"
                        ? "Rental"
                        : item.purchase_mode === "cc_installment"
                        ? "CC Installment"
                        : "Direct Purchase"}
                      {item.custom_colour && ` · Colour: ${item.colour_name}`}
                      {item.logo_engraving && ` · Logo/Engraving`}
                    </p>
                  </div>
                  <span className="font-semibold text-slate-800">
                    {currency} {(item.unit_price * item.qty + item.customisation_surcharge).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-4 space-y-2">
              <div className="flex justify-between text-sm text-slate-700">
                <span>Equipment</span>
                <span>{currency} {subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm text-slate-700">
                <span>Delivery</span>
                <span>{currency} {(watchedValues.delivery_fee || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm text-slate-700">
                <span>Installation</span>
                <span>{currency} {(watchedValues.installation_fee || 0).toLocaleString()}</span>
              </div>
              <div className="pt-2 border-t border-indigo-200 flex justify-between font-bold text-indigo-900 text-lg">
                <span>TOTAL</span>
                <span>{currency} {total.toLocaleString()}</span>
              </div>
            </div>

            {/* Delivery info */}
            {watchedValues.delivery_location && (
              <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700 space-y-1">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Delivery</p>
                <p>{watchedValues.delivery_location}</p>
                {watchedValues.estimated_delivery && (
                  <p>ETA: {watchedValues.estimated_delivery}</p>
                )}
                {watchedValues.remarks && (
                  <p className="text-slate-500 text-xs">{watchedValues.remarks}</p>
                )}
              </div>
            )}

            {/* Action buttons */}
            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={handleCopyWA}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-all"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 text-green-500" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copy WhatsApp Text
                  </>
                )}
              </button>

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
                Generate PDF Quotation
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Navigation footer */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-200 mt-4">
        <button
          type="button"
          onClick={step === 0 ? onClose : () => setStep((s) => s - 1)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-all"
        >
          <ChevronLeft className="h-4 w-4" />
          {step === 0 ? "Cancel" : "Back"}
        </button>

        {step < 3 ? (
          <button
            type="button"
            disabled={!canProceed()}
            onClick={() => setStep((s) => s + 1)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-500 text-sm font-semibold text-white shadow-sm hover:bg-indigo-600 transition-all disabled:opacity-40"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            disabled={saving}
            onClick={handleSubmit(handleSave)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-500 text-sm font-semibold text-white shadow-sm hover:bg-indigo-600 transition-all disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save Quotation
          </button>
        )}
      </div>
    </div>
  )
}
