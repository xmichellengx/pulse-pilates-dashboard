# Pulse Pilates — Dashboard Audit Triage (2026-04-28)

Four parallel audits ran against the codebase and the live Supabase project. **60 findings** total across security, data integrity, pricing math, and reliability/UX. This document is the prioritised action list.

Detailed findings live in:
- [`01-pricing-math.md`](./01-pricing-math.md) — 15 findings
- [`02-data-integrity.md`](./02-data-integrity.md) — 15 findings
- [`03-security.md`](./03-security.md) — 15 findings
- [`04-reliability-ux.md`](./04-reliability-ux.md) — 15 findings

---

## TL;DR

The dashboard works for two trusted users, but **the production API is completely unauthenticated.** An attacker with the public URL can read, write, or delete every order, quotation, and invoice with a one-line `curl`. The Supabase service-role key sits in `.env.local` valid until 2036 and is bypassable separately because public signup is enabled. The admin "delete password" gate is theatre — a sibling DELETE route has no password at all.

Independent of that, several pricing surfaces produce numbers that don't match each other (PDF total ≠ Grand Total for P4B customers; rental orders understate the customer's actual payment by the deposit; `/orders/new` saves orders missing the entire breakdown).

The good news: most of the security fixes are configuration + tiny code changes (disable signup, add `auth.getUser()` to every API route, rotate keys). The pricing fixes are mechanical now that the bugs are catalogued.

---

## EMERGENCY — do today (within hours)

These are exploitable from the public internet **right now** and require no special access. They have to land before anything else.

### E1. Rotate the Supabase service role key and management token
- **Source:** F-SEC-4
- The service-role JWT in `.env.local` is valid until **2036-01-04** and bypasses RLS entirely. Anyone who has ever pulled the repo, opened an old laptop, or read Vercel build artefacts has total DB access for the next 10 years.
- The Supabase **management** token in `~/.claude/projects/.../MEMORY.md` (used by this session to run SQL) is in plaintext on disk. The audit agent confirmed it works against `ykexbcyrhknswxaabjyn`.
- **Action**: Supabase Dashboard → Project Settings → API → Reset service role key. Then PAT settings → revoke the `sbp_3c75…1e5dbe` management token. Update Vercel env vars. Remove the token from your local memory file.

### E2. Disable public signup on the Supabase project
- **Source:** F-SEC-2
- Auth config currently has `disable_signup: false`. RLS policies on every business table are `qual: true` for `authenticated`. So anyone who signs up for an account on your Supabase project — *not* on the dashboard, just on the underlying Supabase REST API — gets full read/write/delete of orders, quotations, invoices, leads, calls, and the entire customer PII set.
- **Action**: `PATCH /v1/projects/ykexbcyrhknswxaabjyn/config/auth` with `{ "disable_signup": true }`, or toggle in the Supabase dashboard.

### E3. Delete or auth-gate the password-less DELETE route
- **Sources:** F-SEC-3, F-DATA-11
- `src/app/api/orders/[id]/route.ts:16-21` exposes a `DELETE` with **zero** auth and **zero** password check. The password modal in the UI only gates `POST /api/orders/delete`; the sibling route silently destroys any order via one curl.
- **Action**: Delete the DELETE export from `[id]/route.ts` entirely (the UI doesn't call it), or fold it behind the same password+auth gate as the other route.

### E4. Add `auth.getUser()` to every API route
- **Source:** F-SEC-1
- `src/lib/supabase/middleware.ts:36-43` explicitly skips auth for `/api/*`. Every route under `src/app/api/**` instantiates a service-role client at module scope, so RLS is bypassed and there's no second-layer check. Anyone can POST/PATCH/DELETE/GET anything.
- **Action**: At the top of each route handler, await `createClient()` from `src/lib/supabase/server.ts`, call `auth.getUser()`, return 401 if no user. Keep the service-role client for legitimate cross-row work, but only after the auth check. Also remove the `/api/*` exemption in the proxy.

### E5. Stop `/api/invoices/send` from emailing arbitrary recipients
- **Source:** F-SEC-7
- No auth check. `to` comes straight from `body.customer_email`. An attacker can hit the endpoint with arbitrary content and Resend delivers a Pulse-Pilates-branded invoice (with your Maybank account number `5140 1249 2051` hardcoded into the PDF template) to anyone they choose. Once your sending domain is verified, those emails pass SPF/DKIM.
- **Action**: Require auth (same as E4). Resolve `customer_email` server-side from a trusted `order_id` lookup; ignore any email field in the body. Add a per-user rate limit.

---

## HIGH — do this week

These are real bugs already affecting customers (wrong amounts on quotations, silent data loss).

### H1. Quotation PDF totals don't match for P4B tier customers
- **Sources:** F-MATH-1, F-MATH-2
- PDF re-derives customisation prices using retail values regardless of `pricing_tier`. `pricing_tier` is also not in the payload at `quotation-builder.tsx:738-756`. So a P4B T2 customer (colour customisation = RM 100) sees `customisation` rows at retail prices (RM 300) in the PDF table, but the Grand Total below is computed off the stored RM 100 — line items don't add up to the total.
- **Fix:** Pass `pricing_tier` in both PDF payloads (the save flow already does — copy the line). Render customisation rows using stored `item.customisation_surcharge` instead of recomputing.

### H2. Quotation PDF rental deposit is 2× too high for P4B T2
- **Source:** F-MATH-3
- PDF hardcodes `deposit4M = monthlyTotal * 4`. Builder review screen shows 2 months for P4B T2, 4 months for P4B T1. Rental Activation total on the PDF therefore overstates the customer's actual deposit obligation.
- **Fix:** Compute deposit months from `pricing_tier` (`p4b_t2` → 2, `p4b_t1` → 4) in the PDF renderer.

### H3. `/orders/new` drops the entire pricing breakdown on save
- **Sources:** F-UX-5, F-MATH-9
- Every order created via `/orders/new` saves only `amount` — not `subtotal`, `delivery_fee`, `installation_fee`, `discounts`, `items`. Downstream: the order modal shows no breakdown, and invoice generation falls into the legacy back-calc fallback (hardcoded RM 150 delivery, fabricated line items).
- **Fix:** Extend the form's submit payload to include the breakdown fields the form already collects in state. Should be a 10-line change.

### H4. Convert-to-order understates rental customer payment
- **Source:** F-MATH-10
- For rentals, `handleConvertToOrder` sets `amount = q.total`. But `q.total` excludes the rental deposit (2–4 months × monthly). The customer pays delivery + install + 1st month + deposit on activation; the Order's Amount field only reflects the first three.
- **Fix:** For rental conversions, compute and store `amount = q.total + depositAmount`. Make rental orders' "Balance" reflect the deposit owed if not yet paid.

### H5. Three more silent-failure mutation patterns
- **Sources:** F-UX-1, F-UX-2, F-UX-3, F-DATA-3, F-DATA-4, F-DATA-5
- Same shape as the original convert-to-order bug:
  - Quotation Mark-as-Sent toggle doesn't check `error`
  - Invoice-sent toggle on orders doesn't check `error`
  - Convert-to-order's follow-up `UPDATE quotations` (the *new* one I added in bb02340) only `console.error`s the linking failure — toast says success regardless
  - Rental convert/terminate handlers catch silently with no toast
- **Fix:** Add an `if (error) throw` (or explicit toast.error + state revert) to each of these. One repeating pattern; worth a tiny helper.

### H6. Sheets sync silently swallows every PostgREST error
- **Sources:** F-DATA-2, F-DATA-1
- The per-row sync loop treats `await supabase...` as throwing on failure, but PostgREST errors are returned as `{ data, error }` — the loop counts them as success. Plus the `sync_log` audit table doesn't exist in the live DB, so every sync's audit row insert errors silently. So a broken sync looks like a green light.
- **Fix:** Check `error` per row, accumulate failures, surface them in the response. Create the `sync_log` table or remove the audit insert.

### H7. Schema drift between migration file and live DB
- **Source:** F-DATA-7, F-DATA-12, F-DATA-1
- Live schema vs `001_initial_schema.sql`:
  - `orders.case_code` is no longer UNIQUE (migration says it is). Duplicates can land.
  - All cross-table FKs (`invoices.order_id`, `calls.order_id`, `quotations.converted_to_order`, `orders.quotation_id`) are `ON DELETE NO ACTION` — order deletes either fail with a confusing FK error or orphan rows.
  - `sync_log` is referenced in code but doesn't exist.
- **Fix:** Write a follow-up migration that restores the UNIQUE and adds explicit `ON DELETE SET NULL` (or CASCADE for invoices) to the FKs. Commit to repo so the migration file stops being a lie.

### H8. Weak Supabase auth posture
- **Source:** F-SEC-5
- `password_min_length: 6`, no HIBP check, no MFA enforcement, no session timeout. Once an attacker knows either staff email (guessable from the brand), credential-stuffing the password (`Pulse123` is currently allowed!) gives a permanent session.
- **Fix:** Supabase Dashboard → Auth → Policies: bump min length to 12, enable HIBP, set `sessions_timebox: 28800`, enforce MFA enrolment for both staff accounts.

### H9. PDF endpoints are unauthenticated and unvalidated
- **Source:** F-SEC-6
- `/api/invoices/pdf` and `/api/quotations/pdf` accept arbitrary JSON and render a Pulse-branded PDF. No auth, no schema validation (`as InvoicePDFInput` is a type cast not a runtime check), no body size limit. Bigger picture this is the engine behind E5 — without lockdown, the dashboard is a phishing PDF factory.
- **Fix:** Auth check (E4 covers this); add a Zod schema; cap `items.length ≤ 50`; reject bodies > 256 KB.

---

## MEDIUM — do this month

Functional bugs and divergences that aren't bleeding money today but should be cleaned up before they multiply.

### M1. `formatCurrency` rounds to whole units, losing cents (F-MATH-5)
The order modal breakdown rounds RM 3,030.50 to RM 3,031, and the displayed total then doesn't match the stored amount. Pull `maximumFractionDigits: 2` into the formatter.

### M2. Invoice PDF hardcodes "RM" column headers (F-MATH-7)
SG customers receive invoices with `RM` labels next to SGD figures. Pass `currency` through and substitute.

### M3. Hardcoded `deliveryFee = 150` in legacy back-calc (F-MATH-6)
The `from-order` route's fallback fires whenever stored breakdown is missing — which after H3 is most orders today. The 150 default + "if > 1000 reset to 150" cap silently rewrites invoice line items for SG orders and any non-standard delivery fee.
**Fix is the same as H3** — once orders save their breakdown, the fallback stops firing.

### M4. `PATCH /api/orders/[id]` accepts arbitrary fields (F-DATA-9)
Pass-through update with no allow-list. A stale tab can overwrite unrelated columns. Add a Zod schema and a column allow-list.

### M5. Quotation number collisions (F-DATA-8)
`QUO-YYYYMMDD-rand(100..999)` collides at ~35 quotes/day with no retry. Generate from a DB sequence or add a retry loop on uniqueness violation.

### M6. Discount reducer accepts negative inputs (F-MATH-12)
A `-200` discount becomes a `+200` charge silently. Validate `amount >= 0` on the form.

### M7. Dashboard "Pending Deliveries" KPI queries the wrong status string (F-UX-15)
Card is effectively dead — queries `"Pending Delivered"` (typo) while real data uses `"Pending Delivery"` / `"Pending Shipment Arrival"`.

### M8. Double-click race on Generate buttons creates duplicate invoice rows (F-UX-12)
Receipt + Rental dialogs don't disable on first click. Guard with the existing loading state.

### M9. No dirty-form protection on `/orders/new` or order edit-mode Escape (F-UX-6, F-UX-7)
A back/refresh wipes the long order form. Escape in the modal silently discards edits.

### M10. Orders list doesn't re-sync after server prop changes (F-UX-13)
`localOrders` set once from the initial prop; newly-converted orders may not appear without hard reload.

### M11. Static bearer auth on `/api/sync/sheets` is replayable forever (F-SEC-8)
Replace with HMAC over `(timestamp || body)` with a 5-minute window.

### M12. PII in Vercel logs via `console.error(err)` (F-SEC-9)
Several handlers log full request bodies on errors. Scrub before logging.

### M13. PostgREST `.or()` filter accepts user-supplied search (F-SEC-11)
The orders search `.or()` interpolates the search term — sanitize, or use parameterised filters.

### M14. Quotation PDF can be generated without saving the quotation (F-UX-9)
A random quotation number is stamped on the PDF before the row is committed. If save then fails or is skipped, the PDF references a phantom record.

### M15. `/orders/new` has near-zero validation (F-UX-11)
Fields marked required with `*` are not actually validated. Add Zod schema (the form already uses RHF).

---

## LOW / INFORMATIONAL

Tracked in the source reports for completeness; not worth interrupting other work for:

- F-MATH-8, F-MATH-14, F-MATH-15 — rounding edge cases
- F-DATA-13, F-DATA-14, F-DATA-15 — minor numeric/null drift
- F-UX-4, F-UX-8, F-UX-10, F-UX-14 — small UI inconsistencies
- F-SEC-12, F-SEC-13, F-SEC-14, F-SEC-15 — missing security headers, brand-confusing Resend fallback, suspicious `lucide-react@1.7.0` pin

---

## Recommended sequencing

1. **Today** — E1, E2, E3 (≈30 min combined: dashboard settings + one git revert)
2. **Tomorrow** — E4, E5 (≈2 hours: add `auth.getUser()` helper + apply to ≈10 routes)
3. **This week** — H1, H2, H3, H4, H5 (the money bugs; mostly mechanical fixes now that they're catalogued)
4. **This week, separately** — H7, H8 (config + one migration)
5. **Next sprint** — H6, H9 + the Medium list

The Critical security fixes (E1–E5) close 90% of the externally-exploitable risk. The High pricing fixes (H1–H4) eliminate the math discrepancies customers can see on their PDFs. The repeating "no error check on mutations" pattern (H5) is one helper away from being a class-of-bug solved permanently.
