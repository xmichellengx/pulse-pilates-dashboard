# Reliability & UX Consistency Audit

Audit of pulse-pilates dashboard for bugs, race conditions, error-handling holes, validation gaps, and stale-state issues across quotations, orders, invoices, leads, and calls.

---

### F-UX-1: Convert-to-order succeeds even when quotation link-back fails silently
**Severity:** High
**Where:** `src/components/quotations/quotations-client.tsx:218-231`
**Symptom:** User clicks "Convert to Order" and sees the green success toast "Order created with full breakdown." The orders list does indeed contain the new row, but the source quotation is *still* shown as "Active" / not converted in the list (until next router refresh races in), and the table chip stays green. If the user clicks Convert again they create a duplicate order; no DB constraint stops them. Same pattern as the recently-fixed convert bug.
**Root cause:** After the `INSERT` into `orders` succeeds, the follow-up `UPDATE quotations.converted_to_order` only logs to console on failure (`console.error("Failed to link quotation -> order:", updateErr)`), and the optimistic `setQuotations` still writes `orderId` into local state. So local UI says "Converted" while the DB row still has `converted_to_order = null`, *and* the success toast fires regardless. The next time `refreshList()` runs (or after `router.refresh()`), the row flips back to Active and the user is confused — or they click Convert again.
**Reproduce:**
1. Open a quotation that has not been converted.
2. Block PATCH/PUT to `quotations` (e.g. revoke RLS update permission, or simulate a network blip on just the second request).
3. Click Convert to Order. Observe success toast and "Converted" badge in the modal.
4. Hard refresh. Quotation reverts to Active. Click Convert again → duplicate order.
**Suggested fix:** Treat the update failure as a hard error: roll back the inserted order (or surface a warning toast like "Order created but quotation link failed — refresh"), and don't apply the optimistic local update unless the second request succeeded.

---

### F-UX-2: Mark-as-Sent toggle updates UI before the DB write — no error check
**Severity:** High
**Where:** `src/components/quotations/quotations-client.tsx:240-254`
**Symptom:** Clicking "Mark as Sent" instantly flips the badge and shows toast "Marked as Sent to Customer", even when the underlying Supabase update silently fails (RLS denial, offline, etc.). The user thinks the customer has been marked as contacted; on next page load the badge reverts.
**Root cause:** `await supabase.from("quotations").update(...)` has no `.select()` and no `if (error)` check. The result is discarded. Then `setQuotations` and the success toast fire unconditionally. The function is only wrapped in `try { ... } catch { toast.error("Failed to update") }` — but a Supabase error returns `{ data: null, error: {...} }` and does *not* throw, so the catch never fires.
**Reproduce:**
1. Temporarily revoke update RLS on the `quotations` table.
2. Click "Mark as Sent".
3. UI shows blue "PDF Sent" badge with success toast. Refresh → reverts to Active.
**Suggested fix:** `const { error } = await supabase.from(...).update(...).eq(...)`. If `error`, throw it so the catch handles it. Apply the same pattern wherever Supabase mutations are awaited without checking `error`.

---

### F-UX-3: Invoices "Mark as Sent" updates local state before knowing the API succeeded
**Severity:** High
**Where:** `src/components/invoices/invoices-client.tsx:303-316` and `106-125` (modal `handleToggleSent`)
**Symptom:** From the detail modal, toggling Sent calls `onMarkSent` from the parent, which immediately mutates `invoices` and `selectedInvoice` optimistically *before* the PATCH has resolved. The modal's `handleToggleSent` already awaits the PATCH and calls back, but the parent's handler doesn't accept a success flag and toggles state unconditionally. If the PATCH 500s, the modal toasts "Failed to update" while the parent list happily shows "Sent" until `refreshInvoices()` catches it (a second async request later).
**Root cause:** Two separate toggle paths racing — `handleToggleSent` in the modal (does the network call, toasts on its own) and `handleMarkSent` in the parent (does an optimistic local toggle, then triggers a refresh). They can disagree for several hundred milliseconds, and during that window the list and modal show conflicting state.
**Reproduce:** Throttle to slow 3G in DevTools, click Mark as Sent. List flips to Sent immediately; modal toasts an error a second later; list reverts after refresh completes. Conflicting UI.
**Suggested fix:** Have `handleToggleSent` return success/failure, and `handleMarkSent` only flip local state on success. Or just rely on `refreshInvoices()` — drop the optimistic mutation.

---

### F-UX-4: Quotation detail line totals omit customisation surcharge
**Severity:** High
**Where:** `src/components/quotations/quotations-client.tsx:567-579`
**Symptom:** In the quotation detail modal, line items render as `{currency} {(item.unit_price * item.qty).toLocaleString()}` for the line total, with the customisation surcharge shown separately as "+RM 300 custom". But the *quotation builder*, the *PDF*, and the *order detail modal* all compute the line total as `(unit_price + customisation_surcharge) * qty`. So the quotation modal under-states the line total whenever there is a colour/logo surcharge. The "Equipment subtotal" further down uses `q.subtotal`, which *was* computed correctly with surcharges, so the line items and subtotal won't sum to the same number — visually inconsistent.
**Root cause:** The line formula was not updated when surcharge-per-unit became the convention.
**Reproduce:** Build a quotation: 2 reformers, retail tier (RM 300 colour surcharge per unit), unit price RM 5000. Save. Open detail modal. Line shows "RM 10,000" plus "+RM 300 custom" — but subtotal shows RM 10,600. Numbers don't add up.
**Suggested fix:** Replace `item.unit_price * item.qty` with `(item.unit_price + (item.customisation_surcharge ?? 0)) * item.qty` to match every other render path.

---

### F-UX-5: New-order form silently drops `delivery_fee` and `installation_fee` on save
**Severity:** High
**Where:** `src/app/(dashboard)/orders/new/page.tsx:284-305` (payload) vs `225-229` (computedTotal)
**Symptom:** User enters delivery RM 250 and install RM 160 on the new-order page. The right-hand WA preview and the "Total" line correctly include those fees. After Save, the order row in the DB has `amount = computedTotal` (good) but `delivery_fee` and `installation_fee` are `null` because they're never sent in the payload. Open the order detail modal — the Pricing Breakdown section is empty for those rows, and warranty/receipt PDFs that derive sub-amounts from `delivery_fee` will be wrong. Discounts and line items are also dropped (only smushed into a remarks string).
**Root cause:** The payload object built at line 284 only includes `customer_name`, `phone`, `email`, `product_name`, `units`, `mode`, `payment_type`, `amount`, `monthly_rental`, `balance`, `delivery_date`, `location`, `address`, `lead_source`, `market`, `status`, `remarks`. The structured `delivery_fee`, `installation_fee`, `items`, `discounts`, `additional_charges`, `subtotal`, `studio_name`, `pricing_tier` fields are all known to exist on the `orders` table (see `orders-table.tsx:Order` type and `quotations-client.tsx` convert path) but never written here.
**Reproduce:** Create an order via /orders/new with custom delivery+install fees and a discount. Open it from the orders list — the Pricing Breakdown section is missing or shows only "Total". Generate a receipt — line items are absent.
**Suggested fix:** Include `delivery_fee`, `installation_fee`, `subtotal`, `discounts`, `additional_charges`, `items` in the payload, mirroring the structure used by convert-to-order.

---

### F-UX-6: Browser refresh / navigation on /orders/new wipes the entire form without warning
**Severity:** Medium
**Where:** `src/app/(dashboard)/orders/new/page.tsx` — no `beforeunload` handler, no localStorage persistence
**Symptom:** User spends 5 minutes filling in line items, address, discount labels, then accidentally clicks "Back to Orders", or refreshes, or navigates away. All state is gone. No "are you sure?" warning, no autosave, no draft.
**Root cause:** Form state lives entirely in `useState` with no persistence layer. The `<Link href="/orders">` Cancel button doesn't check dirty state either.
**Reproduce:** Fill in 5 fields. Click "Back to Orders" link in header. Form is gone with no prompt.
**Suggested fix:** Wire a `useBeforeUnload` (warn on refresh/close) and a confirm dialog on Cancel/Back if any field is dirty. Optionally persist drafts to localStorage keyed on a session id.

---

### F-UX-7: Closing the order detail modal in edit mode discards changes with no warning
**Severity:** Medium
**Where:** `src/components/orders/order-detail-modal.tsx:182-195` (Escape handler) and `582-584` (backdrop click guard)
**Symptom:** While in edit mode, pressing Escape cancels the edit silently (no confirm) even if dozens of fields, line items, and discount rows were modified. Backdrop click is correctly disabled (good), but Escape isn't, and the explicit Cancel button is also a single-tap discard with no confirmation.
**Root cause:** The Escape key handler at lines 184-191 just calls `setIsEditing(false); setEditingOrder(currentOrder)` without comparing to original state or asking the user.
**Reproduce:** Click an order, click Edit, change 10 fields, hit Escape. All work lost, no toast, no prompt.
**Suggested fix:** Track a `dirty` flag (or shallow-compare `editingOrder` to `currentOrder`), and prompt before discarding when dirty. Apply to both Escape and the Cancel button.

---

### F-UX-8: Invoice form silently swallows fetch network errors as "info" toasts
**Severity:** Medium
**Where:** `src/components/invoices/invoice-form.tsx:174-192`
**Symptom:** Clicking "Send via Email" when the server returns 500 or the network is down shows a misleading `toast.info("Email sending coming soon")` — same message as the not-implemented case. The user has no idea something actually failed.
**Root cause:** `handleSendEmail` checks `res.status === 503` for the not-implemented path, then assumes everything else is success (it doesn't check `res.ok` either). The catch branch then toasts the same "coming soon" message on real network errors. There's also no validation that `customer_email` is well-formed before posting — and `customer_email` schema is `z.string().optional()` (no `.email()`).
**Reproduce:** Disable Wi-Fi, click Send via Email. Get "Email sending coming soon" toast.
**Suggested fix:** Check `res.ok` explicitly; show `toast.error` on actual failures; gate the button on a real email regex (and tighten the Zod schema to `z.string().email().or(z.literal("")).optional()`).

---

### F-UX-9: Quotation builder PDF generation has no quotation-record check — PDF can be generated for an unsaved/blank quotation
**Severity:** Medium
**Where:** `src/components/quotations/quotation-builder.tsx:735-776`
**Symptom:** On the Review step, "Generate PDF Quotation" downloads a PDF with `QUO-YYYYMMDD-NNN` even if the user hasn't saved. If the user later saves, they get a *different* quotation number on the saved record, so the PDF in the customer's hand cites a number that doesn't exist in the DB.
**Root cause:** `handleGeneratePDF` calls `generateQuotationNumber()` if `savedQuotationNumber` is empty, but never persists that generated number anywhere. The next save call generates a fresh random number. There's also no minimum validation (no product, no customer name) before generating the PDF — clicking PDF on a blank Review step will produce a malformed document.
**Reproduce:** Open New Quotation, click straight through to Review without products → click Generate PDF. Server returns a PDF (or errors), but no client-side guard.
**Suggested fix:** Force Save before allowing PDF generation, OR cache the generated number into `savedQuotationNumber` *and* into the eventual save payload. Also gate the PDF button on `canProceed()` for steps 1 and 2.

---

### F-UX-10: Calls log filterDate uses string comparison — works only because dates are ISO; agent filter is case-sensitive
**Severity:** Low
**Where:** `src/components/calls/call-log-client.tsx:121-128`
**Symptom:** Two issues — (a) the agent filter list comes from `[...new Set(calls.map(c => c.agent))]`, so any whitespace/capitalisation drift in the free-text "Agent name" input creates duplicate filter options (e.g. "Aisy" and "aisy " both appear). (b) The notes-edit input has no length cap and no trim before save — easy to accidentally save a 50KB blob.
**Root cause:** Agent is a free-text Input (line 216) rather than a dropdown of the two known users. Notes save (`saveNotes`, line 76) sends the raw textarea content. Also: `setEditingNotes(null)` always runs in `finally`, so even after a failed save the edit closes — the user loses their unsaved notes text.
**Reproduce:** Log a call with agent typed as " Aisy" (leading space). Filter dropdown now shows two Aisy entries. Open an existing notes edit, type a long note, kill the network, save → notes box closes silently with text lost.
**Suggested fix:** Replace agent input with a select; trim+validate before save; don't run `setEditingNotes(null)` in `finally` when save failed.

---

### F-UX-11: New-order page validates only customer_name + case_code — phone, mode, status, market all accept blank/invalid
**Severity:** Medium
**Where:** `src/app/(dashboard)/orders/new/page.tsx:246-247`
**Symptom:** Required fields per the form (Phone marked with `*`, line items, lead source, payment type) are not validated at submit time. A user can save an order with no phone, no line items, no payment type. Likewise, qty/unit_price fields use `parseInt(...) || 1` / `parseFloat(...) || 0`, so typing "abc" silently coerces to 1 or 0 with no feedback. Pricing fees accept negative numbers (HTML `min={0}` is enforced by the browser only, not on submit; cleared inputs become empty strings stored as 0).
**Root cause:** No Zod/RHF schema on this page; manual ad-hoc checks. The Phone field has a `*` label but no validator. Form payload sends `phone: form.phone.trim() || null`, so an empty phone is silently saved as null.
**Reproduce:** Open /orders/new, fill only customer name and case code. Click Save → succeeds with no warning. Resulting order has no phone, no line items, no mode info beyond defaults.
**Suggested fix:** Define a Zod schema mirroring required fields; show inline errors; reject submit until valid.

---

### F-UX-12: Receipt generation makes two sequential PDF requests on rapid double-click
**Severity:** Medium
**Where:** `src/components/orders/order-detail-modal.tsx:441-520` (`handleGenerateReceipt`)
**Symptom:** The "Generate Receipt" button in the receipt-fields dialog calls `setShowReceiptForm(false)` then `await generateInvoicePDF(...)`. If the user double-clicks Generate Receipt within the ~50ms before the dialog hides, two PATCH-to-orders calls and two PDF requests fire concurrently. The PDF flow also writes an invoice row each time (`/api/invoices` POST at line 398-409), so the user ends up with two duplicate invoices logged in the DB and two PDF downloads.
**Root cause:** The submit button (`handleGenerateReceipt`) is gated by `disabled={generatingReceipt}`, but `setGeneratingReceipt(true)` doesn't run until inside `generateInvoicePDF`. Between the click handler firing and the loading flag flipping, a second click is allowed. Same risk on the Rental form button (which has *no* disabled state at all — line 1722).
**Reproduce:** Open Receipt dialog, double-click "Generate Receipt" fast. Two PDFs download; two invoice rows appear in the invoices table.
**Suggested fix:** Flip the loading state synchronously at the very start of the click handler before any await; also add `disabled={generatingRental}` to the rental dialog's Generate PDF button.

---

### F-UX-13: Order list shows new/edited orders, but quotation conversions don't appear without `router.refresh()` quirks
**Severity:** Medium
**Where:** `src/components/orders/orders-table.tsx:185-191` and `src/components/quotations/quotations-client.tsx:231`
**Symptom:** After converting a quotation to an order, the user clicks "Open Orders to finish" (or just navigates to /orders) and the new order may not appear in the list, depending on the order of the local optimistic state vs server fetch. The orders table accepts an initial server-rendered `orders` prop, holds it in `localOrders`, and only mutates that via `handleOrderUpdate` (which never inserts new rows). So a newly-created order from another page won't appear until full page reload.
**Root cause:** `router.refresh()` is called in the convert path, but the orders client component never re-derives `localOrders` from updated `orders` prop changes (no `useEffect([orders])` syncing).
**Reproduce:** Open /quotations, convert one. Navigate to /orders via the sidebar (which uses Next.js client routing). The new order may be missing if the previous /orders fetch is cached. Cmd-click or full reload shows it.
**Suggested fix:** Add `useEffect(() => setLocalOrders(orders), [orders])` so the table re-syncs when the server payload changes.

---

### F-UX-14: Orders search timer attached to `window` — multiple tabs/multiple components share the same global timer
**Severity:** Low
**Where:** `src/components/orders/orders-table.tsx:229-231`
**Symptom:** The search debouncer uses `(window as any).__searchTimer` to hold the timeout id. If a future page also debounces against `__searchTimer` (or the orders table is unmounted/remounted via Suspense), the timers can stomp on each other. Hard to reproduce today but the pattern is fragile — and `any`-cast in production code is a smell.
**Root cause:** Lazy use of a global instead of `useRef`.
**Suggested fix:** Replace with `const timerRef = useRef<NodeJS.Timeout | null>(null)`.

---

### F-UX-15: Dashboard "Pending Deliveries" never returns rows because the query filters on a non-existent status value
**Severity:** High
**Where:** `src/app/(dashboard)/page.tsx:52-57`
**Symptom:** The Pending Deliveries card on the home dashboard always shows "All clear! No pending deliveries", because the Supabase query filters `eq("status", "Pending Delivered")` — but the canonical status values in the order modal and orders table are `"Pending Delivery"` (no `-ed`) and `"Pending Shipment Arrival"`. So either the dashboard card is permanently empty, or there's a small set of legacy orders that happen to have the typo'd "Pending Delivered" status. The "Rental Follow-ups" query at line 74 has the same issue — it ORs `["Delivered", "Pending Delivered"]`, missing `"Pending Delivery"` and `"Pending Shipment Arrival"`.
**Root cause:** Status enum drift — the dashboard was authored against a version of the schema that had "Pending Delivered" but the rest of the app uses "Pending Delivery". The STATUS_COLORS map in `orders-table.tsx:85-93` even lists both spellings, suggesting prior confusion.
**Reproduce:** Have any orders with `status = "Pending Delivery"` or `"Pending Shipment Arrival"`. They will not appear on the dashboard card despite obviously being pending.
**Suggested fix:** Standardise on one spelling across the schema. Replace `eq("status", "Pending Delivered")` with `.in("status", ["Pending Shipment Arrival", "Pending Delivery"])` (and similarly for the rentals query).

---

## Summary

Most impactful patterns:

1. **Supabase mutations without `error` checks** — F-UX-1, F-UX-2, F-UX-3 all exhibit the "silent failure + optimistic UI" pattern the convert-to-order bug introduced. Best fixed with a small helper that throws on `{ error }` from Supabase responses, used everywhere.
2. **Status enum drift between dashboard and rest of app** (F-UX-15) — easy fix, but means the dashboard's most prominent card is effectively dead today.
3. **/orders/new payload omits half the structured fields** (F-UX-5) — every order created via this page is missing breakdown data that other flows rely on (Receipt PDFs, modal pricing breakdown).
4. **No dirty-state protection** on /orders/new (F-UX-6) and order edit mode (F-UX-7) — high frustration potential when accidentally clicked away.
5. **Double-submit guards inconsistent** — F-UX-12, plus rental dialog has no `disabled` at all.

Quick wins (under an hour each): F-UX-2, F-UX-3, F-UX-4, F-UX-14, F-UX-15. Deserve dedicated tickets: F-UX-1, F-UX-5, F-UX-6, F-UX-11.
