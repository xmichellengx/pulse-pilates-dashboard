import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  const body = await req.json()
  const { order_id, type, invoice_number, customer_name, customer_email, amount, generated_by } = body

  const { error } = await supabase.from("invoices").insert({
    order_id: order_id ?? null,
    type: type ?? "invoice",
    invoice_number: invoice_number ?? null,
    customer_name: customer_name ?? null,
    customer_email: customer_email ?? null,
    amount: amount ?? null,
    generated_by: generated_by ?? null,
    generated_at: new Date().toISOString(),
  })

  if (error) return Response.json({ error: error.message }, { status: 400 })
  return Response.json({ ok: true })
}

export async function PATCH(req: Request) {
  const body = await req.json()
  const { id, ...updates } = body
  if (!id) return Response.json({ error: "id required" }, { status: 400 })
  const { data, error } = await supabase.from("invoices").update(updates).eq("id", id).select().single()
  if (error) return Response.json({ error: error.message }, { status: 400 })
  return Response.json(data)
}
