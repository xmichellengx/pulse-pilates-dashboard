import { createClient as createServiceClient } from "@supabase/supabase-js"
import { requireUser } from "@/lib/api/auth"

const supabase = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const VALID_STATUSES = new Set(["Pending", "Scheduled", "Completed", "Cancelled"])
const ALLOWED_FIELDS = new Set([
  "scheduled_date",
  "scheduled_time",
  "completed_date",
  "payment_date",
  "issue_description",
  "transport_fee",
  "labour_fee",
  "parts_description",
  "parts_cost",
  "status",
  "agent",
  "notes",
])

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser()
  if (!auth.ok) return auth.response

  const { id } = await params
  const body = await req.json().catch(() => null)
  if (!body || typeof body !== "object") {
    return Response.json({ error: "invalid body" }, { status: 400 })
  }

  const updates: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(body)) {
    if (!ALLOWED_FIELDS.has(key)) continue
    if (key === "status") {
      if (typeof value === "string" && VALID_STATUSES.has(value)) updates[key] = value
      continue
    }
    updates[key] = value
  }
  if (Object.keys(updates).length === 0) {
    return Response.json({ error: "no editable fields" }, { status: 400 })
  }

  // Recompute total if any of the fee fields are touched.
  const touchedFees =
    "transport_fee" in updates ||
    "labour_fee" in updates ||
    "parts_cost" in updates
  if (touchedFees) {
    const { data: current } = await supabase
      .from("maintenance_requests")
      .select("transport_fee, labour_fee, parts_cost, is_under_warranty, is_active_rental")
      .eq("id", id)
      .single()
    if (current) {
      const waived = current.is_under_warranty || current.is_active_rental
      const transport = waived ? 0 : Number((updates.transport_fee ?? current.transport_fee) ?? 0)
      const labour = waived ? 0 : Number((updates.labour_fee ?? current.labour_fee) ?? 0)
      const parts = waived ? 0 : Number((updates.parts_cost ?? current.parts_cost) ?? 0)
      updates.total = transport + labour + parts
      if (waived) {
        updates.transport_fee = 0
        updates.labour_fee = 0
        updates.parts_cost = 0
      }
    }
  }

  // Auto-stamp completed_date when status flips to Completed (unless caller passed one).
  if (updates.status === "Completed" && !("completed_date" in updates)) {
    updates.completed_date = new Date().toISOString().slice(0, 10)
  }

  const { data, error } = await supabase
    .from("maintenance_requests")
    .update(updates)
    .eq("id", id)
    .select()
    .single()
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser()
  if (!auth.ok) return auth.response

  const { id } = await params
  const { error } = await supabase.from("maintenance_requests").delete().eq("id", id)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
