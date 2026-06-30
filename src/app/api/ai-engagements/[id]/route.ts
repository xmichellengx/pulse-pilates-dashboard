import { createClient as createServiceClient } from "@supabase/supabase-js"
import { requireAiServicesOwner } from "@/lib/api/admin"

const supabase = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const ALLOWED_FIELDS = new Set([
  "client_name",
  "project_name",
  "client_email",
  "client_phone",
  "client_address",
  "status",
  "upfront_items",
  "upfront_amount",
  "upfront_paid_date",
  "maintenance_start_date",
  "trial_months_free",
  "year_one_monthly",
  "year_two_plus_monthly",
  "scope_notes",
  "internal_notes",
])

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAiServicesOwner()
  if (!auth.ok) return auth.response

  const { id } = await params
  const body = await req.json().catch(() => null)
  if (!body || typeof body !== "object") {
    return Response.json({ error: "invalid body" }, { status: 400 })
  }

  const updates: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(body)) {
    if (ALLOWED_FIELDS.has(k)) updates[k] = v
  }
  if (Object.keys(updates).length === 0) {
    return Response.json({ error: "no editable fields" }, { status: 400 })
  }
  updates.updated_at = new Date().toISOString()

  const { data, error } = await supabase
    .from("ai_engagements")
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
  const auth = await requireAiServicesOwner()
  if (!auth.ok) return auth.response

  const { id } = await params
  const { error } = await supabase.from("ai_engagements").delete().eq("id", id)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
