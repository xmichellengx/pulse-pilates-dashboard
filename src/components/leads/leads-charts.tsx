"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from "recharts"

interface LeadEntry {
  id: string
  date: string
  source: string
  market: string
  count: number
  logged_by: string | null
  created_at: string
}

interface LeadsChartsProps {
  entries: LeadEntry[]
}

const SOURCE_COLORS: Record<string, string> = {
  Google: "#4f46e5",
  Facebook: "#3b82f6",
  Instagram: "#ec4899",
  TikTok: "#6366f1",
  XHS: "#ef4444",
  Referral: "#f59e0b",
  Shopee: "#f97316",
  Shopify: "#10b981",
  "Walk In": "#8b5cf6",
  "Repeat Customer": "#06b6d4",
}

const DEFAULT_COLOR = "#94a3b8"

function getColor(source: string) {
  return SOURCE_COLORS[source] ?? DEFAULT_COLOR
}

// Build daily bar chart data for last 30 days
function buildDailyData(entries: LeadEntry[]) {
  const today = new Date()
  const days: Record<string, Record<string, number>> = {}

  // Last 14 days
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const key = d.toISOString().split("T")[0]
    days[key] = {}
  }

  for (const e of entries) {
    if (days[e.date] !== undefined) {
      days[e.date][e.source] = (days[e.date][e.source] ?? 0) + e.count
    }
  }

  return Object.entries(days).map(([date, sources]) => ({
    date: new Date(date).toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
    ...sources,
  }))
}

// Build donut data
function buildPieData(entries: LeadEntry[]) {
  const totals: Record<string, number> = {}
  for (const e of entries) {
    totals[e.source] = (totals[e.source] ?? 0) + e.count
  }
  return Object.entries(totals)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name, value }))
}

function getAllSources(entries: LeadEntry[]) {
  return [...new Set(entries.map((e) => e.source))]
}

export function LeadsCharts({ entries }: LeadsChartsProps) {
  const dailyData = buildDailyData(entries)
  const pieData = buildPieData(entries)
  const allSources = getAllSources(entries)

  const totalLeads = entries.reduce((sum, e) => sum + e.count, 0)

  if (entries.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-8 text-center">
        <p className="text-slate-400 text-sm">No lead entries logged yet. Use the form above to start tracking.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Bar chart — 2/3 width */}
      <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white shadow-sm p-5">
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-slate-800">Daily Leads — Last 14 Days</h3>
          <p className="text-xs text-slate-400 mt-0.5">Stacked by source</p>
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={dailyData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: "#94a3b8" }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#94a3b8" }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
                fontSize: "12px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: "11px", paddingTop: "12px" }}
              iconType="circle"
              iconSize={8}
            />
            {allSources.map((source) => (
              <Bar
                key={source}
                dataKey={source}
                stackId="a"
                fill={getColor(source)}
                radius={[0, 0, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Donut chart — 1/3 width */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-5">
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-slate-800">Source Distribution</h3>
          <p className="text-xs text-slate-400 mt-0.5">All time totals</p>
        </div>
        <ResponsiveContainer width="100%" height={160}>
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={45}
              outerRadius={70}
              paddingAngle={2}
              dataKey="value"
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getColor(entry.name)} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
                fontSize: "12px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
              }}
              formatter={(value, name) => [
                `${Number(value)} leads (${((Number(value) / totalLeads) * 100).toFixed(0)}%)`,
                String(name),
              ]}
            />
          </PieChart>
        </ResponsiveContainer>

        {/* Legend */}
        <div className="mt-3 space-y-1.5">
          {pieData.slice(0, 6).map(({ name, value }) => (
            <div key={name} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <span
                  className="h-2 w-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: getColor(name) }}
                />
                <span className="text-slate-600">{name}</span>
              </div>
              <span className="font-semibold text-slate-700">
                {value} <span className="text-slate-400 font-normal">({((value / totalLeads) * 100).toFixed(0)}%)</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
