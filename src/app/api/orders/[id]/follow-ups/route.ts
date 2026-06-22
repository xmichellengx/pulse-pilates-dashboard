import { createClient as createServiceClient } from "@supabase/supabase-js"
import { requireUser } from "@/lib/api/auth"

const supabase = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const VALID_CONTACTED = new Set([
  "Yes",
  "No Answer",
  "Voicemail",
  "WhatsApp Seen",
])
const VALID_OUTCOMES = new Set([
  "On track",
  "Wants to convert",
  "Wants to terminate",
  "At risk",
  "Complaint",
])

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser()
  if (!auth.ok) return auth.response

  const { id: orderId } = await params
  const body = await req.json().catch(() => null)
  if (!body || typeof body !== "object") {
    return Response.json({ error: "invalid body" }, { status: 400 })
  }

  const contacted = typeof body.contacted === "string" ? body.contacted : null
  if (contacted && !VALID_CONTACTED.has(contacted)) {
    return Response.json({ error: "invalid contacted value" }, { status: 400 })
  }
  const outcome = typeof body.outcome === "string" ? body.outcome : null
  if (outcome && !VALID_OUTCOMES.has(outcome)) {
    return Response.json({ error: "invalid outcome value" }, { status: 400 })
  }

  const row = {
    order_id: orderId,
    follow_up_date: typeof body.follow_up_date === "string" && body.follow_up_date ? body.follow_up_date : new Date().toISOString().slice(0, 10),
    agent: typeof body.agent === "string" && body.agent.trim() ? body.agent.trim() : (auth.user.email ?? null),
    month_mark: typeof body.month_mark === "number" && [1, 2, 3].includes(body.month_mark) ? body.month_mark : null,
    contacted,
    outcome,
    notes: typeof body.notes === "string" && body.notes.trim() ? body.notes.trim() : null,
    payment_confirmed: !!body.payment_confirmed,
    next_action: typeof body.next_action === "string" && body.next_action.trim() ? body.next_action.trim() : null,
    next_follow_up_date: typeof body.next_follow_up_date === "string" && body.next_follow_up_date ? body.next_follow_up_date : null,
    created_by: auth.user.id,
  }

  const { data, error } = await supabase
    .from("rental_follow_ups")
    .insert(row)
    .select()
    .single()
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser()
  if (!auth.ok) return auth.response

  const { id: orderId } = await params
  const { data, error } = await supabase
    .from("rental_follow_ups")
    .select("*")
    .eq("order_id", orderId)
    .order("follow_up_date", { ascending: false })
    .order("created_at", { ascending: false })
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data ?? [])
}
