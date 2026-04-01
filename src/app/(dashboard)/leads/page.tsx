import { Header } from "@/components/layout/header"

export default function LeadsPage() {
  return (
    <div className="flex flex-col gap-6">
      <Header title="Leads" />
      <div className="px-6">
        <h1 className="text-2xl font-semibold tracking-tight">Leads</h1>
        <p className="text-muted-foreground text-sm mt-1">Track daily leads by source and market.</p>
      </div>
    </div>
  )
}
