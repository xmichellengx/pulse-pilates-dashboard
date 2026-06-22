import { toast } from "sonner"

/**
 * Wraps a Supabase mutation thenable so that errors aren't silently
 * swallowed. On failure: toasts the error AND throws — callers should
 * catch and revert any optimistic local state. On success: optionally
 * toasts and returns the data payload.
 *
 * Usage:
 *   try {
 *     await mutate(
 *       supabase.from("quotations").update({ email_sent: true }).eq("id", q.id),
 *       { success: "Marked as sent", failure: "Failed to update" }
 *     )
 *     // apply local state update AFTER the mutation resolves
 *   } catch {
 *     // revert any pre-mutation snapshot here
 *   }
 */
export async function mutate<T>(
  promise: PromiseLike<{ data: T; error: { message: string } | null }>,
  opts: { success?: string; failure?: string } = {}
): Promise<T> {
  const { data, error } = await promise
  if (error) {
    toast.error(opts.failure ?? error.message ?? "Update failed")
    throw error
  }
  if (opts.success) toast.success(opts.success)
  return data
}
