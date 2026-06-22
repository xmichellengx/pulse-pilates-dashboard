import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

/**
 * Gate API route handlers behind a logged-in Supabase session.
 *
 * Usage at the top of each handler:
 *   const auth = await requireUser()
 *   if (!auth.ok) return auth.response
 *
 * After this, it is safe to use the service-role client for cross-row
 * work because we've confirmed the caller is a logged-in staff user.
 */
export async function requireUser() {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    }
  }
  return { ok: true as const, user: data.user, supabase }
}
