# Pulse Pilates — Security Audit (2026-04-28)

Scope: source tree at `/Users/michelleng/pulse-pilates`, live Supabase project
`ykexbcyrhknswxaabjyn`, deployed app at `https://pulse-pilates.vercel.app`.

Assumed adversary model: an unauthenticated attacker on the public internet who
knows the production domain. The dashboard handles customer PII (name, email,
phone, address), pricing/contract data, internal banking details, and is the
system of record for invoice/receipt generation.

---

### F-SEC-1: All business API routes are completely unauthenticated and use the service_role key
**Severity:** Critical
**CWE / class:** CWE-306 Missing Authentication for Critical Function + CWE-269 Improper Privilege Management
**Where:**
- `src/proxy.ts:9-12` — middleware matcher
- `src/lib/supabase/middleware.ts:36-43` — `isApiRoute` short-circuits auth
- Every route in `src/app/api/**/route.ts(x)` instantiates a service-role client at module load:
  - `src/app/api/orders/route.ts:3-6`
  - `src/app/api/orders/[id]/route.ts:3-6`
  - `src/app/api/orders/delete/route.ts:3-6`
  - `src/app/api/orders/next-code/route.ts:3-6`
  - `src/app/api/quotations/route.ts:3-6`
  - `src/app/api/invoices/route.ts:3-6`
  - `src/app/api/invoices/from-order/route.ts:4-7`
  - `src/app/api/leads/route.ts:3-6`
  - `src/app/api/calls/route.ts:3-6`
  - `src/app/api/products/route.ts:3-6`

**Attack:** The proxy (Next.js 16 middleware equivalent) at
`src/lib/supabase/middleware.ts:39` reads
`const isApiRoute = request.nextUrl.pathname.startsWith("/api")` and explicitly
skips the auth redirect for any `/api/*` path. None of the route handlers
themselves call `supabase.auth.getUser()` or check the session cookie. They each
build a `createClient(URL, SERVICE_ROLE_KEY)` client at module scope, which
bypasses RLS entirely.

An attacker can therefore:
- `curl -X POST https://pulse-pilates.vercel.app/api/orders -H 'content-type: application/json' -d '{"customer_name":"x"}'` to insert arbitrary orders.
- `curl -X PATCH https://pulse-pilates.vercel.app/api/orders/<id> -d '{"amount":1}'` to mutate any order (full PATCH including `case_code`, `email`, `amount`, `balance`, `address`, `items`, `discounts`).
- `curl -X DELETE https://pulse-pilates.vercel.app/api/orders/<id>` to silently delete any order with no password gate at all (the soft password gate lives in a *different* route — see F-SEC-3).
- Same pattern for quotations, invoices, leads, calls, and reading the full product price list.

**Impact:** Full read/write/delete of every business table in the database
without any credentials. An attacker can wipe the order ledger, falsify
invoices, plant fraudulent customer records, harvest the entire customer PII
list, or rewrite product pricing before a sales call. There is no audit trail
that ties writes back to a user — `generated_by` and similar fields are
attacker-controlled strings.

**Suggested fix:** In every API route, await `createClient()` from
`src/lib/supabase/server.ts`, call `supabase.auth.getUser()`, and return 401 if
no user. Keep the service-role client only for legitimately server-only paths
(e.g. cross-row aggregation) and gate it behind the auth check. Also stop
exempting `/api/*` from the proxy auth redirect — let the route handlers
explicitly opt-out where needed (the public `next-code` is the only debatable
case, and even that leaks order code progression).

---

### F-SEC-2: Public Supabase signup is enabled — anyone can create an account and inherit `authenticated` role
**Severity:** Critical
**CWE / class:** CWE-284 Improper Access Control + CWE-862 Missing Authorization
**Where:**
- Supabase Auth config (`/v1/projects/ykexbcyrhknswxaabjyn/config/auth`): `disable_signup: false`, `mailer_autoconfirm: false`, `external_email_enabled: true`
- RLS policies on every business table (verified via `pg_policies`):
  - `orders`, `invoices`, `quotations`, `leads`, `calls` each have a single policy `"Authenticated users can do everything"` with `qual: true`, `with_check: true`, role `{authenticated}`, cmd `ALL`.
  - `products` additionally has `qual: true` SELECT for `{anon}` — i.e. the full price book is readable by anyone with the anon key.

**Attack:** The anon key is `NEXT_PUBLIC_*` and visible in every browser
request. An attacker visits
`https://ykexbcyrhknswxaabjyn.supabase.co/auth/v1/signup` (or uses
`supabase-js`) with any email + password ≥ 6 chars (see F-SEC-5). After email
verification on a throwaway inbox, they hold an `authenticated` JWT for this
project. They can then call PostgREST directly:

```
curl 'https://ykexbcyrhknswxaabjyn.supabase.co/rest/v1/orders?select=*' \
  -H "apikey: <anon>" -H "Authorization: Bearer <attacker_jwt>"
```

and read or modify every row in `orders`, `quotations`, `invoices`, `leads`,
`calls`. The RLS policies do not check `auth.uid()` or any allow-list — they
return `true` unconditionally.

**Impact:** Full PII exfiltration (Malaysian customer names, emails, phones,
home/studio addresses, payment status, invoice amounts) and full write access
to mutate contracts and invoices. Even fixing F-SEC-1 in the Next.js layer
does **not** close this hole, because the Supabase REST API is a separate
internet-reachable plane.

**Suggested fix:**
1. Set `disable_signup: true` via `PATCH /v1/projects/.../config/auth`.
2. Rewrite each RLS policy to allow only the two known service users, e.g.
   `using (auth.jwt() ->> 'email' in ('michelleleng.ng@gmail.com', 'aisypulsepilates@gmail.com'))`,
   or introduce a `staff` table and check `exists (select 1 from staff where id = auth.uid())`.
3. Remove the public-read policy on `products` unless the marketing site
   genuinely needs it (the dashboard already proxies via `/api/products`).

---

### F-SEC-3: Admin delete password is a hard-coded 8-char dictionary word, compared with `===` (non-constant-time), no rate limit, and bypassable via sibling route
**Severity:** Critical
**CWE / class:** CWE-521 Weak Password Requirements + CWE-208 Timing Attack + CWE-307 Improper Restriction of Excessive Authentication Attempts + CWE-841 Improper Enforcement of Behavioral Workflow
**Where:**
- `.env.local:9` → `ADMIN_DELETE_PASSWORD=Pulse123`
- `src/app/api/orders/delete/route.ts:15-18` → `if (!adminPassword || password !== adminPassword)`
- `src/app/api/orders/[id]/route.ts:16-21` → `DELETE` with **no** password check at all

**Attack:**
1. The password is the brand name + `123` — guessable in single-digit attempts. Combined with no rate limiting on `POST /api/orders/delete`, an attacker can brute-force in seconds (a 6-char minimum keyspace check is unnecessary, but even if the password were longer, `!==` leaks length/prefix timing).
2. The `===` string compare is not timing-safe — irrelevant given the password strength, but it would matter once the password is rotated.
3. **The bypass:** `DELETE /api/orders/[id]` exists at `src/app/api/orders/[id]/route.ts:16-21` and performs the exact same destructive operation with **zero** password check (and zero auth, see F-SEC-1). The password dialog in the UI (`src/components/orders/order-detail-modal.tsx:522-545`) only gates the `POST /api/orders/delete` path; nothing prevents direct invocation of the sibling DELETE route. The "admin password" is purely cosmetic.

**Impact:** Any internet user can permanently delete every order in the
database with a one-line curl. Even if a future change blocks the
`[id]` DELETE route, `Pulse123` is trivially brute-forceable.

**Suggested fix:** Delete the `Pulse123` env entirely; replace the admin gate
with a re-authentication step that verifies the calling user's Supabase
password via `signInWithPassword` against their session email, then issues a
short-lived signed token consumed by both the `POST /api/orders/delete` route
and the `DELETE /api/orders/[id]` route. Remove the password-less sibling
DELETE route, or fold it into the same gated handler. Rate-limit by IP +
authenticated user.

---

### F-SEC-4: `.env.local` and `CLAUDE.md` memory contain live, long-lived secrets in plaintext
**Severity:** High
**CWE / class:** CWE-312 Cleartext Storage of Sensitive Information + CWE-798 Use of Hard-coded Credentials
**Where:**
- `/Users/michelleng/pulse-pilates/.env.local:1-9` — `NEXT_PUBLIC_SUPABASE_ANON_KEY` (exp 2036), `SUPABASE_SERVICE_ROLE_KEY` (exp 2036), `CHATDADDY_API_KEY`, `CHATDADDY_ACCOUNT_ID`, `ADMIN_DELETE_PASSWORD=Pulse123`.
- `~/.claude/projects/-Users-michelleng/memory/MEMORY.md` (Paw Palace section) — Supabase **management** access token (`sbp_3c75…1e5dbe`) in plaintext. Although the file references the sister project `merry-pippin`, the token's project scope must be verified; if it is org-scoped it grants admin to `ykexbcyrhknswxaabjyn` too. (Empirically: I was able to run arbitrary SQL against `ykexbcyrhknswxaabjyn` with that token while performing this audit.)
- `.gitignore:34` correctly globs `.env*`, and `git check-ignore .env.local` confirms it is ignored. Good. However:
  - The service-role JWT is valid until **2036-01-04** (decoded `exp: 2088447503`).
  - The same JWT is hard-baked into the `.next/server/chunks/**` build output (visible via `grep -l SUPABASE_SERVICE_ROLE_KEY .next/...`), so any system that ever cached a build (CI artefacts, local SSDs sent for repair, Vercel build caches) carries the live key.

**Attack:** Any contributor / contractor / device-thief who reads the repo
directory, opens an old laptop, or pulls a Vercel build artefact obtains the
service-role JWT — which **bypasses RLS entirely**, instantly making F-SEC-1
and F-SEC-2 irrelevant. The Supabase management token in memory grants
project-admin (drop tables, change RLS, read any data).

**Impact:** Total compromise of the production database with no signal to
anyone. The management token additionally allows pivoting to org-level actions
on the Supabase account.

**Suggested fix:**
1. Rotate both JWTs in the Supabase dashboard ("Project Settings → API → Reset"). Re-deploy with the new values held only in Vercel env vars (not on local disk).
2. Rotate `ADMIN_DELETE_PASSWORD` after applying F-SEC-3.
3. Rotate the Chatdaddy API key.
4. Remove the management token from `~/.claude/projects/...MEMORY.md`. Treat it like an AWS access key — store it in a password manager, never a flat file that an MCP agent has read access to.
5. Add a `.env.local` cleanup step to onboarding/offboarding.

---

### F-SEC-5: Supabase auth is configured weakly — 6-char passwords, no HIBP, no MFA, no captcha, no session timeout
**Severity:** High
**CWE / class:** CWE-521 Weak Password Requirements + CWE-308 Use of Single-factor Authentication
**Where:** Supabase Auth config (`/v1/projects/ykexbcyrhknswxaabjyn/config/auth`):
- `password_min_length: 6`
- `password_hibp_enabled: false`
- `password_required_characters: null`
- `mfa_totp_enroll_enabled: true` but `mfa_allow_low_aal: false` is irrelevant when no policy enforces MFA on the two existing users
- `sessions_timebox: 0`, `sessions_inactivity_timeout: 0`, `sessions_single_per_user: false`
- `security_captcha_enabled: false`
- `rate_limit_anonymous_users: 30/hr` — adequate but only if signup is disabled (F-SEC-2)

**Attack:** Once an attacker knows the email of either staff user
(michelleleng.ng@gmail.com, aisypulsepilates@gmail.com — easily guessable from
the brand) they can credential-stuff or brute-force the password
(`Pulse123`-style passwords are explicitly permitted). With no MFA and no
session timebox, a single guess gives a permanent session.

**Impact:** Full dashboard takeover with a single weak password. Even with
F-SEC-1 fixed, this is the dominant remaining attack on the system.

**Suggested fix:** Raise `password_min_length` to 12, enable
`password_hibp_enabled`, enforce MFA enrolment for both staff accounts (or
gate sensitive routes on `aal2`), set
`sessions_timebox: 28800` and `sessions_inactivity_timeout: 3600`, enable
hCaptcha on the login flow.

---

### F-SEC-6: PDF generation endpoints accept arbitrary attacker-supplied content with no auth, no validation, and no size limit
**Severity:** High
**CWE / class:** CWE-345 Insufficient Verification of Data Authenticity + CWE-400 Uncontrolled Resource Consumption
**Where:**
- `src/app/api/invoices/pdf/route.tsx:618-642` — `POST` reads the JSON body, casts it to `InvoicePDFInput`, and renders the company-branded invoice with whatever the caller passed.
- `src/app/api/quotations/pdf/route.tsx:567-582` — same pattern.

**Attack:** No auth check, no schema validation (`as InvoicePDFInput` is a
cast, not a runtime check), no `req.headers.get('content-length')` check, no
cap on the number of `items[]`. An attacker can:
1. Fabricate a fully branded "Pulse Pilates Sdn. Bhd. (1569742-U)" invoice with the genuine Maybank account number `5140 1249 2051` (hard-coded on `invoices/pdf/route.tsx:605`) for arbitrary amounts addressed to arbitrary customers — useful for phishing or invoice-fraud against Pulse's actual customers ("here's your updated invoice").
2. Send `items: [...]` with 100,000 entries to OOM the Vercel function and run up serverless cost.
3. Send a 50 MB JSON body — `req.json()` is unbounded by default on App Router routes.

**Impact:** Brand-impersonation invoices at scale (this is the highest-value
PII consequence — customers receiving a PDF that genuinely came from
`pulse-pilates.vercel.app` with the right bank account will pay), plus
denial-of-service / cost-amplification.

**Suggested fix:** Require auth (same pattern as F-SEC-1). Define a Zod schema
for `InvoicePDFInput`, validate before render, and reject if
`items.length > 50`. Add a Content-Length check (≤256 KB). Consider not
exposing the PDF endpoint at all — make it server-internal-only and have the
UI go through `from-order` so all content is derived from a row that the user
is authorised to read.

---

### F-SEC-7: `/api/invoices/send` lets any caller email any address with a forged-branded PDF
**Severity:** High
**CWE / class:** CWE-918 SSRF-class abuse (mail) + CWE-345 Insufficient Verification of Data Authenticity
**Where:** `src/app/api/invoices/send/route.tsx:246-303`

**Attack:** The handler:
- Has no auth check.
- Takes the `to` address straight from `body.customer_email` (`route.tsx:257`).
- Generates a PDF from fully attacker-controlled fields (`renderToBuffer(<InvoiceDocument {...body} />)` — line 266).
- Sends from `Pulse Pilates <onboarding@resend.dev>` if `RESEND_FROM_EMAIL` is unset, but from `Pulse Pilates <invoices@pilatesreformer.my>` once the domain is verified. Either way, the displayed sender name is "Pulse Pilates".
- Has no allow-list on the destination domain, no rate limit, no idempotency key.

An attacker hits `POST /api/invoices/send` with `customer_email: victim@gmail.com`,
`customer_name: "Customer"`, `amount: 14500`, `items: [...]`, and Resend
delivers a Pulse-Pilates-branded invoice to anyone the attacker chooses.
Because the actual invoice numbers are predictable (`INV-PP0001`,
`INV-PP0002`, ...), forged invoices can ride the real numbering sequence.

**Impact:** The attacker turns the production app into a free, deliverable,
domain-aligned phishing oracle. Once the Resend domain is verified, the
forged emails will pass SPF/DKIM. Customer-impact potential: payments diverted
to attacker accounts (the attacker controls the entire PDF body including the
bank account section), plus reputational damage and possible blacklisting of
the `pilatesreformer.my` sender domain.

**Suggested fix:** Require auth. Resolve `customer_email` server-side from a
trusted `order_id` (look it up via the service-role client, ignore any email
in the request body). Enforce a per-user rate limit (Upstash / Redis). Log
every send to the `invoices` table with the authenticated user, recipient, and
amount.

---

### F-SEC-8: `/api/sync/sheets` writes arbitrary order data behind a static bearer token (no rotation, no replay protection)
**Severity:** High
**CWE / class:** CWE-321 Use of Hard-coded Cryptographic Key + CWE-294 Authentication Bypass by Capture-replay
**Where:** `src/app/api/sync/sheets/route.ts:8, 83-95`

**Attack:** `SHEETS_SYNC_SECRET` is a single static bearer compared with `!==`
(non-constant-time again). It is presumably set in the Google Apps Script
that pushes the sheet, so it travels over the wire on every sync.
Anyone with read access to the Apps Script project (or who intercepts a
single request) can replay it indefinitely; there is no nonce, no timestamp,
no signature over the body. The handler then uses the service-role client to
upsert rows into `orders` matching by `customer_name + product + payment_date`
— so an attacker can poison or overwrite live orders by submitting crafted
rows.

**Impact:** Permanent write access to the orders ledger given a single
leaked secret. Particularly bad because the matching logic
(`route.ts:124-144`) silently updates an existing row when name/product/date
collide — an attacker can rewrite real customer orders rather than create
detectable new ones.

**Suggested fix:** Replace the static secret with HMAC-SHA256 over
`(timestamp || body)`, reject when `|now - timestamp| > 5 min`, and require
the Apps Script to refresh credentials via a Google Workspace identity. Or
move sync to a pull model where the Next.js server fetches the sheet using a
short-lived Google service-account token.

---

### F-SEC-9: PII leaks into Vercel logs via unscoped `console.error(err)` in client and server handlers
**Severity:** Medium
**CWE / class:** CWE-532 Insertion of Sensitive Information into Log File
**Where:**
- `src/app/api/invoices/send/route.tsx:301` — `console.error("Invoice send error:", err)` runs after the body containing `customer_email`, `customer_name`, full line items is already in scope; Resend's error object includes the recipient and subject.
- `src/app/api/invoices/pdf/route.tsx:639` — same pattern; the PDF input body (with customer name, address, phone) lives in the closure and reaches the error.
- `src/app/(dashboard)/orders/page.tsx:56` — server-side `console.error("Orders query error:", error)` prints the full Supabase error which can include row values.
- `src/components/orders/order-detail-modal.tsx:497` — receipt persistence error logs include `editingOrder` state.
- Several other `console.error(err)` calls in client components also serialise full row data to the browser console; on shared/staff machines that ends up in browser history.

**Attack:** A future incident (or anyone with Vercel project read access:
contractors, support staff) can read customer names, emails, phones, and
order amounts from log retention without going through the app's auth layer.
Vercel logs are retained per the project plan; PII in logs falls under
PDPA Malaysia / GDPR if EU customers exist.

**Impact:** PII exfiltration through a side channel (logs) with no audit
trail back to the app. Lowers the bar for a breach: a compromised Vercel
account leaks more than just config.

**Suggested fix:** Scrub objects before logging — `console.error("invoice
send failed", { code: err?.code, status: err?.statusCode })`. Never log the
request body. Wrap all server route logging in a `logError(err, { route })`
helper that allow-lists fields.

---

### F-SEC-10: `/api/invoices/from-order?order_id=` is an unauthenticated IDOR over the entire orders table
**Severity:** High
**CWE / class:** CWE-639 Authorization Bypass Through User-Controlled Key
**Where:** `src/app/api/invoices/from-order/route.ts:73-244`

**Attack:** The handler reads `order_id` from the query string, runs
`.from("orders").select("*").eq("id", orderId).single()` using the
service-role client, and returns the full row plus the formatted PDF input —
customer_name, email, phone, location, address, items[], amounts, payment
status. `order_id` is a UUID v4, so blind enumeration is hard, but UUIDs
leak via:
- The Next.js dashboard pages which render `<a href="...?order_id=…">` and pass IDs through `searchParams`.
- The `case_code` column (`PP0001`, `PP0002`, …) is sequentially predictable — an attacker who learns a single UUID-to-case-code mapping (e.g. from a forwarded screenshot or a public quotation PDF in a customer's email) can pivot through the `/api/orders` POST/PATCH path (F-SEC-1) to enumerate.

Combined with F-SEC-1, this endpoint is the single richest PII sink:
one GET returns the full order row including customer address.

**Impact:** Per-order PII disclosure on direct fetch; combined with F-SEC-1,
mass disclosure.

**Suggested fix:** Require auth, then use the user-scoped
`createClient()` from `src/lib/supabase/server.ts` so that future
tightened RLS policies actually apply. Validate `order_id` as a UUID before
the DB call.

---

### F-SEC-11: `customer_name` and other free-text fields are interpolated into PostgREST `or()` filters server-side
**Severity:** Medium
**CWE / class:** CWE-1287 Improper Validation of Specified Type of Input (PostgREST filter injection)
**Where:**
- `src/app/(dashboard)/orders/page.tsx:47-51` — `query.or(\`customer_name.ilike.%${search}%,case_code.ilike.%${search}%\`)`
- `src/app/(dashboard)/orders/page.tsx:43` — `query.ilike("mode", \`%${mode}%\`)`

**Attack:** `search` and `mode` come straight from `searchParams` and are
interpolated into a PostgREST filter string. PostgREST treats `,` and `)` as
filter delimiters and supports nested filters. A crafted `search` containing
`,not.is.null` or similar can change the filter semantics. While
`@supabase/supabase-js` does URL-encode the values, the encoding does not
prevent semantic injection inside `or()` (this is documented as a known foot
gun — see Supabase docs on `.or()` requiring sanitised input). The `ilike`
wildcards `%` and `_` also let any anonymous (or authenticated) caller force
an unindexed full-table scan to amplify cost.

**Impact:** At minimum, an attacker can craft URLs that DoS the database via
slow scans. At worst, filter-clause injection alters which rows are returned
(e.g. discloses rows the future RLS policy intends to hide). Lower impact
than F-SEC-1 but worth fixing in tandem.

**Suggested fix:** Reject any `search` that contains `,`, `)`, `(`, `*`,
backslash before passing to `.or()`. Use `.textSearch()` with a tsvector
column for free-form search, or `.eq` against an enum for `mode`.

---

### F-SEC-12: `next-code` leaks order-volume signal anonymously
**Severity:** Low
**CWE / class:** CWE-200 Exposure of Sensitive Information to an Unauthorized Actor
**Where:** `src/app/api/orders/next-code/route.ts:8-52`

**Attack:** Unauthenticated GET returns `nextPP` and `nextPPAS` based on
the current max `case_code`. The two numbers tell anyone on the internet how
many purchase orders and aftersales cases Pulse Pilates has booked in total
— a competitive-intelligence leak and a fingerprint that lets an attacker
detect tampering after the fact.

**Impact:** Business-metrics disclosure. Not catastrophic on its own, but
combined with F-SEC-1 it gives the attacker the exact next code to use when
forging an order.

**Suggested fix:** Gate behind auth.

---

### F-SEC-13: No security headers — CSP, X-Frame-Options, HSTS, Referrer-Policy all absent
**Severity:** Medium
**CWE / class:** CWE-693 Protection Mechanism Failure (defence in depth)
**Where:** `next.config.ts:1-7` has no `headers()` function. `vercel.json` does not exist. The proxy/middleware (`src/lib/supabase/middleware.ts`) doesn't set any security headers.

**Attack:** Once an XSS or content-injection bug is found anywhere in the
dashboard (the React tree is mostly safe, but `dangerouslySetInnerHTML` is
not banned by ESLint — `eslint.config.mjs` is the default Next preset which
doesn't include `react/no-danger`), there is no CSP to contain it. There is
no `X-Frame-Options: DENY`, so the dashboard can be iframed (clickjacking
the "Delete Order" admin gate which currently relies on focus alone).
`Strict-Transport-Security` is provided by Vercel by default on `*.vercel.app`
but not on a future custom domain unless added explicitly.

**Impact:** Increases blast radius of any future bug. Currently
exploitable for clickjacking against an authenticated staff session: embed
`https://pulse-pilates.vercel.app/orders/<id>` in a 1px iframe, overlay
clicks, and trigger destructive actions while the user thinks they're on
another site.

**Suggested fix:** Add a `headers()` block in `next.config.ts` with CSP
(`default-src 'self'; script-src 'self'; frame-ancestors 'none'; ...`),
`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`,
`Referrer-Policy: strict-origin-when-cross-origin`,
`Permissions-Policy: camera=(), microphone=(), geolocation=()`, and
`Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
(safe even on `*.vercel.app`).

---

### F-SEC-14: Resend `from:` falls back to `onboarding@resend.dev` with no warning to the user
**Severity:** Low
**CWE / class:** CWE-451 User Interface Misrepresentation of Critical Information
**Where:** `src/app/api/invoices/send/route.tsx:269-278`

**Attack:** When `RESEND_FROM_EMAIL` is unset (as it is in
`.env.local` — line 7 has an empty `RESEND_API_KEY=` so the route currently
503s; once Resend is configured, the fallback path activates), invoices go
from `Pulse Pilates <onboarding@resend.dev>`. This is a shared Resend domain
that any other Resend free-tier user can also send from. Customers receiving
this email get no signal that the sender is dubious; meanwhile real
phishing emails from other tenants also originate from this address. Once
flagged by a spam filter, Pulse Pilates emails get bucketed too.

**Impact:** Customers may pay phishing invoices that look indistinguishable
from real Pulse invoices (especially in combination with F-SEC-7); brand
damage on spam-list inclusion.

**Suggested fix:** Refuse to send if `RESEND_FROM_EMAIL` is unset (return
503 instead of falling back). Once configured, also send a
`Reply-To: hello@pilatesreformer.my` and align SPF/DKIM/DMARC on
`pilatesreformer.my`.

---

### F-SEC-15: Dependency posture — `lucide-react@1.7.0` looks anachronistic; double-check supply chain
**Severity:** Informational
**CWE / class:** CWE-1395 Dependency on Vulnerable Third-Party Component
**Where:** `package.json:23`

**Attack:** `lucide-react` real releases are 0.x; a `^1.7.0` version is
either a typo (and resolves to something completely unexpected on a fresh
install — the lockfile is 418 KB but worth diffing) or a typosquat. The
other deps (`next@16.2.2`, `react@19.2.4`, `resend@6.10.0`,
`@react-pdf/renderer@4.3.2`, `@supabase/ssr@0.10.0`, `@supabase/supabase-js@2.101.1`,
`zod@4.3.6`) are within normal release lines for the audit-date (2026-04-28).
`@react-pdf/renderer` has had historical advisories around font-loading
SSRF when given a remote URL — the codebase only ever passes `data:` URIs
from local files (`src/app/api/invoices/pdf/route.tsx:11-21`), so this is
fine, but worth keeping pinned.

**Impact:** If `lucide-react@1.7.0` is in fact a malicious package, the
attacker controls icon-component code rendered into every dashboard page —
keystroke capture, session theft.

**Suggested fix:** Run `npm view lucide-react@1.7.0 dist.tarball repository`
and compare against the upstream GitHub. If genuine, fine. If not, downgrade
to a known-good 0.x release. Add `npm audit` and `pnpm audit --prod` (or
Trivy/Snyk) to CI, and enable Vercel's "Block deploys with critical CVEs".

---

## Summary by Severity

| ID        | Severity      | Topic                                                         |
|-----------|---------------|---------------------------------------------------------------|
| F-SEC-1   | Critical      | API routes unauthenticated, use service_role                  |
| F-SEC-2   | Critical      | Public Supabase signup + permissive RLS                       |
| F-SEC-3   | Critical      | Admin delete password trivial + bypassable                    |
| F-SEC-4   | High          | Long-lived secrets in `.env.local` and CLAUDE memory          |
| F-SEC-5   | High          | Weak Supabase auth policy (6-char, no MFA, no captcha)        |
| F-SEC-6   | High          | PDF endpoints unauth + unvalidated → forged invoices          |
| F-SEC-7   | High          | `/invoices/send` is an open mail relay for branded PDFs       |
| F-SEC-8   | High          | `/sync/sheets` static bearer with no replay protection        |
| F-SEC-9   | Medium        | PII leaking into Vercel logs via `console.error`              |
| F-SEC-10  | High          | `/invoices/from-order` IDOR over orders table                 |
| F-SEC-11  | Medium        | PostgREST filter injection / cost amplification via `.or()`   |
| F-SEC-12  | Low           | `next-code` leaks order-volume signal                         |
| F-SEC-13  | Medium        | No security headers / CSP / X-Frame-Options                   |
| F-SEC-14  | Low           | Resend fallback to `onboarding@resend.dev` brand confusion    |
| F-SEC-15  | Informational | `lucide-react@1.7.0` version anomaly                          |

## Remediation order (recommended)

1. **Today:** Rotate Supabase anon+service keys, Chatdaddy key, the management token in MEMORY.md, and `ADMIN_DELETE_PASSWORD`. Set `disable_signup: true` in Supabase Auth.
2. **This week:** Rewrite RLS policies to restrict to the two staff emails. Add `supabase.auth.getUser()` guard at the top of every API route handler. Delete `src/app/api/orders/[id]` DELETE or fold it behind the same gate as `/api/orders/delete`.
3. **Next sprint:** Zod-validate every API body. Replace the `ADMIN_DELETE_PASSWORD` gate with re-auth via Supabase. Lock down `/invoices/send` to lookup-by-order-id only. Add security headers in `next.config.ts`. Enforce MFA for both staff users. Scrub PII from logs.
4. **Backlog:** HMAC the Google Sheets sync. Migrate free-text filters to `textSearch`. Audit `lucide-react@1.7.0`. Add SAST (Semgrep `p/owasp-top-ten`) and `npm audit` to CI.
