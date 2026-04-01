import { Header } from "@/components/layout/header"

export default function InvoicesPage() {
  return (
    <div className="flex flex-col gap-6">
      <Header title="Invoices" />
      <div className="px-6">
        <h1 className="text-2xl font-semibold tracking-tight">Invoices</h1>
        <p className="text-muted-foreground text-sm mt-1">Generate and manage purchase and rental invoices.</p>
      </div>
    </div>
  )
}
