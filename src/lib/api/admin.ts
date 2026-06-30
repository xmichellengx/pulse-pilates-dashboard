import { requireUser } from "@/lib/api/auth"

export const AI_SERVICES_OWNER_EMAIL = "michelleleng.ng@gmail.com"

export function isAiServicesOwner(email: string | null | undefined): boolean {
  return email === AI_SERVICES_OWNER_EMAIL
}

/**
 * Gate an API route to the AI services owner (Michelle). Wraps requireUser
 * and additionally checks the email. Keep this in lockstep with the RLS
 * policy on ai_engagements / ai_invoices.
 */
export async function requireAiServicesOwner() {
  const auth = await requireUser()
  if (!auth.ok) return auth
  if (!isAiServicesOwner(auth.user.email)) {
    return {
      ok: false as const,
      response: Response.json({ error: "Forbidden" }, { status: 403 }),
    }
  }
  return auth
}
