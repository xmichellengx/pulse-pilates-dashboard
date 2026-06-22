import { createClient as createServiceClient } from "@supabase/supabase-js"
import { requireUser } from "@/lib/api/auth"

const supabase = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  const auth = await requireUser()
  if (!auth.ok) return auth.response

  const body = await req.json()
  const { data, error } = await supabase.from("orders").insert(body).select().single()
  if (error) return Response.json({ error: error.message }, { status: 400 })
  return Response.json(data)
}
