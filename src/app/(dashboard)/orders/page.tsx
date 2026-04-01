import { Header } from "@/components/layout/header"

export default function OrdersPage() {
  return (
    <div className="flex flex-col gap-6">
      <Header title="Orders" />
      <div className="px-6">
        <h1 className="text-2xl font-semibold tracking-tight">Orders</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage all purchase and rental orders.</p>
      </div>
    </div>
  )
}
