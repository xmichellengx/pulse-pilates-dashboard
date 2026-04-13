import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  const { order_id, password } = await req.json()

  if (!order_id) {
    return Response.json({ error: "order_id is required" }, { status: 400 })
  }

  const adminPassword = process.env.ADMIN_DELETE_PASSWORD
  if (!adminPassword || password !== adminPassword) {
    return Response.json({ error: "Incorrect password" }, { status: 403 })
  }

  const { error } = await supabase
    .from("orders")
    .delete()
    .eq("id", order_id)

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ ok: true })
}
