import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  // Get highest PP#### code
  const { data: ppRows } = await supabase
    .from("orders")
    .select("case_code")
    .like("case_code", "PP%")
    .not("case_code", "like", "PPAS%")
    .not("case_code", "like", "PPNS%")
    .not("case_code", "like", "PPSG%")
    .not("case_code", "like", "PPSHP%")
    .order("case_code", { ascending: false })
    .limit(20)

  let nextPP = "PP0001"
  if (ppRows && ppRows.length > 0) {
    const nums = ppRows
      .map((r) => parseInt((r.case_code ?? "").replace("PP", ""), 10))
      .filter((n) => !isNaN(n))
    if (nums.length > 0) {
      const max = Math.max(...nums)
      nextPP = `PP${String(max + 1).padStart(4, "0")}`
    }
  }

  // Get highest PPAS### code
  const { data: ppasRows } = await supabase
    .from("orders")
    .select("case_code")
    .like("case_code", "PPAS%")
    .order("case_code", { ascending: false })
    .limit(10)

  let nextPPAS = "PPAS001"
  if (ppasRows && ppasRows.length > 0) {
    const nums = ppasRows
      .map((r) => parseInt((r.case_code ?? "").replace("PPAS", ""), 10))
      .filter((n) => !isNaN(n))
    if (nums.length > 0) {
      const max = Math.max(...nums)
      nextPPAS = `PPAS${String(max + 1).padStart(3, "0")}`
    }
  }

  return Response.json({ nextPP, nextPPAS })
}
