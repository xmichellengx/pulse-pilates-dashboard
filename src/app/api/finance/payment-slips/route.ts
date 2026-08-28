import { createClient as createServiceClient } from "@supabase/supabase-js"

/**
 * Read-only payment-slip access for Utopia Group's finance sync.
 *
 * Why this exists rather than a Supabase Auth login for their finance team:
 * every RLS policy on the sales tables is `USING (true)` for cmd=ALL granted to
 * `authenticated`, and the `authenticated` role holds INSERT/UPDATE/DELETE on
 * orders, invoices, quotations, products and maintenance_requests. So *any*
 * Supabase login is full write access to the sales database. Locking that down
 * per-user would mean a restrictive policy on every table, where missing one
 * silently grants write. A bearer token scoped to this single endpoint avoids
 * that whole class of mistake.
 *
 * Guarantees:
 *   - read-only by construction; this route only ever signs URLs
 *   - reaches the `payment-slips` bucket ONLY, never `rental-documents`,
 *     which holds identity documents and contracts
 *   - revoke by rotating FINANCE_SYNC_SECRET; no database change needed
 *
 * Auth: Authorization: Bearer <FINANCE_SYNC_SECRET>
 *
 * GET /api/finance/payment-slips
 *   ?order_id=<uuid>   optional, single order
 *   ?since=YYYY-MM-DD  optional, filter by payment_date
 */

const supabase = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const BUCKET = "payment-slips"
const URL_TTL_SECONDS = 60 * 60 // 1 hour — long enough to fetch, short enough to not linger

function unauthorized() {
  return Response.json({ error: "Unauthorized" }, { status: 401 })
}

export async function GET(req: Request) {
  const secret = process.env.FINANCE_SYNC_SECRET
  if (!secret) {
    return Response.json({ error: "Not configured" }, { status: 503 })
  }

  const header = req.headers.get("authorization") ?? ""
  const token = header.startsWith("Bearer ") ? header.slice(7) : ""
  // Length check first so the comparison below is over equal-length strings.
  if (token.length !== secret.length) return unauthorized()
  let diff = 0
  for (let i = 0; i < secret.length; i++) {
    diff |= token.charCodeAt(i) ^ secret.charCodeAt(i)
  }
  if (diff !== 0) return unauthorized()

  const url = new URL(req.url)
  const orderId = url.searchParams.get("order_id")
  const since = url.searchParams.get("since")

  let query = supabase
    .from("orders")
    .select("id, case_code, payment_date, amount, market, status, payex_proof_url")
    .not("payex_proof_url", "is", null)
    .order("payment_date", { ascending: false })

  if (orderId) query = query.eq("id", orderId)
  if (since) query = query.gte("payment_date", since)

  const { data: rows, error } = await query
  if (error) return Response.json({ error: error.message }, { status: 500 })

  const slips = []
  for (const row of rows ?? []) {
    const key = row.payex_proof_url as string
    const { data: signed, error: signError } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(key, URL_TTL_SECONDS)
    slips.push({
      order_id: row.id,
      case_code: row.case_code,
      payment_date: row.payment_date,
      amount: row.amount,
      currency: row.market === "SG" ? "SGD" : "MYR",
      status: row.status,
      file: key.split("/").pop(),
      // null rather than an error string: a missing file should not break a sync
      // that is otherwise fine.
      url: signError ? null : signed?.signedUrl ?? null,
    })
  }

  return Response.json(
    {
      count: slips.length,
      url_expires_in_seconds: URL_TTL_SECONDS,
      slips,
    },
    { headers: { "Cache-Control": "no-store" } }
  )
}
