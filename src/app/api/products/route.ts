import { createClient as createServiceClient } from "@supabase/supabase-js"
import { requireUser } from "@/lib/api/auth"

const supabase = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  const auth = await requireUser()
  if (!auth.ok) return auth.response

  const { data, error } = await supabase
    .from("products")
    .select("id, sku_code, name, category, price_myr, price_sgd, rental_myr, p4b_t1_myr, p4b_t2_myr")
    .eq("is_active", true)
    .order("category")
    .order("name")

  if (error) return Response.json({ error: error.message }, { status: 400 })
  return Response.json(data)
}
