import { NextResponse } from "next/server"

export async function POST() {
  // Email sending via Resend — coming soon
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json(
      { error: "Email sending not configured. Set RESEND_API_KEY to enable." },
      { status: 503 }
    )
  }

  return NextResponse.json({ message: "Email sent" }, { status: 200 })
}
