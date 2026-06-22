# Data Integrity Audit — pulse-pilates

Date: 2026-04-28
Scope: `src/app/api/**`, `src/components/**`, live Supabase schema (project `ykexbcyrhknswxaabjyn`).

These findings are in the same family as the recently-fixed `converted_to_order` bug:
operations that fail silently, write wrong-type data, or leave the UI/DB out of sync.
Nothing here is a style nit.

---

### F-DATA-1: `sync_log` insert targets a non-existent table — every sheet sync logs a silent error

**Severity:** Medium
**Where:** `src/app/api/sync/sheets/route.ts:152-159`
**Symptom:** Every Google Sheets sync silently fails its audit-log write. Operators have zero record of sync runs, row counts, or errors. The end-of-handler `await ...maybeSingle()` returns an error that is never inspected — the response still reports `ok: true` with happy counts.
**Root cause:** Code writes to `public.sync_log`, but only these tables exist in the live DB: `calls, cats, food_logs, grooming_logs, grooming_tasks, health_records, invoices, leads, litter_box_logs, orders, photos, products, quotations, weight_records`. No `sync_log`. The migration also never created it.
**Reproduce:** Trigger any sheet sync via `POST /api/sync/sheets`. The DB write to `sync_log` errors (`relation "public.sync_log" does not exist`), but the response is still `{ ok: true, inserted, updated, skipped, total }`.
**Suggested fix:** Either create the `sync_log` table (id/source/rows_received/inserted/updated/skipped/errors/created_at) or remove the insert. Whichever path, surface the error in the response so a broken audit trail is visible.

---

### F-DATA-2: Sheet sync swallows every per-row insert/update error

**Severity:** Critical
**Where:** `src/app/api/sync/sheets/route.ts:103-149`
**Symptom:** Rows that fail to upsert are counted as `inserted` or `updated` and the response says success. Real failures (unique-constraint violations on `case_code`, null `customer_name`, type errors on numeric columns) never increment `skipped`. Operators believe the sync wrote N rows when it wrote fewer.
**Root cause:** The `for…of` body does `await supabase.from("orders").update(patch)…` and `await supabase.from("orders").insert(row)` without destructuring `{ error }`. The Supabase JS client does **not** throw on DB errors — it returns them in `error`. Only thrown exceptions hit the `catch`, and PostgREST errors are not exceptions. So the `try/catch` for `skipped++` only catches network/JSON failures, not DB rejections.
**Reproduce:** Sync a row whose `case_code` already exists in `orders` with a payload that would violate a constraint, or one that produces a null in a NOT NULL column. The route returns `inserted: 1, updated: 0, skipped: 0` even though nothing was written.
**Suggested fix:** Destructure `{ error }` from each call; on error, push into `errors[]` and bump `skipped`, do not bump `inserted`/`updated`.

---

### F-DATA-3: Quotation "Mark as Sent" toggle swallows DB errors and lies to the user

**Severity:** High
**Where:** `src/components/quotations/quotations-client.tsx:240-254`
**Symptom:** Clicking "Mark as Sent / Unmark Sent" always shows the success toast and updates the row in local state, even if the DB write failed. Refresh the page and the badge reverts — but the user already moved on believing it was saved.
**Root cause:** `await supabase.from("quotations").update({ email_sent: newValue }).eq("id", q.id)` — no `{ error }` destructure, no check. The catch only fires on a thrown exception (network/parse), not on a PostgREST `error` payload. Then it unconditionally calls `setQuotations(...)` and `toast.success(...)`.
**Reproduce:** Temporarily drop the user's RLS update permission on `quotations` and click Mark as Sent. UI shows "Marked as Sent to Customer", DB row unchanged.
**Suggested fix:** `const { error } = await supabase.from("quotations").update(...).eq("id", q.id); if (error) throw error` — and only update local state after the awaited call returns clean.

---

### F-DATA-4: Quotation→Order conversion is two unguarded writes; if the link update fails, the quotation is stranded "Active" but the order exists

**Severity:** High
**Where:** `src/components/quotations/quotations-client.tsx:159-238`
**Symptom:** This is *almost* the original bug. The fix wrote the right UUID into `converted_to_order`, but the update is still best-effort: if `update(...).eq("id", q.id)` returns an error, the code only logs `console.error("Failed to link quotation -> order:", updateErr)` and proceeds to update local state and toast success. The order is created, the quotation is left looking "Active", and the user can convert it again, creating duplicate orders.
**Root cause:** Line 220-224 does `if (updateErr) console.error(...)` — no toast, no rollback, no abort. Then line 226-230 optimistically marks the row converted in React state regardless of `updateErr`.
**Reproduce:** Break RLS on `quotations.update`, click Convert. New order is inserted, quotation row in DB still has `converted_to_order = null`, UI says "Order created with full breakdown." Refresh → button is back, click again → duplicate order.
**Suggested fix:** If `updateErr` is non-null, surface a toast ("Order created but link failed — refresh and re-link manually") and *do not* set the local `converted_to_order` to the new id. Better: do the insert + update inside a single RPC/transaction.

---

### F-DATA-5: Rental "Convert to Purchase" and "Terminate" — failures are silently swallowed

**Severity:** High
**Where:** `src/components/rentals/rentals-client.tsx:138-154` (Convert) and `:269-285` (Terminate)
**Symptom:** Both modals catch errors but only `console.error(err)` — no toast, no message. Worse, the optimistic `onConverted(id)` / `onTerminated(id)` is *only* called inside the success branch, but the modal still closes via `setConverting(false)` in `finally`. Operators clicking "Mark as Converted" or "Mark as Returned" on a flaky network see the spinner stop and assume it worked.

Wait — re-reading: `onConverted` / `onTerminated` are called only inside the try after `if (!res.ok) throw`, so the row stays in the list on failure. The bug is narrower: **no user feedback at all on failure**. Convert/Terminate just appear to do nothing.
**Root cause:** Catch blocks log to console and leave the user with no toast and no error UI.
**Reproduce:** Force `/api/orders/[id]` PATCH to 500. Click Convert. Spinner stops, modal still open, no toast. User clicks again and again.
**Suggested fix:** Add `toast.error(...)` in both catch blocks. Same shape as `handleStatusUpdate` in `order-detail-modal.tsx`.

---

### F-DATA-6: `invoices` audit-row write after PDF generation is fire-and-forget; failures are invisible

**Severity:** Medium
**Where:** `src/components/orders/order-detail-modal.tsx:398-410`
**Symptom:** After a user clicks "Download Invoice"/"Receipt"/"Rental Invoice", an `invoices` row is supposed to be inserted as an audit trail. The PDF download succeeds and the user gets a toast. But the trailing `await fetch("/api/invoices", { method: "POST", ... })` is not checked — `res.ok` is ignored. If it 400s (e.g. amount type mismatch, RLS), the audit row never lands and there is no `invoice_number` recorded for the document the user just sent to a customer.
**Root cause:** `await fetch("/api/invoices", ...)` with no `if (!res.ok)` branch, no toast, no retry. The whole call is decorative.
**Reproduce:** Generate an invoice while `currentOrder.amount` is a string (e.g. from stale state). Server rejects with 400 ("invalid input syntax for type numeric"); user has no idea.
**Suggested fix:** Capture `const auditRes = await fetch(...); if (!auditRes.ok) toast.warning("Invoice generated but audit log failed")` so an operator can re-record manually. Also: pass numeric `amount` via `Number(currentOrder.amount)` to avoid the type drift.

---

### F-DATA-7: `case_code` generator has a TOCTOU race — two simultaneous "New Order" tabs get the same code

**Severity:** Medium
**Where:** `src/app/api/orders/next-code/route.ts:8-52` and `src/app/(dashboard)/orders/new/page.tsx:284-311`
**Symptom:** `GET /api/orders/next-code` returns `{ nextPP: "PP0042" }` based on the current max. If two operators open New Order at the same time (or Aisy double-clicks the page tab), both get `PP0042`. The first save succeeds; the second hits the `case_code` UNIQUE constraint at insert time and the user gets a 400 ("duplicate key value violates unique constraint orders_case_code_key") — but the form is fully filled out and the error message in the toast is the raw DB string. No retry, no auto-bump.
**Root cause:** Read-then-write without atomicity. The DB does have a UNIQUE on `case_code` (confirmed via `pg_tables` query — `orders` has no explicit unique constraint listed *but* the migration declares `case_code text unique`, and the column allows nulls so duplicates could even sneak in as nulls).

Actually — the live constraint list does NOT show a `orders_case_code_key` unique constraint. Only `orders_pkey` is listed. This means **`case_code` is no longer unique in the live DB**, despite the migration declaring it so. Duplicates can land silently.
**Reproduce:** Run `select case_code, count(*) from orders group by 1 having count(*) > 1;` — if rows return, duplicates already exist.
**Suggested fix:** Re-add the unique constraint (`alter table orders add constraint orders_case_code_key unique (case_code)`), and either retry the generator on collision or use a Postgres sequence / RPC for atomicity. At minimum, surface a friendly toast and call `fetchNextCodes()` on conflict.

---

### F-DATA-8: `quotation_number` collision risk — `QUO-YYYYMMDD-rand(100..999)` with no retry

**Severity:** Medium
**Where:** `src/components/quotations/quotation-builder.tsx:204-209` and unique constraint `quotations_quotation_number_key`
**Symptom:** 900 possible suffixes per day. Birthday paradox: at ~35 quotations in a single day the collision probability is ~50%. Hitting the unique constraint surfaces as the generic `toast.error("Failed to save quotation")` — no retry, no regeneration, the user must close the sheet and start over (and the form state survives only because they haven't reset).
**Root cause:** Random 3-digit suffix with no collision-handling retry; only client-side dedup against itself (none).
**Reproduce:** Save 30+ quotations in a single calendar day, eventually two will collide.
**Suggested fix:** Use a daily counter (RPC `nextval('quotation_number_seq')` formatted into the string) or widen to 6 digits. On 23505 error, regenerate and retry once.

---

### F-DATA-9: `PATCH /api/orders/[id]` lets clients PATCH arbitrary fields with no allowlist — silent column drift / data corruption risk

**Severity:** High
**Where:** `src/app/api/orders/[id]/route.ts:8-14`
**Symptom:** Handler does `supabase.from("orders").update(body).eq("id", id)` with the *entire* request body. If a client (or future code) sends `{ id: "<other-uuid>" }`, `{ created_at: "..." }`, or a typo'd column, two things happen:
  - Typo'd column: PostgREST 400s, surfaced as `data.error` — handled OK at API level but no logging.
  - Valid columns the client should not write: silently accepted. Example: a client could overwrite `case_code` (still uniqueable in spirit), `quotation_id`, `warranty_start_date` on a status-toggle call.
**Root cause:** No allowlist filtering of incoming PATCH fields; server trusts client to send only safe fields. There is also no RLS-level restriction since policy is "Authenticated users can do everything".
**Reproduce:** `curl -X PATCH /api/orders/<id> -d '{"id":"00000000-0000-0000-0000-000000000000","case_code":"PWNED"}'` — `id` in body is ignored because `.eq("id", id)` uses the URL param, but `case_code: "PWNED"` lands. Multi-user scenario: Operator A is editing in the modal; Operator B saves a stale form from another tab; B's PATCH includes every field, stomping A's in-flight edits.
**Suggested fix:** Explicit allowlist of patchable columns in the route. Reject unknown keys. Consider optimistic-concurrency check via `updated_at` to prevent stale stomps.

---

### F-DATA-10: `from-order` invoice generation crashes / returns bad data when `items` is a stringified JSON or wrong shape

**Severity:** Medium
**Where:** `src/app/api/invoices/from-order/route.ts:46-52, 102-127`
**Symptom:** `isStoredOrderItemArray` only checks `Array.isArray(v)`. If `items` ever ends up as a stringified JSON (which would happen if anything inserts/updates via raw SQL or pgAdmin with `'[]'` cast wrong), the array check passes for `null` returns false and the code goes to the legacy fallback — but if `items` lands as a literal string `"[{...}]"` Supabase returns it as a string and the array branch is skipped. The PDF then renders only delivery/installation/charges/discounts with no line items, silently dropping the equipment from the customer-facing invoice.
**Root cause:** No defensive parsing. The contract assumes Supabase always returns jsonb as a parsed array. If the column ever holds text or wrongly-shaped objects, no warning, no fallback.
**Reproduce:** Manually update an order via SQL: `update orders set items = '"oops"'::jsonb where id = ...;` Generate invoice. PDF has no line items. No error to the user.
**Suggested fix:** Add a try/catch JSON.parse if typeof === "string", warn-log if shape is unexpected, surface a 422 if no items resolved and `mode != "Rental"`.

---

### F-DATA-11: `DELETE /api/orders/[id]` has no password gate — bypasses the admin-only delete UI

**Severity:** Critical
**Where:** `src/app/api/orders/[id]/route.ts:16-21` vs `src/app/api/orders/delete/route.ts:8-30`
**Symptom:** The UI calls `POST /api/orders/delete` which checks `ADMIN_DELETE_PASSWORD`. But `DELETE /api/orders/[id]` exists side-by-side with no password check. Any authenticated user (or anyone who knows the URL) can call `curl -X DELETE /api/orders/<uuid>` and erase an order with zero gating. The "admin delete with password" UX is theatre.
**Root cause:** Two endpoints, only one gated. The unguarded one was likely an early scaffold left behind when the password flow was added.
**Reproduce:** `curl -X DELETE https://pulse-pilates.vercel.app/api/orders/<any-uuid>` — order vanishes.
**Suggested fix:** Either remove the DELETE handler from `[id]/route.ts` entirely, or have it require the same password. Also, no soft-delete / audit trail exists; given how easy hard-deletes are, consider adding one.

---

### F-DATA-12: Deleting an order leaves orphan `invoices` and orphan `calls` rows (FK is NO ACTION, not CASCADE / SET NULL)

**Severity:** High
**Where:** Live schema — `invoices.order_id → orders.id ON DELETE NO ACTION`, `calls.order_id → orders.id ON DELETE NO ACTION`, `quotations.converted_to_order → orders.id ON DELETE NO ACTION`. Confirmed via `information_schema.referential_constraints`.
**Symptom:** When an order is deleted (via either DELETE route, F-DATA-11), Postgres will *refuse* the delete if any invoice/call/quotation references it (`NO ACTION` = error if dependent rows exist). The `/api/orders/delete` route just returns the raw error string and the password-protected dialog shows it; the user has no idea which invoice/call is blocking the delete and no UI to clean them up first.

Conversely, if invoices were *successfully* deleted somehow, the `order_id` field would now point at nothing (no FK action triggers).
**Root cause:** FK rules were declared in the migration as bare `references orders(id)` which defaults to NO ACTION. No cascade, no set null, no application-level cleanup.
**Reproduce:** Create an order, generate an invoice (auto-inserts an `invoices` row with `order_id`), then try to delete the order. You get `update or delete on table "orders" violates foreign key constraint "invoices_order_id_fkey"`.
**Suggested fix:** Either (a) change FKs to `ON DELETE SET NULL` for invoices/calls (preserves audit) and `ON DELETE SET NULL` for `quotations.converted_to_order` (un-marks the quotation), or (b) in `/api/orders/delete` cascade-clean before deleting. Document which is desired.

---

### F-DATA-13: `email` upserts go through unsanitised — sheet sync lowercases, but UI does not

**Severity:** Low
**Where:** `src/app/api/sync/sheets/route.ts:62` lowercases email; `order-detail-modal.tsx` (PATCH path) and `quotations-client.tsx` (insert path) do not.
**Symptom:** The same customer's email lands in different rows as `Sarah@Foo.com` and `sarah@foo.com`. Any future de-duplication / customer lookup will treat them as different people, double-counting customers in dashboards/KPIs.
**Root cause:** Inconsistent normalisation between import paths.
**Reproduce:** Sync a row with `Sarah@Foo.com`. Create a quotation by hand for the same customer typing `sarah@foo.com`. Two records, two normalisations.
**Suggested fix:** Normalize in API handlers (`email: email?.toLowerCase().trim() ?? null`) for orders, quotations, invoices, calls. One place, one rule.

---

### F-DATA-14: `quotations.items` jsonb has NOT NULL constraint with default `'[]'`, but conversion to order stores items as `[]` when array is empty — orders silently have no items

**Severity:** Low
**Where:** `src/components/quotations/quotations-client.tsx:205` and `orders.items` (jsonb, nullable).
**Symptom:** Convert-to-order sets `items: Array.isArray(q.items) ? q.items : []`. If the quotation somehow has empty items but a non-zero `total`, the resulting order has `items: []` and the PDF renderer's `hasStoredBreakdown` (`from-order/route.ts:103-106`) falls through to the *legacy* fallback that back-calculates a single equipment line from `order.amount - 150` (capped to 150). The customer-facing invoice shows fabricated numbers.
**Root cause:** Empty-array vs null-array detection in `hasStoredBreakdown` doesn't catch "I had items but they got lost". Combined with the legacy back-calculation, output looks correct but is wrong.
**Reproduce:** Manually clear `quotations.items` to `'[]'::jsonb` while keeping `total = 5000`. Convert to order. Invoice PDF shows `Product 1 × 1 @ 4850, Product Delivery 150` — invented.
**Suggested fix:** In `from-order`, if `items` is `[]` and `amount > 0`, return 422 with a clear error rather than guessing. Validate non-empty items in the convert handler too.

---

### F-DATA-15: `orders.amount`, `monthly_rental`, `balance`, `subtotal`, `delivery_fee`, `installation_fee` are all numeric — but inputs feed them as untyped strings from `<input type="number">`

**Severity:** Low
**Where:** `src/components/orders/order-detail-modal.tsx:547-556` (`inp(field, "number")` helper, line 552: `[field]: e.target.value || null`) — value is a `string`. PATCH body sends `amount: editingOrder.amount`. Server forwards to Supabase. PostgREST does coerce numeric strings, but `"abc"` or `""` produce errors.

The `saveEdit` function (line 243-247) goes through `toNumOrNull` for the financial fields it explicitly lists — but the `inp("amount", "number")` field is overridden by `toNumOrNull(editingOrder.amount)` in the body so it is OK on save. **However**, the simpler `handleStatusUpdate` / `handleInvoiceSentToggle` and the rental modal's PATCH paths do *not* pass numbers — they pass only the field they're toggling, so they're safe. The bug surface is narrower than at first read.

The real residual risk: if a user enters a numeric field, blanks it, then triggers any *other* save flow that doesn't go through `toNumOrNull` (e.g. quick status update doesn't, fine), the stale string-vs-null mismatch is invisible. Low priority because the main `saveEdit` does sanitize.
**Suggested fix:** Move `toNumOrNull` coercion into `setEditingOrder` so the in-memory state is always typed. Then any future save path is safe by default.

---

## Summary

| Sev | Count | IDs |
|---|---|---|
| Critical | 2 | F-DATA-2, F-DATA-11 |
| High | 5 | F-DATA-3, F-DATA-4, F-DATA-5, F-DATA-9, F-DATA-12 |
| Medium | 5 | F-DATA-1, F-DATA-6, F-DATA-7, F-DATA-8, F-DATA-10 |
| Low | 3 | F-DATA-13, F-DATA-14, F-DATA-15 |

Top priorities:
1. **F-DATA-11** — unguarded DELETE endpoint is a one-curl data-loss bug.
2. **F-DATA-2** — sheet sync reporting success on every failure means we have *no idea* how much sync data is actually landing.
3. **F-DATA-12** — combined with F-DATA-11, deletes either fail mysteriously or orphan invoices.
4. **F-DATA-3 / F-DATA-4** — the original `converted_to_order` bug class is still present in sibling flows.
