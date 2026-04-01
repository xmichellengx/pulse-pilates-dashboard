import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  const { data, error } = await supabase
    .from("products")
    .select("id, name, category, price_myr, price_sgd, rental_myr, p4b_t1_myr, p4b_t2_myr")
    .eq("is_active", true)
    .order("name")

  if (error) return Response.json({ error: error.message }, { status: 400 })
  return Response.json(data)
}
