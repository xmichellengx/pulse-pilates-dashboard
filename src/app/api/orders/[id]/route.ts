import { createClient as createServiceClient } from "@supabase/supabase-js"
import { requireUser } from "@/lib/api/auth"

const supabase = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser()
  if (!auth.ok) return auth.response

  const { id } = await params
  const body = await req.json()
  const { data, error } = await supabase.from("orders").update(body).eq("id", id).select().single()
  if (error) return Response.json({ error: error.message }, { status: 400 })
  return Response.json(data)
}

// DELETE intentionally removed. Order deletion must go through
// POST /api/orders/delete which gates on the admin password. The
// previous DELETE here had no auth/password check (one curl wiped
// any order). See F-DATA-11 / F-SEC-3 in docs/audit-2026-04-28.
