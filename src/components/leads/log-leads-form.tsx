"use client"

import { useState, useTransition, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Plus, Check } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

const EMAIL_TO_NAME: Record<string, string> = {
  "michelleleng.ng@gmail.com": "Michelle",
  "aisypulsepilates@gmail.com": "Aisy",
}

const SOURCES = [
  "Google",
  "Facebook",
  "Instagram",
  "TikTok",
  "XHS",
  "Referral",
  "Shopee",
  "Shopify",
  "Walk In",
  "Repeat Customer",
]

const MARKETS = ["MY", "SG", "ID", "JB"]

export function LogLeadsForm() {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [source, setSource] = useState("Google")
  const [market, setMarket] = useState("MY")
  const [count, setCount] = useState("")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loggedBy, setLoggedBy] = useState("Michelle")
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      const email = data.user?.email ?? ""
      setLoggedBy(EMAIL_TO_NAME[email] ?? email.split("@")[0] ?? "Michelle")
    })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const countNum = parseInt(count, 10)
    if (!countNum || countNum < 1) {
      setError("Please enter a valid count (minimum 1)")
      return
    }

    setLoading(true)
    setError(null)

    const res = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date,
        source,
        market,
        count: countNum,
        logged_by: loggedBy,
      }),
    })

    setLoading(false)

    if (!res.ok) {
      const json = await res.json()
      setError(json.error ?? "Failed to log leads")
      return
    }

    setSuccess(true)
    setCount("")
    setTimeout(() => setSuccess(false), 2500)

    // Refresh server data
    startTransition(() => {
      router.refresh()
    })
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-5">
      <h2 className="text-sm font-semibold text-slate-800 mb-4">Log Today&apos;s Leads</h2>
      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
        {/* Date */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-slate-500">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-9 px-3 text-sm rounded-lg border border-slate-200 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
        </div>

        {/* Source */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-slate-500">Source</label>
          <select
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="h-9 px-3 text-sm rounded-lg border border-slate-200 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          >
            {SOURCES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* Market */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-slate-500">Market</label>
          <select
            value={market}
            onChange={(e) => setMarket(e.target.value)}
            className="h-9 px-3 text-sm rounded-lg border border-slate-200 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          >
            {MARKETS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>

        {/* Count */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-slate-500">Count</label>
          <input
            type="number"
            min="1"
            value={count}
            onChange={(e) => setCount(e.target.value)}
            placeholder="0"
            className="h-9 w-24 px-3 text-sm rounded-lg border border-slate-200 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 placeholder:text-slate-400"
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className={`h-9 px-4 inline-flex items-center gap-2 rounded-lg text-sm font-semibold shadow-sm transition-all ${
            success
              ? "bg-green-500 text-white"
              : "bg-indigo-500 text-white hover:bg-indigo-600 active:scale-95"
          } disabled:opacity-60`}
        >
          {success ? (
            <>
              <Check className="h-4 w-4" />
              Logged!
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" />
              {loading ? "Logging..." : "Log Leads"}
            </>
          )}
        </button>
      </form>

      {error && (
        <p className="mt-2 text-xs text-red-500">{error}</p>
      )}
    </div>
  )
}
