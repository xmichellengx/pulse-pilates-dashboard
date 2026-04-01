import { Header } from "@/components/layout/header"

export default function CallsPage() {
  return (
    <div className="flex flex-col gap-6">
      <Header title="Call Log" />
      <div className="px-6">
        <h1 className="text-2xl font-semibold tracking-tight">Call Log</h1>
        <p className="text-muted-foreground text-sm mt-1">Log and track all sales call activity.</p>
      </div>
    </div>
  )
}
