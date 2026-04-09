import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const SYNC_SECRET = process.env.SHEETS_SYNC_SECRET!

function parseDate(v: string): string | null {
  if (!v) return null
  if (/^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10)
  const m = v.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/)
  if (m) {
    const d = m[1].padStart(2, "0")
    const mo = m[2].padStart(2, "0")
    const yr = m[3].length === 2 ? "20" + m[3] : m[3]
    return `${yr}-${mo}-${d}`
  }
  return null
}

function parseNum(v: string): number | null {
  if (!v) return null
  const n = parseFloat(v.replace(/[^0-9.]/g, ""))
  return isNaN(n) ? null : n
}

function normalizeStatus(v: string): string {
  const s = (v || "").toLowerCase()
  if (s.includes("delivered") && !s.includes("pending")) return "Delivered"
  if (s.includes("pending delivery")) return "Pending Delivery"
  if (s.includes("pending shipment")) return "Pending Shipment Arrival"
  if (s.includes("pending")) return "Pending Shipment Arrival"
  if (s.includes("cancel")) return "Cancelled"
  if (s.includes("return")) return "Returned"
  return v || "Pending Shipment Arrival"
}

function normalizeMode(v: string): string | null {
  if (!v) return null
  const s = v.toLowerCase()
  if (s.includes("rental")) return "Rental"
  if (s.includes("cash on delivery")) return "Direct Purchase- Cash On Delivery"
  if (s.includes("cash")) return "Direct Purchase- Cash Payment"
  if (s.includes("installment")) return "Direct Purchase- Installment"
  if (s.includes("converted")) return "Converted - Purchase"
  if (s.includes("direct")) return "Direct Purchase"
  if (s.includes("p4b")) return "P4B"
  if (s.includes("kol")) return "KOL"
  return v
}

function mapRow(row: Record<string, string>) {
  const get = (key: string) => (row[key] ?? "").trim()
  const name = get("Name")
  if (!name) return null

  return {
    case_code: get("Case code") || null,
    customer_name: name,
    email: get("Email address").toLowerCase() || null,
    phone: get("Mobile No.").replace(/\s+/g, "") || null,
    product_name: get("Product") || null,
    units: parseNum(get("Unit")) ?? 1,
    mode: normalizeMode(get("Purchase/Rental")),
    payment_type: get("Payment") || null,
    amount: parseNum(get("Amount (RM)")),
    monthly_rental: parseNum(get("Monthly rental")),
    balance: parseNum(get("Balance")),
    payment_date: parseDate(get("Payment date")),
    delivery_date: parseDate(get("Delivery Date")),
    location: get("Location") || null,
    address: get("Address") || null,
    status: normalizeStatus(get("Status")),
    lead_source: get("Leads") || null,
    payex_status: get("Payex status") || null,
    remarks: get("Remarks") || null,
    market: "MY",
  }
}

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization")
  if (!SYNC_SECRET || authHeader !== `Bearer ${SYNC_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json()
  const { rows } = body as { rows: Record<string, string>[] }

  if (!Array.isArray(rows) || rows.length === 0) {
    return Response.json({ error: "No rows provided" }, { status: 400 })
  }

  const mapped = rows.map(mapRow).filter(Boolean) as NonNullable<ReturnType<typeof mapRow>>[]

  let inserted = 0
  let updated = 0
  let skipped = 0
  const errors: string[] = []

  for (const row of mapped) {
    try {
      if (row.case_code) {
        // Match by case_code
        const { data: existing } = await supabase
          .from("orders")
          .select("id, amount")
          .eq("case_code", row.case_code)
          .limit(1)
          .maybeSingle()

        if (existing) {
          const patch = { ...row } as Record<string, unknown>
          // Don't overwrite a real amount with null
          if (existing.amount !== null && row.amount === null) delete patch.amount
          await supabase.from("orders").update(patch).eq("id", existing.id)
          updated++
        } else {
          await supabase.from("orders").insert(row)
          inserted++
        }
      } else {
        // No case code — match by name + product + payment_date
        const q = supabase
          .from("orders")
          .select("id")
          .eq("customer_name", row.customer_name)
          .limit(1)

        if (row.product_name) q.eq("product_name", row.product_name)
        if (row.payment_date) q.eq("payment_date", row.payment_date)

        const { data: existing } = await q.maybeSingle()

        if (existing) {
          await supabase.from("orders").update(row).eq("id", existing.id)
          updated++
        } else {
          await supabase.from("orders").insert(row)
          inserted++
        }
      }
    } catch (err) {
      errors.push(String(err))
      skipped++
    }
  }

  // Log to sync_log (best effort)
  await supabase.from("sync_log").insert({
    source: "google_sheets",
    rows_received: rows.length,
    inserted,
    updated,
    skipped,
    errors: errors.length > 0 ? errors.slice(0, 5).join("; ") : null,
  }).maybeSingle()

  return Response.json({ ok: true, inserted, updated, skipped, total: rows.length })
}
