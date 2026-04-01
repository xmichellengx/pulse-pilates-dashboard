import { Header } from "@/components/layout/header"

export default function QuotationsPage() {
  return (
    <div className="flex flex-col gap-6">
      <Header title="Quotations" />
      <div className="px-6">
        <h1 className="text-2xl font-semibold tracking-tight">Quotations</h1>
        <p className="text-muted-foreground text-sm mt-1">Build and send quotations to customers and studios.</p>
      </div>
    </div>
  )
}
