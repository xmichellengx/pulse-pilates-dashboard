import { createClient as createServiceClient } from "@supabase/supabase-js"
import { requireAiServicesOwner } from "@/lib/api/admin"

const supabase = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const VALID_STATUSES = new Set(["draft", "sent", "paid", "void"])
const ALLOWED_FIELDS = new Set([
  "amount",
  "invoice_date",
  "due_date",
  "payment_date",
  "status",
  "notes",
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
    if (!ALLOWED_FIELDS.has(k)) continue
    if (k === "status") {
      if (typeof v === "string" && VALID_STATUSES.has(v)) updates[k] = v
      continue
    }
    updates[k] = v
  }
  if (Object.keys(updates).length === 0) {
    return Response.json({ error: "no editable fields" }, { status: 400 })
  }

  const { data, error } = await supabase
    .from("ai_invoices")
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
  const { error } = await supabase.from("ai_invoices").delete().eq("id", id)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
