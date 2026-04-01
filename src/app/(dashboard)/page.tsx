import Link from "next/link"
import { KpiCards } from "@/components/dashboard/kpi-cards"
import { ChatdaddyStats } from "@/components/dashboard/chatdaddy-stats"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Header } from "@/components/layout/header"
import { FileText, Phone, ShoppingCart, AlertCircle, Clock, Wallet } from "lucide-react"

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return "Good morning"
  if (hour < 17) return "Good afternoon"
  return "Good evening"
}

// Mock data — will be replaced with Supabase queries in Phase 2
const pendingDeliveries = [
  { caseCode: "PP0238", customer: "Sarah Lim", product: "Alu II Reformer", deliveryDate: "3 Apr 2026", location: "Petaling Jaya" },
  { caseCode: "PP0239", customer: "Jason Tan", product: "Classic Reformer", deliveryDate: "5 Apr 2026", location: "Shah Alam" },
  { caseCode: "PPAS065", customer: "Studio Flex KL", product: "Alu II Tower x2", deliveryDate: "7 Apr 2026", location: "KLCC" },
]

const rentalFollowUps = [
  { caseCode: "PP0201", customer: "Mei Ling", product: "Alu II Reformer", month: 3, monthlyRate: 390, rentalStart: "Jan 2026" },
  { caseCode: "PP0198", customer: "David Wong", product: "Alu II Foldable", month: 2, monthlyRate: 450, rentalStart: "Feb 2026" },
  { caseCode: "PP0205", customer: "Priya K", product: "Alu II Tower", month: 3, monthlyRate: 590, rentalStart: "Jan 2026" },
]

const outstandingBalances = [
  { caseCode: "PP0230", customer: "Ahmad Razif", balance: 1200, product: "Classic Reformer", dueDate: "15 Mar 2026" },
  { caseCode: "PPAS-SG042", customer: "Joanne Ng", balance: 950, product: "Alu II Reformer", dueDate: "20 Mar 2026" },
]

export default function DashboardPage() {
  const greeting = getGreeting()

  return (
    <div className="flex flex-col gap-6">
      <Header />

      <div className="px-6 pb-6 space-y-6">
        {/* Greeting */}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {greeting}, Michelle
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Here&apos;s what&apos;s happening with Pulse Pilates today.
          </p>
        </div>

        {/* KPI Cards */}
        <div className="space-y-4">
          <KpiCards />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <ChatdaddyStats />
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-sm font-medium text-muted-foreground mb-3">Quick Actions</h2>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/quotations"
              className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium transition-all hover:bg-primary/80"
            >
              <FileText className="h-4 w-4" />
              New Quotation
            </Link>
            <Link
              href="/calls"
              className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-border bg-background text-foreground text-sm font-medium transition-all hover:bg-muted"
            >
              <Phone className="h-4 w-4" />
              Log Call
            </Link>
            <Link
              href="/orders"
              className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-border bg-background text-foreground text-sm font-medium transition-all hover:bg-muted"
            >
              <ShoppingCart className="h-4 w-4" />
              New Order
            </Link>
          </div>
        </div>

        {/* Alert Sections */}
        <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-3">
          {/* Pending Deliveries */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-orange-500" />
                Pending Deliveries
                <Badge variant="secondary" className="ml-auto">{pendingDeliveries.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {pendingDeliveries.map((item) => (
                <div key={item.caseCode} className="flex flex-col gap-0.5 text-sm border-l-2 border-orange-200 pl-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{item.customer}</span>
                    <span className="text-xs text-muted-foreground font-mono">{item.caseCode}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{item.product}</span>
                  <span className="text-xs text-orange-600 dark:text-orange-400">
                    {item.deliveryDate} · {item.location}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Rental Follow-ups */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-500" />
                Rental Follow-ups Due
                <Badge variant="secondary" className="ml-auto">{rentalFollowUps.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {rentalFollowUps.map((item) => (
                <div key={item.caseCode} className="flex flex-col gap-0.5 text-sm border-l-2 border-blue-200 pl-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{item.customer}</span>
                    <Badge variant="outline" className="text-xs">Month {item.month}</Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">{item.product}</span>
                  <span className="text-xs text-blue-600 dark:text-blue-400">
                    RM {item.monthlyRate}/mo · Since {item.rentalStart}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Outstanding Balances */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Wallet className="h-4 w-4 text-red-500" />
                Outstanding Balances
                <Badge variant="secondary" className="ml-auto">{outstandingBalances.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {outstandingBalances.map((item) => (
                <div key={item.caseCode} className="flex flex-col gap-0.5 text-sm border-l-2 border-red-200 pl-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{item.customer}</span>
                    <span className="text-xs font-mono font-semibold text-red-600 dark:text-red-400">
                      RM {item.balance}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">{item.product}</span>
                  <span className="text-xs text-red-500">
                    Due {item.dueDate}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
