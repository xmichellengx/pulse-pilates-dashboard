import { NextRequest, NextResponse } from "next/server"
import { Resend } from "resend"
import { z } from "zod"
import { createClient } from "@supabase/supabase-js"
import { requireUser } from "@/lib/api/auth"

// ─────────────────────────────────────────────────────────────────────────────
// Security notes
// ─────────────────────────────────────────────────────────────────────────────
// This endpoint USED to accept a `customer_email` (and other PII) directly
// from the request body and email a Pulse-Pilates-branded PDF to that
// address. That made it a free phishing oracle for anyone who could reach
// the route — they could send a forged-looking Pulse Pilates invoice to
// any recipient they chose.
//
// The hardened contract:
//   - The ONLY accepted field is `order_id`.
//   - The destination email and all PII / amounts / line items are derived
//     server-side from the order record (via the service-role client).
//   - Any `customer_email`, `customer_name`, etc. in the body is ignored.
//   - Request bodies > 256 KB are rejected.
//   - Auth (requireUser) is layered on top by a separate middleware change.
// ─────────────────────────────────────────────────────────────────────────────

const MAX_BODY_BYTES = 256 * 1024

const BodySchema = z.object({
  order_id: z.string().min(1).max(200),
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const auth = await requireUser()
  if (!auth.ok) return auth.response

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json(
      { error: "Email sending not configured. Set RESEND_API_KEY to enable." },
      { status: 503 }
    )
  }

  // ── Size cap ────────────────────────────────────────────────────────────────
  const contentLength = req.headers.get("content-length")
  if (contentLength && Number(contentLength) > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Request body too large" }, { status: 413 })
  }

  // ── Parse + validate body (order_id only; ignore everything else) ───────────
  let rawBody: unknown
  try {
    rawBody = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const parsed = BodySchema.safeParse(rawBody)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "order_id is required", details: parsed.error.issues },
      { status: 400 }
    )
  }
  const { order_id } = parsed.data

  // ── Look up order server-side (recipient + PII come from DB, not body) ─────
  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .select("id, email, customer_name")
    .eq("id", order_id)
    .single()

  if (orderErr || !order) {
    return NextResponse.json(
      { error: orderErr?.message ?? "Order not found" },
      { status: 404 }
    )
  }

  const destinationEmail = typeof order.email === "string" ? order.email.trim() : ""
  if (!destinationEmail) {
    return NextResponse.json(
      { error: "Order has no email address on file" },
      { status: 400 }
    )
  }

  // ── Build PDF payload from the order via the from-order route ──────────────
  // (Keeps the math/breakdown logic in a single place — owned by another agent.)
  // Both downstream routes are auth-gated by requireUser(); forward the
  // caller's session cookie so they accept the internal request.
  const origin = req.nextUrl.origin
  const cookieHeader = req.headers.get("cookie") ?? ""
  const metaRes = await fetch(
    `${origin}/api/invoices/from-order?order_id=${encodeURIComponent(order_id)}`,
    { cache: "no-store", headers: { cookie: cookieHeader } }
  )
  if (!metaRes.ok) {
    const errBody = await metaRes.json().catch(() => ({}))
    return NextResponse.json(
      { error: errBody.error ?? "Failed to build invoice payload" },
      { status: 502 }
    )
  }
  const pdfPayload = await metaRes.json()

  // ── Render PDF via the (validated) /api/invoices/pdf route ─────────────────
  const pdfRes = await fetch(`${origin}/api/invoices/pdf`, {
    method: "POST",
    headers: { "Content-Type": "application/json", cookie: cookieHeader },
    body: JSON.stringify(pdfPayload),
  })
  if (!pdfRes.ok) {
    return NextResponse.json({ error: "PDF generation failed" }, { status: 502 })
  }
  const pdfBuffer = Buffer.from(await pdfRes.arrayBuffer())

  // ── Send the email ─────────────────────────────────────────────────────────
  const fromAddress = process.env.RESEND_FROM_EMAIL
    ? `Pulse Pilates <${process.env.RESEND_FROM_EMAIL}>`
    : "Pulse Pilates <onboarding@resend.dev>"

  if (!process.env.RESEND_FROM_EMAIL) {
    console.warn(
      "RESEND_FROM_EMAIL not set — using onboarding@resend.dev as sender. " +
        "Verify your domain in Resend and set RESEND_FROM_EMAIL=invoices@pilatesreformer.my"
    )
  }

  const billNumber =
    typeof pdfPayload?.bill_number === "string" && pdfPayload.bill_number
      ? pdfPayload.bill_number
      : "invoice"
  // Use the customer name from the order, not the client body.
  const customerName =
    typeof order.customer_name === "string" && order.customer_name
      ? order.customer_name
      : "Customer"

  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    await resend.emails.send({
      from: fromAddress,
      to: destinationEmail,
      subject: `Invoice ${billNumber} from Pulse Pilates`,
      text: `Hi ${customerName},\n\nPlease find your invoice ${billNumber} attached.\n\nThank you for your business!\n\nPulse Pilates\npilatesreformer.my`,
      attachments: [
        {
          filename: `${billNumber}.pdf`,
          content: pdfBuffer.toString("base64"),
        },
      ],
    })
  } catch (err) {
    console.error("Invoice send error:", err)
    return NextResponse.json({ error: "Failed to send invoice email" }, { status: 500 })
  }

  return NextResponse.json(
    { message: "Invoice emailed successfully", invoice: billNumber },
    { status: 200 }
  )
}
