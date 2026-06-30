import { createClient as createServiceClient } from "@supabase/supabase-js"
import { requireAiServicesOwner } from "@/lib/api/admin"

const supabase = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const VALID_TYPES = new Set(["upfront", "maintenance"])
const VALID_STATUSES = new Set(["draft", "sent", "paid", "void"])

export async function POST(req: Request) {
  const auth = await requireAiServicesOwner()
  if (!auth.ok) return auth.response

  const body = await req.json().catch(() => null)
  if (!body || typeof body !== "object") {
    return Response.json({ error: "invalid body" }, { status: 400 })
  }
  const engagementId = typeof body.engagement_id === "string" ? body.engagement_id : null
  const invoiceType = typeof body.invoice_type === "string" ? body.invoice_type : null
  if (!engagementId) return Response.json({ error: "engagement_id required" }, { status: 400 })
  if (!invoiceType || !VALID_TYPES.has(invoiceType)) {
    return Response.json({ error: "invoice_type must be upfront or maintenance" }, { status: 400 })
  }

  // Generate sequential invoice number AI-YYYY-NNNN
  const { data: seqRow, error: seqErr } = await supabase.rpc("nextval", { sequence_name: "ai_invoice_seq" } as never)
  let seqNum: number
  if (seqErr || typeof seqRow !== "number") {
    // Fallback: count existing invoices + 1 (good enough for low-volume side business)
    const { count } = await supabase.from("ai_invoices").select("id", { count: "exact", head: true })
    seqNum = (count ?? 0) + 1
  } else {
    seqNum = seqRow
  }
  const year = new Date().getFullYear()
  const invoiceNumber = `AI-${year}-${String(seqNum).padStart(4, "0")}`

  const periodYear = typeof body.period_year === "number" ? body.period_year : null
  const periodMonth = typeof body.period_month === "number" ? body.period_month : null
  const periodLabel = typeof body.period_label === "string" && body.period_label.trim()
    ? body.period_label.trim()
    : (periodYear && periodMonth
        ? new Date(periodYear, periodMonth - 1, 1).toLocaleDateString("en-GB", { month: "long", year: "numeric" })
        : null)

  const row = {
    engagement_id: engagementId,
    invoice_number: invoiceNumber,
    invoice_type: invoiceType,
    period_label: periodLabel,
    period_year: periodYear,
    period_month: periodMonth,
    amount: Number(body.amount) || 0,
    invoice_date: typeof body.invoice_date === "string" && body.invoice_date ? body.invoice_date : new Date().toISOString().slice(0, 10),
    due_date: typeof body.due_date === "string" && body.due_date ? body.due_date : null,
    payment_date: typeof body.payment_date === "string" && body.payment_date ? body.payment_date : null,
    status: typeof body.status === "string" && VALID_STATUSES.has(body.status) ? body.status : "draft",
    notes: typeof body.notes === "string" && body.notes.trim() ? body.notes.trim() : null,
    created_by: auth.user.id,
  }

  const { data, error } = await supabase.from("ai_invoices").insert(row).select().single()
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}
