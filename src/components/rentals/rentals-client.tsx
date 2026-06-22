"use client"

import { useState } from "react"
import Link from "next/link"
import {
  Repeat,
  TrendingUp,
  Bell,
  ArrowUpCircle,
  Copy,
  Check,
  X,
  CalendarClock,
  FileText,
  Upload,
  Eye,
  Trash2,
  Loader2,
  Building2,
  Plus,
} from "lucide-react"
import { toast } from "sonner"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { formatDate } from "@/lib/utils"

export type RentalOrder = {
  id: string
  case_code: string | null
  customer_name: string
  phone: string | null
  email: string | null
  product_name: string | null
  monthly_rental: number | null
  delivery_date: string | null
  status: string | null
  payex_status: string | null
  balance: number | null
  equipment_price: number | null
  is_b2b: boolean
  payex_proof_url: string | null
  customer_id_url: string | null
  leasing_contract_url: string | null
}

interface RentalsClientProps {
  rentals: RentalOrder[]
}

function calcMonthsElapsed(deliveryDate: string | null): number {
  if (!deliveryDate) return 0
  const start = new Date(deliveryDate)
  const now = new Date()
  const diffMs = now.getTime() - start.getTime()
  return diffMs / (1000 * 60 * 60 * 24 * 30)
}

function getFollowUpStatus(months: number): {
  label: string
  color: string
} {
  if (months >= 3.1) return { label: "Overdue", color: "bg-red-100 text-red-700 border-red-200" }
  if (months >= 2.9) return { label: "3M Due", color: "bg-red-50 text-red-600 border-red-100" }
  if (months >= 1.9) return { label: "2M Due", color: "bg-amber-50 text-amber-700 border-amber-100" }
  if (months >= 0.9) return { label: "1M Due", color: "bg-blue-50 text-blue-600 border-blue-100" }
  return { label: "On track", color: "bg-green-50 text-green-700 border-green-100" }
}

function getMonthsBadge(months: number): string {
  if (months > 3) return "bg-red-100 text-red-700 border-red-200"
  if (months === 3 || (months >= 2.9 && months <= 3.1)) return "bg-amber-100 text-amber-700 border-amber-200"
  return "bg-green-100 text-green-700 border-green-200"
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

function getFollowUpTimeline(rentals: RentalOrder[]) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const in30 = addDays(today, 30)

  const upcoming: {
    rental: RentalOrder
    followUpDate: Date
    monthMark: number
    weekGroup: "this_week" | "next_week" | "in_2_weeks" | "in_3_4_weeks"
  }[] = []

  for (const rental of rentals) {
    if (!rental.delivery_date) continue
    const start = new Date(rental.delivery_date)
    start.setHours(0, 0, 0, 0)

    for (const mark of [1, 2, 3]) {
      const followUpDate = new Date(start)
      followUpDate.setDate(followUpDate.getDate() + mark * 30)

      if (followUpDate >= today && followUpDate <= in30) {
        const diffDays = Math.floor((followUpDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        let weekGroup: "this_week" | "next_week" | "in_2_weeks" | "in_3_4_weeks"
        if (diffDays < 7) weekGroup = "this_week"
        else if (diffDays < 14) weekGroup = "next_week"
        else if (diffDays < 21) weekGroup = "in_2_weeks"
        else weekGroup = "in_3_4_weeks"

        upcoming.push({ rental, followUpDate, monthMark: mark, weekGroup })
      }
    }
  }

  upcoming.sort((a, b) => a.followUpDate.getTime() - b.followUpDate.getTime())
  return upcoming
}

function ConversionModal({
  rental,
  onClose,
  onConverted,
}: {
  rental: RentalOrder
  onClose: () => void
  onConverted: (id: string) => void
}) {
  const [copied, setCopied] = useState(false)
  const [converting, setConverting] = useState(false)

  const monthsElapsed = calcMonthsElapsed(rental.delivery_date)
  const rebateMonths = Math.min(Math.floor(monthsElapsed), 2)
  const monthlyRate = rental.monthly_rental ?? 0
  const equipmentPrice = rental.equipment_price ?? 0
  const rentalRebate = rebateMonths * monthlyRate
  const returnTripFee = 0 // No return needed on conversion
  const balanceToPay = equipmentPrice - rentalRebate - returnTripFee

  const waMessage = `${rental.customer_name} Conversion:
Equipment: RM ${equipmentPrice.toLocaleString()}
${rebateMonths} months rental rebate: -RM ${rentalRebate.toLocaleString()}
Balance: RM ${balanceToPay.toLocaleString()}

Please arrange payment and we will process your ownership transfer.`

  async function handleCopyWA() {
    await navigator.clipboard.writeText(waMessage)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleMarkConverted() {
    setConverting(true)
    try {
      const res = await fetch(`/api/orders/${rental.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Delivered", mode: "Conversion" }),
      })
      if (!res.ok) throw new Error("Failed to convert")
      onConverted(rental.id)
      onClose()
    } catch (err) {
      console.error(err)
    } finally {
      setConverting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md mx-4 rounded-2xl bg-white shadow-2xl border border-slate-100">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Convert to Purchase</h2>
            <p className="text-xs text-slate-500 mt-0.5">{rental.customer_name}</p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="rounded-xl bg-slate-50 p-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Product</span>
              <span className="font-medium text-slate-800">{rental.product_name ?? "—"}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Months rented</span>
              <span className="font-medium text-slate-800">{monthsElapsed.toFixed(1)} months</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Rebate months (max 2)</span>
              <span className="font-medium text-slate-800">{rebateMonths}</span>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 p-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Equipment price</span>
              <span className="font-medium text-slate-800">RM {equipmentPrice.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Rental rebate ({rebateMonths} × RM {monthlyRate})</span>
              <span className="font-medium text-emerald-600">- RM {rentalRebate.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Return trip fee</span>
              <span className="font-medium text-slate-500">RM 0 (kept)</span>
            </div>
            <div className="border-t border-slate-100 pt-2 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-800">Balance to pay</span>
              <span className="text-base font-bold text-indigo-600">RM {balanceToPay.toLocaleString()}</span>
            </div>
          </div>

          <div className="rounded-xl bg-slate-900 p-4">
            <p className="text-xs font-medium text-slate-400 mb-2">WhatsApp Message</p>
            <pre className="text-xs text-slate-100 whitespace-pre-wrap font-sans leading-relaxed">{waMessage}</pre>
          </div>
        </div>

        <div className="flex items-center gap-3 px-6 pb-5">
          <button
            onClick={handleCopyWA}
            className="flex flex-1 items-center justify-center gap-2 h-9 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied!" : "Copy WA Message"}
          </button>
          <button
            onClick={handleMarkConverted}
            disabled={converting}
            className="flex flex-1 items-center justify-center gap-2 h-9 rounded-lg bg-indigo-500 text-sm font-semibold text-white hover:bg-indigo-600 transition-colors disabled:opacity-60"
          >
            <Check className="h-4 w-4" />
            {converting ? "Processing…" : "Mark as Converted"}
          </button>
        </div>
      </div>
    </div>
  )
}

function TerminationModal({
  rental,
  onClose,
  onTerminated,
}: {
  rental: RentalOrder
  onClose: () => void
  onTerminated: (id: string) => void
}) {
  const [copied, setCopied] = useState(false)
  const [terminating, setTerminating] = useState(false)

  // Final charge date = next payment cycle (30 days from today)
  const finalChargeDate = new Date()
  finalChargeDate.setDate(finalChargeDate.getDate() + 14) // 2 weeks notice
  const finalChargeDateStr = finalChargeDate.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })

  const waMessage = `Hi ${rental.customer_name}, confirming rental termination for your ${rental.product_name ?? "equipment"}.

Final charge date: ${finalChargeDateStr}
Collection will be arranged after final payment.

Please confirm and we will coordinate with our delivery team.`

  async function handleCopyWA() {
    await navigator.clipboard.writeText(waMessage)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleMarkReturned() {
    setTerminating(true)
    try {
      const res = await fetch(`/api/orders/${rental.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Returned" }),
      })
      if (!res.ok) throw new Error("Failed to terminate")
      onTerminated(rental.id)
      onClose()
    } catch (err) {
      console.error(err)
    } finally {
      setTerminating(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md mx-4 rounded-2xl bg-white shadow-2xl border border-slate-100">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Terminate Rental</h2>
            <p className="text-xs text-slate-500 mt-0.5">{rental.customer_name}</p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="rounded-xl bg-slate-50 p-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Customer</span>
              <span className="font-medium text-slate-800">{rental.customer_name}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Phone</span>
              <span className="font-medium text-slate-800">{rental.phone ?? "—"}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Product</span>
              <span className="font-medium text-slate-800">{rental.product_name ?? "—"}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Monthly rate</span>
              <span className="font-medium text-slate-800">RM {(rental.monthly_rental ?? 0).toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Final charge date</span>
              <span className="font-medium text-amber-700">{finalChargeDateStr}</span>
            </div>
          </div>

          <div className="rounded-xl bg-slate-900 p-4">
            <p className="text-xs font-medium text-slate-400 mb-2">WhatsApp Message</p>
            <pre className="text-xs text-slate-100 whitespace-pre-wrap font-sans leading-relaxed">{waMessage}</pre>
          </div>
        </div>

        <div className="flex items-center gap-3 px-6 pb-5">
          <button
            onClick={handleCopyWA}
            className="flex flex-1 items-center justify-center gap-2 h-9 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied!" : "Copy WA Message"}
          </button>
          <button
            onClick={handleMarkReturned}
            disabled={terminating}
            className="flex flex-1 items-center justify-center gap-2 h-9 rounded-lg bg-red-500 text-sm font-semibold text-white hover:bg-red-600 transition-colors disabled:opacity-60"
          >
            <X className="h-4 w-4" />
            {terminating ? "Processing…" : "Mark as Returned"}
          </button>
        </div>
      </div>
    </div>
  )
}

// Re-encode large images as JPEG bound to MAX_DIMENSION on the longest
// edge before upload. Skip PDFs (no client-side compressor) and HEIC
// (Chrome/Firefox can't decode it; let Supabase store the original so
// Safari users aren't broken).
const MAX_DIMENSION = 1600
const JPEG_QUALITY = 0.82
const COMPRESS_BELOW_BYTES = 200 * 1024 // < ~200KB is already fine

async function compressImageIfNeeded(file: File): Promise<File> {
  if (file.size <= COMPRESS_BELOW_BYTES) return file
  if (!file.type.startsWith("image/")) return file
  if (file.type === "image/heic" || file.type === "image/heif") return file

  const dataUrl: string = await new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result as string)
    r.onerror = () => reject(new Error("read failed"))
    r.readAsDataURL(file)
  })

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image()
    i.onload = () => resolve(i)
    i.onerror = () => reject(new Error("decode failed"))
    i.src = dataUrl
  })

  const longest = Math.max(img.width, img.height)
  const scale = longest > MAX_DIMENSION ? MAX_DIMENSION / longest : 1
  const w = Math.round(img.width * scale)
  const h = Math.round(img.height * scale)

  const canvas = document.createElement("canvas")
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext("2d")
  if (!ctx) return file
  ctx.drawImage(img, 0, 0, w, h)

  const blob: Blob | null = await new Promise((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY)
  )
  if (!blob || blob.size >= file.size) return file

  const baseName = file.name.replace(/\.[^.]+$/, "")
  return new File([blob], `${baseName}.jpg`, { type: "image/jpeg" })
}

type DocType = "payex_proof" | "customer_id" | "leasing_contract"

const DOC_FIELD: Record<DocType, "payex_proof_url" | "customer_id_url" | "leasing_contract_url"> = {
  payex_proof: "payex_proof_url",
  customer_id: "customer_id_url",
  leasing_contract: "leasing_contract_url",
}

const DOC_LABEL: Record<DocType, string> = {
  payex_proof: "PayEx setup screenshot",
  customer_id: "Customer IC / Passport",
  leasing_contract: "Leasing contract",
}

const DOC_ACCEPT: Record<DocType, string> = {
  payex_proof: "image/png,image/jpeg,image/webp,image/heic",
  customer_id: "image/png,image/jpeg,image/webp,image/heic,application/pdf",
  leasing_contract: "application/pdf,image/png,image/jpeg,image/webp",
}

function DocumentsModal({
  rental,
  onClose,
  onUpdated,
}: {
  rental: RentalOrder
  onClose: () => void
  onUpdated: (rental: RentalOrder) => void
}) {
  const [current, setCurrent] = useState<RentalOrder>(rental)
  const [busy, setBusy] = useState<DocType | "b2b" | null>(null)

  async function handleUpload(type: DocType, rawFile: File) {
    setBusy(type)
    try {
      const file = await compressImageIfNeeded(rawFile).catch(() => rawFile)
      const fd = new FormData()
      fd.append("type", type)
      fd.append("file", file)
      const res = await fetch(`/api/orders/${current.id}/documents`, {
        method: "POST",
        body: fd,
      })
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: "Upload failed" }))
        throw new Error(error || "Upload failed")
      }
      const { path } = await res.json()
      const next = { ...current, [DOC_FIELD[type]]: path } as RentalOrder
      setCurrent(next)
      onUpdated(next)
      toast.success(`${DOC_LABEL[type]} uploaded`)
    } catch (err) {
      console.error(err)
      toast.error(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setBusy(null)
    }
  }

  async function handleView(type: DocType) {
    setBusy(type)
    try {
      const res = await fetch(`/api/orders/${current.id}/documents?type=${type}`)
      if (!res.ok) throw new Error("Failed to load file")
      const { url } = await res.json()
      window.open(url, "_blank", "noopener,noreferrer")
    } catch (err) {
      console.error(err)
      toast.error(err instanceof Error ? err.message : "Failed to load file")
    } finally {
      setBusy(null)
    }
  }

  async function handleDelete(type: DocType) {
    if (!confirm(`Delete the ${DOC_LABEL[type].toLowerCase()}?`)) return
    setBusy(type)
    try {
      const res = await fetch(`/api/orders/${current.id}/documents?type=${type}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error("Delete failed")
      const next = { ...current, [DOC_FIELD[type]]: null } as RentalOrder
      setCurrent(next)
      onUpdated(next)
      toast.success(`${DOC_LABEL[type]} removed`)
    } catch (err) {
      console.error(err)
      toast.error(err instanceof Error ? err.message : "Delete failed")
    } finally {
      setBusy(null)
    }
  }

  async function handleToggleB2B(next: boolean) {
    setBusy("b2b")
    const previous = current.is_b2b
    setCurrent({ ...current, is_b2b: next })
    try {
      const res = await fetch(`/api/orders/${current.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_b2b: next }),
      })
      if (!res.ok) throw new Error("Update failed")
      const updated = { ...current, is_b2b: next }
      onUpdated(updated)
    } catch (err) {
      console.error(err)
      setCurrent({ ...current, is_b2b: previous })
      toast.error(err instanceof Error ? err.message : "Update failed")
    } finally {
      setBusy(null)
    }
  }

  const slots: DocType[] = current.is_b2b
    ? ["payex_proof", "customer_id", "leasing_contract"]
    : ["payex_proof", "customer_id"]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-lg mx-4 rounded-2xl bg-white shadow-2xl border border-slate-100">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Rental documents</h2>
            <p className="text-xs text-slate-500 mt-0.5">{current.customer_name}</p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <label className="flex items-center gap-2.5 rounded-xl bg-slate-50 px-4 py-3 cursor-pointer">
            <input
              type="checkbox"
              checked={current.is_b2b}
              onChange={(e) => handleToggleB2B(e.target.checked)}
              disabled={busy === "b2b"}
              className="h-4 w-4 rounded border-slate-300 text-indigo-500 focus:ring-indigo-400"
            />
            <Building2 className="h-4 w-4 text-slate-500" />
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-800">B2B rental</p>
              <p className="text-xs text-slate-500">Show leasing-contract slot for business customers.</p>
            </div>
            {busy === "b2b" && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
          </label>

          {slots.map((type) => {
            const path = current[DOC_FIELD[type]]
            const isBusy = busy === type
            const inputId = `doc-${type}-${current.id}`
            return (
              <div key={type} className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="h-4 w-4 text-indigo-500" />
                  <span className="text-sm font-semibold text-slate-800">{DOC_LABEL[type]}</span>
                  {path && (
                    <span className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                      <Check className="h-3 w-3" />
                      Uploaded
                    </span>
                  )}
                </div>

                {path ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleView(type)}
                      disabled={isBusy}
                      className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-60"
                    >
                      {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />}
                      View
                    </button>
                    <label
                      htmlFor={inputId}
                      className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      Replace
                    </label>
                    <input
                      id={inputId}
                      type="file"
                      accept={DOC_ACCEPT[type]}
                      onChange={(e) => {
                        const f = e.target.files?.[0]
                        if (f) handleUpload(type, f)
                        e.target.value = ""
                      }}
                      disabled={isBusy}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => handleDelete(type)}
                      disabled={isBusy}
                      className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 transition-colors ml-auto disabled:opacity-60"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Remove
                    </button>
                  </div>
                ) : (
                  <label
                    htmlFor={inputId}
                    className="flex items-center justify-center gap-2 h-9 rounded-lg border border-dashed border-slate-300 text-xs font-medium text-slate-600 hover:border-indigo-300 hover:text-indigo-600 transition-colors cursor-pointer"
                  >
                    {isBusy ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Upload className="h-3.5 w-3.5" />
                    )}
                    {isBusy ? "Uploading…" : "Upload file"}
                    <input
                      id={inputId}
                      type="file"
                      accept={DOC_ACCEPT[type]}
                      onChange={(e) => {
                        const f = e.target.files?.[0]
                        if (f) handleUpload(type, f)
                        e.target.value = ""
                      }}
                      disabled={isBusy}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            )
          })}

          <p className="text-xs text-slate-400 text-center">Max 10MB · JPG, PNG, WEBP, HEIC, PDF</p>
        </div>
      </div>
    </div>
  )
}

export function RentalsClient({ rentals: initialRentals }: RentalsClientProps) {
  const [rentals, setRentals] = useState<RentalOrder[]>(initialRentals)
  const [conversionTarget, setConversionTarget] = useState<RentalOrder | null>(null)
  const [terminationTarget, setTerminationTarget] = useState<RentalOrder | null>(null)
  const [documentsTarget, setDocumentsTarget] = useState<RentalOrder | null>(null)

  function handleConverted(id: string) {
    setRentals((prev) => prev.filter((r) => r.id !== id))
  }

  function handleTerminated(id: string) {
    setRentals((prev) => prev.filter((r) => r.id !== id))
  }

  function handleRentalUpdated(updated: RentalOrder) {
    setRentals((prev) => prev.map((r) => (r.id === updated.id ? updated : r)))
  }

  // Stats calculations
  const totalActive = rentals.length
  const mrr = rentals.reduce((sum, r) => sum + (r.monthly_rental ?? 0), 0)

  const followUpsDueThisWeek = rentals.filter((r) => {
    const months = calcMonthsElapsed(r.delivery_date)
    const fractional = months % 1
    // Within ±7 days of a month mark (roughly fractional near 0 or 1)
    const daysToMark = Math.min(fractional, 1 - fractional) * 30
    return (
      [1, 2, 3].some((mark) => {
        if (Math.floor(months) + 1 === mark || Math.ceil(months) === mark) {
          return daysToMark <= 7
        }
        return false
      }) || ([1, 2, 3].includes(Math.round(months)) && daysToMark <= 7)
    )
  }).length

  // Simpler: check against the timeline items due this week
  const timelineItems = getFollowUpTimeline(rentals)
  const followUpsThisWeek = timelineItems.filter((t) => t.weekGroup === "this_week").length

  const pastMonth3 = rentals.filter((r) => calcMonthsElapsed(r.delivery_date) >= 3).length

  const groupedTimeline = {
    this_week: timelineItems.filter((t) => t.weekGroup === "this_week"),
    next_week: timelineItems.filter((t) => t.weekGroup === "next_week"),
    in_2_weeks: timelineItems.filter((t) => t.weekGroup === "in_2_weeks"),
    in_3_4_weeks: timelineItems.filter((t) => t.weekGroup === "in_3_4_weeks"),
  }

  const weekGroupLabels: Record<string, string> = {
    this_week: "This week",
    next_week: "Next week",
    in_2_weeks: "In 2 weeks",
    in_3_4_weeks: "In 3–4 weeks",
  }

  return (
    <>
      {conversionTarget && (
        <ConversionModal
          rental={conversionTarget}
          onClose={() => setConversionTarget(null)}
          onConverted={handleConverted}
        />
      )}
      {terminationTarget && (
        <TerminationModal
          rental={terminationTarget}
          onClose={() => setTerminationTarget(null)}
          onTerminated={handleTerminated}
        />
      )}
      {documentsTarget && (
        <DocumentsModal
          rental={documentsTarget}
          onClose={() => setDocumentsTarget(null)}
          onUpdated={(r) => {
            handleRentalUpdated(r)
            setDocumentsTarget(r)
          }}
        />
      )}

      {/* Page header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <SidebarTrigger className="text-slate-400 hover:text-slate-600 mt-0.5 -ml-1" />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Rental Management</h1>
            <p className="text-sm text-slate-500 mt-0.5">Track active rentals, follow-ups, and conversion opportunities.</p>
          </div>
        </div>
        <Link
          href="/orders/new?mode=Rental"
          className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-indigo-500 text-white text-sm font-semibold shadow-sm hover:bg-indigo-600 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Rental
        </Link>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <Repeat className="h-4 w-4 text-indigo-500" />
            <span className="text-xs font-medium text-slate-500">Active Rentals</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{totalActive}</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-4 w-4 text-emerald-500" />
            <span className="text-xs font-medium text-slate-500">Monthly Recurring</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">RM {mrr.toLocaleString()}</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <Bell className="h-4 w-4 text-amber-500" />
            <span className="text-xs font-medium text-slate-500">Follow-ups This Week</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{followUpsThisWeek}</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <ArrowUpCircle className="h-4 w-4 text-rose-500" />
            <span className="text-xs font-medium text-slate-500">Past 3 Months</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{pastMonth3}</p>
        </div>
      </div>

      {/* Active rentals table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden mb-6">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-800">Active Rentals</span>
          <span className="inline-flex items-center justify-center rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700 border border-indigo-100">
            {totalActive}
          </span>
        </div>

        {rentals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Repeat className="h-8 w-8 text-slate-300 mb-3" />
            <p className="text-sm font-medium text-slate-600">No active rentals</p>
            <p className="text-xs text-slate-400 mt-1">Active rental orders will appear here</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Product</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Rate/mo</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Started</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">Months</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Payex</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Balance</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">Follow-up</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rentals.map((rental) => {
                  const months = calcMonthsElapsed(rental.delivery_date)
                  const monthsDisplay = months.toFixed(1)
                  const monthsBadgeColor = getMonthsBadge(months)
                  const followUp = getFollowUpStatus(months)
                  const hasBalance = (rental.balance ?? 0) > 0

                  return (
                    <tr key={rental.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5 leading-tight">
                          <span className="font-semibold text-slate-800">{rental.customer_name}</span>
                          {rental.is_b2b && (
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-violet-50 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700 border border-violet-100">
                              <Building2 className="h-2.5 w-2.5" />
                              B2B
                            </span>
                          )}
                        </div>
                        {rental.phone && (
                          <div className="text-xs text-slate-400 mt-0.5">{rental.phone}</div>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-slate-700">{rental.product_name ?? "—"}</span>
                      </td>
                      <td className="px-4 py-3.5 text-right font-medium text-slate-800">
                        RM {(rental.monthly_rental ?? 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3.5 text-slate-500 text-xs">
                        {rental.delivery_date ? formatDate(rental.delivery_date) : "—"}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className={`inline-flex items-center justify-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${monthsBadgeColor}`}>
                          {monthsDisplay}m
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-xs text-slate-500">{rental.payex_status ?? "—"}</span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        {hasBalance ? (
                          <span className="text-sm font-semibold text-red-600">
                            RM {(rental.balance ?? 0).toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className={`inline-flex items-center justify-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${followUp.color}`}>
                          {followUp.label}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-end gap-1.5">
                          {(() => {
                            const required: Array<keyof RentalOrder> = rental.is_b2b
                              ? ["payex_proof_url", "customer_id_url", "leasing_contract_url"]
                              : ["payex_proof_url", "customer_id_url"]
                            const filled = required.filter((k) => rental[k]).length
                            const complete = filled === required.length
                            return (
                              <button
                                onClick={() => setDocumentsTarget(rental)}
                                className={`inline-flex items-center gap-1 h-7 px-2.5 rounded-md text-xs font-medium transition-colors border ${
                                  complete
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100"
                                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                                }`}
                                title={`${filled} of ${required.length} documents uploaded`}
                              >
                                <FileText className="h-3 w-3" />
                                Docs {filled}/{required.length}
                              </button>
                            )
                          })()}
                          <button
                            onClick={() => setConversionTarget(rental)}
                            className="inline-flex items-center h-7 px-2.5 rounded-md bg-indigo-50 text-indigo-700 text-xs font-medium hover:bg-indigo-100 transition-colors border border-indigo-100"
                          >
                            Convert
                          </button>
                          <button
                            onClick={() => setTerminationTarget(rental)}
                            className="inline-flex items-center h-7 px-2.5 rounded-md bg-red-50 text-red-700 text-xs font-medium hover:bg-red-100 transition-colors border border-red-100"
                          >
                            Terminate
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Follow-up timeline */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-indigo-500" />
          <span className="text-sm font-semibold text-slate-800">30-Day Follow-up Timeline</span>
        </div>

        {timelineItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <CalendarClock className="h-7 w-7 text-slate-300 mb-3" />
            <p className="text-sm font-medium text-slate-600">No follow-ups in the next 30 days</p>
          </div>
        ) : (
          <div className="px-5 py-4 space-y-5">
            {(["this_week", "next_week", "in_2_weeks", "in_3_4_weeks"] as const).map((group) => {
              const items = groupedTimeline[group]
              if (items.length === 0) return null
              return (
                <div key={group}>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                    {weekGroupLabels[group]}
                  </p>
                  <div className="space-y-2">
                    {items.map((item, idx) => (
                      <div
                        key={`${item.rental.id}-${item.monthMark}-${idx}`}
                        className="flex items-center justify-between rounded-lg bg-slate-50 border border-slate-100 px-4 py-3"
                      >
                        <div>
                          <span className="text-sm font-semibold text-slate-800">{item.rental.customer_name}</span>
                          <span className="text-xs text-slate-500 ml-2">{item.rental.product_name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center rounded-full border border-blue-100 bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                            Month {item.monthMark} follow-up due
                          </span>
                          <span className="text-xs text-slate-400">
                            {item.followUpDate.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
