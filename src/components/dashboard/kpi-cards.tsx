import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, ShoppingCart, Repeat, Users } from "lucide-react"
import { formatCurrency } from "@/lib/utils"

interface KpiCardProps {
  title: string
  value: string
  change?: string
  changeType?: "positive" | "negative" | "neutral"
  icon: React.ReactNode
  description?: string
}

function KpiCard({ title, value, change, changeType = "neutral", icon, description }: KpiCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className="text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
        {change && (
          <Badge
            variant="secondary"
            className={`mt-2 text-xs ${
              changeType === "positive"
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                : changeType === "negative"
                ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {change}
          </Badge>
        )}
      </CardContent>
    </Card>
  )
}

export function KpiCards() {
  // Mock data — will be wired to Supabase in Phase 2
  const kpis = [
    {
      title: "Revenue MTD",
      value: formatCurrency(127500),
      change: "+12% vs last month",
      changeType: "positive" as const,
      icon: <TrendingUp className="h-4 w-4" />,
      description: "April 2026",
    },
    {
      title: "Orders MTD",
      value: "23",
      change: "+4 vs last month",
      changeType: "positive" as const,
      icon: <ShoppingCart className="h-4 w-4" />,
      description: "April 2026",
    },
    {
      title: "Active Rentals",
      value: "18",
      change: "3 due for follow-up",
      changeType: "neutral" as const,
      icon: <Repeat className="h-4 w-4" />,
      description: "Month 3 conversions pending",
    },
    {
      title: "Leads Today",
      value: "14",
      change: "+2 vs yesterday",
      changeType: "positive" as const,
      icon: <Users className="h-4 w-4" />,
      description: "Google: 8, FB: 3, Others: 3",
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {kpis.map((kpi) => (
        <KpiCard key={kpi.title} {...kpi} />
      ))}
    </div>
  )
}
