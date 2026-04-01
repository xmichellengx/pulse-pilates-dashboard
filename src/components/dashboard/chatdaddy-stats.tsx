"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface ChatdaddyStats {
  incomingToday: number
  unreadTotal: number
  activeChatsToday: number
  lastUpdated: string
}

const REFRESH_INTERVAL_MS = 5 * 60 * 1000 // 5 minutes

// WhatsApp-style green icon as an inline SVG
function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  )
}

export function ChatdaddyStats() {
  const [stats, setStats] = useState<ChatdaddyStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  async function fetchStats() {
    try {
      const res = await fetch("/api/chatdaddy/stats")
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: ChatdaddyStats = await res.json()
      setStats(data)
      setError(false)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
    const interval = setInterval(fetchStats, REFRESH_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [])

  const displayValue = loading ? "..." : error ? "—" : String(stats?.incomingToday ?? 0)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Messages Today</CardTitle>
        <WhatsAppIcon className="h-4 w-4 text-green-500" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{displayValue}</div>
        <p className="text-xs text-muted-foreground mt-1">
          {error
            ? "Could not load data"
            : stats
            ? `${stats.unreadTotal} unread · ${stats.activeChatsToday} active today`
            : "Loading WhatsApp stats…"}
        </p>
        <div className="mt-2 flex items-center gap-2">
          <Badge
            variant="secondary"
            className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
          >
            Live
          </Badge>
          {stats && (
            <span className="text-xs text-muted-foreground">
              Updated {new Date(stats.lastUpdated).toLocaleTimeString("en-MY", { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
