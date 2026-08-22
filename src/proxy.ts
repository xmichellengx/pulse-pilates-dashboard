import { type NextRequest } from "next/server"
import { updateSession } from "@/lib/supabase/middleware"

export async function proxy(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    // `warranty/` is exempt because /public/warranty holds customer-facing
    // documents linked from the QR code printed on B2C invoices and receipts.
    // Those readers have no staff session, so without this exemption the QR
    // would redirect every customer to /login. Note the extension list below
    // covers images only — a .pdf is NOT otherwise exempt, so the path prefix
    // is what does the work here.
    //
    // Scoped to this one directory on purpose: any other PDF served from the
    // app stays behind auth.
    "/((?!_next/static|_next/image|favicon.ico|warranty/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
