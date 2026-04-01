import { Header } from "@/components/layout/header"

export default function RentalsPage() {
  return (
    <div className="flex flex-col gap-6">
      <Header title="Rentals" />
      <div className="px-6">
        <h1 className="text-2xl font-semibold tracking-tight">Rentals</h1>
        <p className="text-muted-foreground text-sm mt-1">Monitor active rentals and conversion opportunities.</p>
      </div>
    </div>
  )
}
