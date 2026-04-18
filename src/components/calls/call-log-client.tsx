"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
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
import { formatDate } from "@/lib/utils"
import { cn } from "@/lib/utils"
import { Phone, Loader2, Filter, TrendingUp, Calendar, CheckCircle2, Pencil, Check, X } from "lucide-react"

// ---- types ----

interface Call {
  id: string
  date: string
  agent: string
  customer_name: string | null
  phone: string | null
  outcome: string | null
  notes: string | null
  order_id: string | null
  created_at: string
}

// ---- schema ----

const schema = z.object({
  date: z.string().min(1),
  agent: z.string().min(1),
  customer_name: z.string().optional(),
  phone: z.string().optional(),
  outcome: z.string().min(1, "Select outcome"),
  notes: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

const OUTCOMES = ["Quoted", "Followed Up", "Closed", "No Answer", "Callback", "Lukewarm", "Not Interested", "Sabah/Sarawak", "Class", "Others"]

const OUTCOME_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Closed: { bg: "bg-green-50", text: "text-green-700", border: "border-green-100" },
  Quoted: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-100" },
  "Followed Up": { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-100" },
  "No Answer": { bg: "bg-slate-100", text: "text-slate-600", border: "border-slate-200" },
  Callback: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-100" },
  Lukewarm: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-100" },
  "Not Interested": { bg: "bg-red-50", text: "text-red-600", border: "border-red-100" },
  "Sabah/Sarawak": { bg: "bg-teal-50", text: "text-teal-700", border: "border-teal-100" },
  Class: { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-100" },
  Others: { bg: "bg-slate-100", text: "text-slate-600", border: "border-slate-200" },
}

interface CallLogClientProps {
  initialCalls: Call[]
}

export function CallLogClient({ initialCalls }: CallLogClientProps) {
  const [calls, setCalls] = useState<Call[]>(initialCalls)
  const [submitting, setSubmitting] = useState(false)
  const [filterDate, setFilterDate] = useState("")
  const [filterAgent, setFilterAgent] = useState("all")
  const [editingNotes, setEditingNotes] = useState<string | null>(null) // call id being edited
  const [notesValue, setNotesValue] = useState("")

  async function saveNotes(callId: string) {
    try {
      const res = await fetch("/api/calls", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: callId, notes: notesValue || null }),
      })
      if (!res.ok) throw new Error()
      setCalls((prev) => prev.map((c) => c.id === callId ? { ...c, notes: notesValue || null } : c))
      toast.success("Notes updated")
    } catch {
      toast.error("Failed to update notes")
    } finally {
      setEditingNotes(null)
    }
  }

  const today = new Date().toISOString().slice(0, 10)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      date: today,
      agent: "Aisy",
      outcome: "",
    },
  })

  const watchedOutcome = watch("outcome")

  // ---- stats ----
  const todayCalls = calls.filter((c) => c.date === today)
  const weekStart = new Date()
  weekStart.setDate(weekStart.getDate() - weekStart.getDay())
  const weekCallsCount = calls.filter((c) => new Date(c.date) >= weekStart).length
  const totalClosed = calls.filter((c) => c.outcome === "Closed").length
  const conversionRate = calls.length > 0 ? Math.round((totalClosed / calls.length) * 100) : 0

  // ---- filtered calls ----
  const filteredCalls = calls.filter((c) => {
    if (filterDate && c.date !== filterDate) return false
    if (filterAgent !== "all" && c.agent !== filterAgent) return false
    return true
  })

  const uniqueAgents = [...new Set(calls.map((c) => c.agent).filter(Boolean))]

  // ---- submit ----
  async function onSubmit(values: FormValues) {
    setSubmitting(true)
    try {
      const res = await fetch("/api/calls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: values.date,
          agent: values.agent,
          customer_name: values.customer_name || null,
          phone: values.phone || null,
          outcome: values.outcome,
          notes: values.notes || null,
        }),
      })

      if (!res.ok) {
        const { error } = await res.json()
        throw new Error(error)
      }

      const data = await res.json()
      setCalls((prev) => [data, ...prev])
      reset({ date: today, agent: values.agent, outcome: "" })
      toast.success("Call logged")
    } catch (err) {
      console.error(err)
      toast.error("Failed to log call")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50">
              <Phone className="h-4 w-4 text-indigo-500" />
            </div>
            <span className="text-xs font-medium text-slate-500">Today</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{todayCalls.length}</p>
          <p className="text-xs text-slate-400 mt-0.5">calls logged</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50">
              <Calendar className="h-4 w-4 text-blue-500" />
            </div>
            <span className="text-xs font-medium text-slate-500">This Week</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{weekCallsCount}</p>
          <p className="text-xs text-slate-400 mt-0.5">calls this week</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-50">
              <TrendingUp className="h-4 w-4 text-green-500" />
            </div>
            <span className="text-xs font-medium text-slate-500">Conversion</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{conversionRate}%</p>
          <p className="text-xs text-slate-400 mt-0.5">{totalClosed} closed / {calls.length} total</p>
        </div>
      </div>

      {/* Quick log form */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
          <Phone className="h-4 w-4 text-indigo-500" />
          <span className="text-sm font-semibold text-slate-800">Log a Call</span>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            <div className="space-y-1">
              <Label className="text-xs text-slate-600">Date</Label>
              <Input type="date" {...register("date")} className="h-8" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-600">Agent</Label>
              <Input {...register("agent")} placeholder="Agent name" className="h-8" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-600">Customer Name</Label>
              <Input {...register("customer_name")} placeholder="Name (optional)" className="h-8" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-600">Phone</Label>
              <Input {...register("phone")} placeholder="+601..." className="h-8" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div className="space-y-1">
              <Label className="text-xs text-slate-600">
                Outcome <span className="text-red-500">*</span>
              </Label>
              {/* Outcome pills */}
              <div className="flex flex-wrap gap-1.5">
                {OUTCOMES.map((outcome) => {
                  const colors = OUTCOME_COLORS[outcome]
                  return (
                    <button
                      key={outcome}
                      type="button"
                      onClick={() => setValue("outcome", outcome)}
                      className={cn(
                        "px-2.5 py-1 rounded-md border text-xs font-medium transition-all",
                        watchedOutcome === outcome
                          ? cn(colors.bg, colors.text, colors.border, "ring-2 ring-offset-1",
                              outcome === "Closed" ? "ring-green-400" :
                              outcome === "Quoted" ? "ring-blue-400" :
                              outcome === "Followed Up" ? "ring-amber-400" :
                              outcome === "Callback" ? "ring-purple-400" : "ring-slate-400"
                            )
                          : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
                      )}
                    >
                      {outcome}
                    </button>
                  )
                })}
              </div>
              {errors.outcome && (
                <p className="text-xs text-red-500">{errors.outcome.message}</p>
              )}
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-xs text-slate-600">Notes</Label>
              <Textarea
                {...register("notes")}
                placeholder="Call notes..."
                className="resize-none h-16 text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 h-9 px-6 rounded-lg bg-indigo-500 text-white text-sm font-semibold shadow-sm hover:bg-indigo-600 transition-all disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            Log Call
          </button>
        </form>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <span className="text-sm font-medium text-slate-600">Filter:</span>
        </div>
        <Input
          type="date"
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
          className="h-8 w-40"
        />
        <select
          value={filterAgent}
          onChange={(e) => setFilterAgent(e.target.value)}
          className="h-8 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus:border-ring"
        >
          <option value="all">All agents</option>
          {uniqueAgents.map((agent) => (
            <option key={agent} value={agent}>
              {agent}
            </option>
          ))}
        </select>
        {(filterDate || filterAgent !== "all") && (
          <button
            onClick={() => { setFilterDate(""); setFilterAgent("all") }}
            className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
          >
            Clear filters
          </button>
        )}
        <span className="text-xs text-slate-400 ml-auto">
          {filteredCalls.length} call{filteredCalls.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Calls table */}
      {filteredCalls.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white py-12 text-center">
          <Phone className="h-8 w-8 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-500">No calls logged yet</p>
          <p className="text-xs text-slate-400 mt-1">Use the form above to log your first call</p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Agent</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Customer</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Phone</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Outcome</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">Notes</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Order</th>
                </tr>
              </thead>
              <tbody>
                {filteredCalls.map((call) => {
                  const outcomeColors = OUTCOME_COLORS[call.outcome ?? ""] ?? {
                    bg: "bg-slate-100",
                    text: "text-slate-600",
                    border: "border-slate-200",
                  }
                  return (
                    <tr
                      key={call.id}
                      className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-4 py-3 text-slate-600">{call.date}</td>
                      <td className="px-4 py-3 text-slate-700 hidden sm:table-cell">
                        <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold">
                          {call.agent?.charAt(0) ?? "?"}
                        </span>
                        <span className="ml-2 text-sm">{call.agent}</span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-800">{call.customer_name || "—"}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-500 hidden md:table-cell font-mono text-xs">
                        {call.phone || "—"}
                      </td>
                      <td className="px-4 py-3">
                        {call.outcome && (
                          <span
                            className={cn(
                              "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium border",
                              outcomeColors.bg,
                              outcomeColors.text,
                              outcomeColors.border
                            )}
                          >
                            {call.outcome}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs hidden lg:table-cell max-w-[220px]">
                        {editingNotes === call.id ? (
                          <div className="flex items-center gap-1">
                            <input
                              autoFocus
                              value={notesValue}
                              onChange={(e) => setNotesValue(e.target.value)}
                              onKeyDown={(e) => { if (e.key === "Enter") saveNotes(call.id); if (e.key === "Escape") setEditingNotes(null) }}
                              className="flex-1 min-w-0 rounded border border-indigo-300 px-2 py-0.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                            />
                            <button onClick={() => saveNotes(call.id)} className="text-green-600 hover:text-green-700 flex-shrink-0"><Check className="h-3.5 w-3.5" /></button>
                            <button onClick={() => setEditingNotes(null)} className="text-slate-400 hover:text-slate-600 flex-shrink-0"><X className="h-3.5 w-3.5" /></button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 group">
                            <span className="truncate">{call.notes || <span className="text-slate-300">—</span>}</span>
                            <button
                              onClick={() => { setEditingNotes(call.id); setNotesValue(call.notes ?? "") }}
                              className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-indigo-500 transition-opacity flex-shrink-0"
                            >
                              <Pencil className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        {call.order_id ? (
                          <a
                            href={`/orders/${call.order_id}`}
                            className="text-xs font-medium text-indigo-500 hover:text-indigo-700 transition-colors"
                          >
                            View order
                          </a>
                        ) : (
                          <span className="text-xs text-slate-300">—</span>
                        )}
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
