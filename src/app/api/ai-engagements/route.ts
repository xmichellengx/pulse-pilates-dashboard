import { createClient as createServiceClient } from "@supabase/supabase-js"
import { requireAiServicesOwner } from "@/lib/api/admin"

const supabase = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  const auth = await requireAiServicesOwner()
  if (!auth.ok) return auth.response

  const body = await req.json().catch(() => null)
  if (!body || typeof body !== "object") {
    return Response.json({ error: "invalid body" }, { status: 400 })
  }

  // Engagement number: caller can override; otherwise generate PPAI{NNN}.
  let engagementNumber: string | null = typeof body.engagement_number === "string" && body.engagement_number.trim()
    ? body.engagement_number.trim()
    : null
  if (!engagementNumber) {
    const { data: seqRow, error: seqErr } = await supabase.rpc("nextval", { sequence_name: "ai_engagement_seq" } as never)
    let seqNum: number
    if (seqErr || typeof seqRow !== "number") {
      const { count } = await supabase.from("ai_engagements").select("id", { count: "exact", head: true })
      seqNum = (count ?? 0) + 1
    } else {
      seqNum = seqRow
    }
    engagementNumber = `PPAI${String(seqNum).padStart(3, "0")}`
  }

  const row = {
    engagement_number: engagementNumber,
    client_name: String(body.client_name ?? "").trim(),
    project_name: String(body.project_name ?? "").trim(),
    client_email: typeof body.client_email === "string" && body.client_email.trim() ? body.client_email.trim() : null,
    client_phone: typeof body.client_phone === "string" && body.client_phone.trim() ? body.client_phone.trim() : null,
    client_address: typeof body.client_address === "string" && body.client_address.trim() ? body.client_address.trim() : null,
    status: typeof body.status === "string" ? body.status : "active",
    upfront_items: Array.isArray(body.upfront_items) ? body.upfront_items : [],
    upfront_amount: Number(body.upfront_amount) || 0,
    upfront_paid_date: typeof body.upfront_paid_date === "string" && body.upfront_paid_date ? body.upfront_paid_date : null,
    maintenance_start_date: typeof body.maintenance_start_date === "string" && body.maintenance_start_date ? body.maintenance_start_date : null,
    delivered_at: typeof body.delivered_at === "string" && body.delivered_at ? body.delivered_at : null,
    trial_months_free: Number(body.trial_months_free) || 0,
    year_one_monthly: Number(body.year_one_monthly) || 0,
    year_two_plus_monthly: Number(body.year_two_plus_monthly) || 0,
    scope_notes: typeof body.scope_notes === "string" && body.scope_notes.trim() ? body.scope_notes.trim() : null,
    scope_appendix_text: typeof body.scope_appendix_text === "string" && body.scope_appendix_text.trim() ? body.scope_appendix_text.trim() : null,
    internal_notes: typeof body.internal_notes === "string" && body.internal_notes.trim() ? body.internal_notes.trim() : null,
  }
  if (!row.client_name || !row.project_name) {
    return Response.json({ error: "client_name and project_name required" }, { status: 400 })
  }

  const { data, error } = await supabase.from("ai_engagements").insert(row).select().single()
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}
