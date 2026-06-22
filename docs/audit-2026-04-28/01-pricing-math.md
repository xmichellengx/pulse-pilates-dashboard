# Pricing Math Audit — 2026-04-28

Scope: Quotation builder, quotation PDF, invoice from-order, invoice PDF, order detail modal, orders/new, invoices/send, formatCurrency utility.

Reference bug fixed in bb02340: `customisation_surcharge` was added flat (not × qty) in quotation builder, while PDF rendered it × qty — subtotal/total mismatch at qty > 1. The findings below are bugs of the same shape (silent miscalculation of money) plus other arithmetic / rounding / consistency issues found in the same files.

---

### F-MATH-1: Quotation PDF uses RETAIL customisation prices regardless of the customer's pricing tier — visible line totals overstate the cost relative to the Grand Total
**Severity:** Critical
**Where:** `src/components/quotations/quotation-builder.tsx:738-756`, `src/app/api/quotations/pdf/route.tsx:264-269, 419-442`
**Symptom:** A P4B T2 (MY) customer with colour customisation pays customisation at RM 100/unit (T2 pricing). The Grand Total on the PDF is correct, but the customisation row visible on the PDF shows RM 300/unit (retail price) — the column "Total Price" sums to a number LARGER than the Grand Total. The customer sees a quotation whose item totals don't match the bottom line.
**Root cause:** `handleGeneratePDF` does NOT include `pricing_tier` in the payload sent to `/api/quotations/pdf`. The PDF route then calls `getCustomisationPrices(market, props.pricing_tier)` with `pricing_tier === undefined`, which falls through to the retail branch (`{ colour: 300, logo: 350 }` for MY, `{ colour: 150, logo: 175 }` for SG). For P4B T2 (or T1, where it should be free) this overstates each customisation row.
**Reproduce:** Create a P4B T2 quotation, MY market, retail Reformer (e.g. RM 18,000), qty 2, tick "Colour customisation". Builder review/Grand Total: 2 × (18,000 + 100) = 36,200. Generate PDF: equipment row shows 36,000, customisation colour row shows 300 × 2 = 600, table visible total = 36,600, but Grand Total prints 36,200. Customer sees inconsistent figures.
**Suggested fix:** Pass `pricing_tier: watchedValues.pricing_tier` in the payload at quotation-builder.tsx:745. The PDF route already reads `props.pricing_tier`.

---

### F-MATH-2: Quotation PDF customisation rows use a fresh per-tier lookup table — diverges from the actually stored `customisation_surcharge` on each line
**Severity:** Critical
**Where:** `src/app/api/quotations/pdf/route.tsx:299, 427-428, 439-440`
**Symptom:** Even if `pricing_tier` IS passed (after fixing F-MATH-1), the PDF table rows render customisation as `customPrices.colour * item.qty` rather than `item.customisation_surcharge`. If a user manually overrode the surcharge during the quotation (e.g. negotiated discount on customisation), or if the surcharge was set under a different tier and the tier was subsequently changed but the auto-recompute effect at quotation-builder.tsx:649-673 missed an edge case, the PDF customisation row no longer equals what's baked into the Grand Total.
**Root cause:** The PDF re-derives customisation prices from `(market, pricing_tier)` instead of trusting the stored `item.customisation_surcharge` (which IS what was added to `total`).
**Reproduce:** Save a quotation with item.customisation_surcharge manually adjusted in DB to, say, 200 (instead of the tier default 100). Regenerate PDF. The customisation row shows 100, the Grand Total reflects 200. The line-by-line sum no longer equals the printed Grand Total.
**Suggested fix:** Render customisation rows using `item.customisation_surcharge * item.qty` directly. Treat the stored surcharge as the source of truth, matching how `subtotal` was computed.

---

### F-MATH-3: Rental Activation in quotation PDF hardcodes a 4-month deposit, but the builder Review screen shows 2 months for P4B T2 — PDF and on-screen amount disagree
**Severity:** Critical
**Where:** `src/app/api/quotations/pdf/route.tsx:302-303, 494-501` vs `src/components/quotations/quotation-builder.tsx:1374-1377`
**Symptom:** A P4B T2 rental quotation: the builder's Review step displays "Deposit (2 months) = monthly × 2". The PDF that's emailed to the customer displays "Deposit 4 Months" and Rental Activation = monthly + 4×monthly + delivery + install. The customer is quoted a deposit twice as large as what the sales team sees and what was agreed verbally.
**Root cause:** PDF route hardcodes `deposit4M = monthlyTotal * 4` regardless of `pricing_tier`. Builder uses `(pricing_tier === "p4b_t1" ? 4 : 2)`. There is no tier-aware deposit logic on the PDF side, and `pricing_tier` isn't even passed to it (F-MATH-1).
**Reproduce:** Create a P4B T2 rental quotation, monthly = RM 1,000. Review shows: Deposit (2 months) = RM 2,000. Generate PDF: shows "Deposit 4 Months = 4,000", Rental Activation = 1,000 + 4,000 + delivery + install — RM 2,000 more than the sales screen.
**Suggested fix:** Pass `pricing_tier` to the PDF route and compute `depositMonths = pricing_tier === "p4b_t1" ? 4 : 2` (and decide what to do for retail rentals — currently the builder skips a numeric deposit there).

---

### F-MATH-4: Quotation PDF rental table ignores quantity — multi-unit rentals show "/month" and "12 months" totals as if qty were 1
**Severity:** Critical
**Where:** `src/app/api/quotations/pdf/route.tsx:469-470`
**Symptom:** Rental order for 2 Reformers at RM 1,000/month each: PDF table prints "/month: 1,000" and "12 months: 12,000". Rental Activation total at the bottom IS correct (it uses `monthlyTotal = unit_price * qty` summed). The table rows do not. Customer sees a per-line monthly amount that contradicts the activation total.
**Root cause:** Lines 469-470 do `{item.unit_price.toLocaleString()}` for the /month column and `{(item.unit_price * 12).toLocaleString()}` for the 12-month column without multiplying by `item.qty`.
**Reproduce:** Create a rental quotation with 2× Reformer at RM 1,000/month. Generate PDF. Per-row /month = 1,000 (should be 2,000); 12 months = 12,000 (should be 24,000). Grand Activation row at the bottom correctly sums qty so the document is internally inconsistent.
**Suggested fix:** Multiply both `/month` and `12 months` columns by `item.qty`.

---

### F-MATH-5: `formatCurrency()` rounds to zero decimal places — any cents from manual prices, discounts, or back-calculated unit_price disappear silently
**Severity:** High
**Where:** `src/lib/utils.ts:8-15`
**Symptom:** Used in `src/components/orders/order-detail-modal.tsx` Pricing Breakdown (line totals, subtotal, delivery, installation, Total). A discount of RM 99.50 displays as "RM 100"; a back-calculated unit price of RM 1,500.50 displays as "RM 1,500" while internal arithmetic carries the cents. Operators see breakdowns that don't add up by RM 1.
**Root cause:** `minimumFractionDigits: 0, maximumFractionDigits: 0` strips cents at the display layer. The arithmetic underneath uses full floats.
**Reproduce:** Open order detail modal in edit mode. Enter unit price 1500.50, qty 2, customisation 99.50. Line total shows "RM 3,200" (correctly 3,200.00). Add discount 100.50. Computed total displays "RM 3,250" but actually 3,249.50. Click "Apply to Amount" — the saved amount is 3,249.50; the user thinks they saved 3,250.
**Suggested fix:** Default `minimumFractionDigits: 2, maximumFractionDigits: 2`. Invoice PDF (`fmt` in `src/app/api/invoices/pdf/route.tsx:332`) already uses 2 decimals — be consistent across the app.

---

### F-MATH-6: Legacy back-calculation in `from-order` hardcodes delivery fee = 150 — fires on real SG orders and any rental with a positive `order.amount`
**Severity:** High
**Where:** `src/app/api/invoices/from-order/route.ts:181-194`
**Symptom:** Two failure modes:
  (a) For any non-rental order that has no stored breakdown (legacy orders OR orders created via `/orders/new`, which does NOT save `subtotal`/`items` — see F-MATH-9), invoice generation back-calculates `equipmentAmount = order.amount - 150 - 0`. For an SG order (delivery_fee should be 80), this overstates equipment by 70 SGD and prints a "Product Delivery: RM 150" line on a Singapore invoice. RM not SGD too (F-MATH-7).
  (b) For rental orders, line 187 sets `deliveryFee = totalAmount - monthlyRental - 0`. `totalAmount` is `order.amount` which from the quotation conversion is the on-PDF "Total" (monthly + delivery + install - discount + additional charges, NOT including deposit). So `deliveryFee = delivery + install - discount + additional`. If the order had a discount that exceeded delivery+install, deliveryFee can be negative (then clamped to 0). If the order had a sizable additional charge, deliveryFee > 1000 and the "sanity cap" forces it back to 150 silently. The invoice then shows "Product Delivery: 150" even when the customer never paid 150.
**Root cause:** Hardcoded 150 and the "sanity cap" pattern guess a fee instead of refusing to back-calculate when no breakdown exists.
**Reproduce (a):** Create order via `/orders/new` for an SG customer (delivery_fee saved to form but never persisted to DB — see F-MATH-9). Generate invoice. Delivery line says 150 (should be 80 SGD).
**Reproduce (b):** Convert a rental quotation with a RM 2,000 additional charge to an order. order.amount = monthly (1000) + delivery (150) + install (0) + 2000 = 3150. Legacy fallback (if breakdown detection fails): deliveryFee = 3150 - 1000 = 2150 → sanity cap → 150. Equipment amount becomes correct by accident, but the delivery line on the invoice is wrong.
**Suggested fix:** When breakdown is absent, render a single "Order Total" line item instead of fabricating component fees. Or read market from order.market and pick 80/150 accordingly while still emitting a clear warning.

---

### F-MATH-7: Invoice PDF column headers hardcode "(RM)" — Singapore orders show RM in the table header and rental details even when the customer pays in SGD
**Severity:** High
**Where:** `src/app/api/invoices/pdf/route.tsx:439-440, 525`
**Symptom:** A Singapore customer receives an invoice with the column headers "Unit Price (RM)" and "Amount (RM)" and a rental details line "Rental Amount: RM <amount> / monthly". The numbers in those columns are SGD figures (passed through from order.amount and order.monthly_rental, which were captured in SGD). Currency mismatch on a legal document.
**Root cause:** `InvoicePDFInput` does not carry a `currency` field. The PDF hardcodes "RM" in three places. `from-order` route never reads `order.market` to set currency.
**Reproduce:** Create an SG order (PPAS code prefix, market=SG, monthly_rental in SGD), generate any of invoice / receipt / rental PDF. All money labels say RM.
**Suggested fix:** Add `currency: "MYR" | "SGD"` to `InvoicePDFInput`; derive from `order.market` in `from-order/route.ts`; render `${currency}` in headers and the rental detail line.

---

### F-MATH-8: `Math.round(total * 0.6) + Math.round(total * 0.4)` can drift by 1 unit from `total` — booking fee + balance won't reconcile
**Severity:** Medium
**Where:** `src/components/quotations/quotation-builder.tsx:1395, 1399`; `src/app/api/quotations/pdf/route.tsx:533, 537`
**Symptom:** For most integer-RM totals the two halves sum back to `total`, but for many non-integer totals (after discounts/charges produce cents) the sum is off by 1 unit. Example: total = 3,000.50 → round(1,800.30) = 1,800; round(1,200.20) = 1,200; sum = 3,000 (should be 3,001 when ceiling, or remain 3,000.50). Customer pays the rounded booking fee, then the displayed "balance 40%" doesn't equal `total - paid`.
**Root cause:** Two independent roundings of complementary fractions, then displayed as if they sum to the total.
**Reproduce:** Save a quotation with total 3,000.50 (e.g. after a discount of 50 cents — formatCurrency would mask this but it can arise from any cents-producing combination). Booking-fee + balance shown = 4,200; total shown = 4,201, or vice versa, depending on tier configuration.
**Suggested fix:** Compute booking = `Math.round(total * 0.6)`, then balance = `total - booking` so the two always sum to `total`.

---

### F-MATH-9: `/orders/new` saves `amount: computedTotal` but does NOT persist `subtotal`, `delivery_fee`, `installation_fee`, `items`, `discounts`, or `additional_charges` — invoices for these orders fall through to legacy back-calc and lose the breakdown
**Severity:** High
**Where:** `src/app/(dashboard)/orders/new/page.tsx:284-305` (POST payload), then triggers fallback at `src/app/api/invoices/from-order/route.ts:103-106, 176-208`
**Symptom:** Any order created via the standalone "New Order" page (NOT via convert-to-order) has no stored breakdown. When the operator later generates an invoice, `hasStoredBreakdown` is false (because `subtotal == null`, `delivery_fee == null`, `items == null`), and the route takes the legacy back-calc path: hardcoded RM 150 delivery, equipment = amount - 150, no discount lines on the invoice. The customer-facing invoice misrepresents the deal.
**Root cause:** The form has fields for `delivery_fee`, `installation_fee`, `discounts`, and `lineItems`, but the POST body sends only `amount`, `monthly_rental`, `balance`, and the joined `product_name`. The discount and line item details are folded into the `remarks` string only.
**Reproduce:** Use `/orders/new`, add a Reformer line item RM 18,000 × 2, add a "Referral" discount RM 500, delivery RM 250, installation RM 160. computedTotal = 35,910. Save. Generate invoice from the order — the invoice will show a single Reformer line at unit_price = round((35,910 - 150)/2) = 17,880, qty 2, delivery RM 150 (not 250), no discount, no installation. Total stays 35,910 but the line composition is wrong.
**Suggested fix:** Make `/orders/new` POST persist `subtotal`, `delivery_fee`, `installation_fee`, `items` (as structured jsonb), `discounts`, and `additional_charges` so the stored-breakdown path is taken on invoice generation.

---

### F-MATH-10: Convert-to-order sets `amount = q.total` for rental quotations, but `q.total` doesn't include the rental deposit — the order's stored Total understates what the customer actually pays at activation
**Severity:** High
**Where:** `src/components/quotations/quotations-client.tsx:191`; deposit math in `src/components/quotations/quotation-builder.tsx:677-683` and `src/app/api/quotations/pdf/route.tsx:301-303`
**Symptom:** A rental quotation's `total` = `subtotal (= first month rental × qty) + delivery + install - discount + additional`. The PDF prints "Rental Activation = monthlyTotal + delivery + install + deposit4M". When the quotation is converted, `order.amount = q.total` — the deposit is silently dropped. Downstream:
  - The Order Detail Financials panel displays this lower number as the order's Amount.
  - The "Amount Paid" derivation in invoice PDF (`deposit = total - balance`) will be wrong if the operator manually set balance.
  - The rental invoice/receipt total no longer matches what the customer transferred at activation.
**Root cause:** No rental-aware total in the conversion path; `q.total` is used regardless of purchase mode.
**Reproduce:** Quote: P4B T1 rental, monthly RM 1,000, delivery RM 150, install RM 0. PDF Rental Activation = 1,000 + 150 + 0 + 4,000 = 5,150. Convert to order. Order Amount shows RM 1,150. Customer actually pays RM 5,150 on day one — there's a RM 4,000 gap between Order Amount and the cash received.
**Suggested fix:** For rental conversions compute `activationTotal = monthlyTotal + delivery + install + depositMonths * monthlyTotal` (tier-aware deposit months) and use that as `amount`.

---

### F-MATH-11: Order edit "Apply to Amount" is a manual click — closing the modal without clicking leaves `amount` stale while items/subtotal/fees are saved with new values
**Severity:** High
**Where:** `src/components/orders/order-detail-modal.tsx:990, 1297-1309, 211-310`
**Symptom:** In edit mode, the Pricing Breakdown section recomputes `computedTotal = subtotal + delivery + install - discount + charges` live. There's a small "Apply to Amount" button beside it; clicking it sets `editingOrder.amount = computedTotal`. The Save button at the top, however, persists whatever `editingOrder.amount` currently holds — which is the original value if the operator forgot to click Apply. Items, discounts, fees, and subtotal save correctly; the order's `amount` does not.
**Root cause:** Save (`saveEdit`) doesn't auto-recompute amount; it writes `toNumOrNull(editingOrder.amount)`. The link between the editable breakdown and the saved Amount is opt-in.
**Reproduce:** Open a delivered order with amount 18,150. Edit, change qty from 1 to 2 → computedTotal becomes 36,300. Save (without clicking Apply to Amount). The order now has amount 18,150 but subtotal 36,000 + delivery + install ≠ amount. Subsequent invoice generation uses `total = order.amount = 18,150`; the line items in the PDF sum to 36,300. The customer's invoice prints conflicting figures.
**Suggested fix:** Either auto-write `amount = computedTotal` on save when items exist, or block save with a confirm dialog when `Math.abs(amount - computedTotal) > 0.01`.

---

### F-MATH-12: Discount amounts accumulate without sign checks — a user-entered negative discount silently becomes a charge, and a discount label with no amount survives sanitization
**Severity:** Medium
**Where:** `src/components/quotations/quotation-builder.tsx:681, 1180`; `src/components/orders/order-detail-modal.tsx:217-222, 988`; `src/app/(dashboard)/orders/new/page.tsx:55, 228, 591`
**Symptom:** `totalDiscount = discounts.reduce((s, d) => s + (d.amount || 0), 0)`. The discount input is a `<input type="number" min={0}>` but the runtime check is `parseFloat(e.target.value) || 0`, which accepts negative numbers if the user pastes one (the `min` attribute is not enforced for paste/typing in many browsers). A discount of -200 becomes a +200 charge in `total = subtotal - totalDiscount + ...` (it ADDS 200 to the total). Conversely the sanitize step in order-detail-modal:219 keeps rows where `d.label || d.amount > 0` — meaning a label-only zero-amount discount stays as a no-op line on the PDF but takes up a slot.
**Root cause:** Trust in the `min` attribute; no `Math.max(0, ...)` clamp in the reducer.
**Reproduce:** In quotation builder discount input, paste "-500". Equipment subtotal 10,000 → Total displays 10,500 (10,000 - (-500)). Customer is overcharged by RM 500 silently with no visible warning.
**Suggested fix:** Clamp at parse time: `Math.max(0, parseFloat(e.target.value) || 0)`. Same for `additional_charges`.

---

### F-MATH-13: `/orders/new` WhatsApp rental total excludes the deposit and applies the discount only to the first month — the customer text quote understates activation by 2–4 months of rental
**Severity:** High
**Where:** `src/app/(dashboard)/orders/new/page.tsx:74-95`
**Symptom:** The WhatsApp confirmation text the customer sees for a rental order shows `Total: monthly + delivery + install - discount`. There is no deposit line. For a 4-month deposit P4B T1 rental at RM 1,000/month, the customer is quoted "Total RM 1,150" but the operator collects RM 5,150 at delivery. Operators have to remember to add the deposit verbally, which is error-prone.
**Root cause:** No rental-deposit awareness in `buildWAText`. Same shape as F-MATH-10 but on a different surface.
**Reproduce:** `/orders/new`, mode = Rental, monthly_rental 1,000, delivery 150. WA preview Total: RM 1,150. Generate matching quotation PDF separately and the Rental Activation will be 5,150. Two different numbers shown to the customer through different channels.
**Suggested fix:** Add deposit lines and an "Activation Total" to the rental branch of `buildWAText`, tier-aware as in F-MATH-3.

---

### F-MATH-14: Legacy fallback unit_price uses `Math.round(equipmentAmount / units)` — cents lost across the multiplication so invoice "qty × unit" doesn't equal "Amount"
**Severity:** Medium
**Where:** `src/app/api/invoices/from-order/route.ts:193, 199`
**Symptom:** Legacy back-calc: `equipmentAmount = 3,001`, `units = 2` → `unitPrice = round(3,001 / 2) = 1,501`. The invoice line then shows qty 2, unit_price 1,501, amount 3,001 (passed straight from `equipmentAmount`). 2 × 1,501 = 3,002, not 3,001. The invoice does not pass a basic re-multiplication check.
**Root cause:** Pre-rounding the unit price while still passing the original amount keeps the totals technically correct but breaks per-line arithmetic.
**Reproduce:** Make any legacy order with amount producing a non-even back-calc (any amount such that `(amount - 150) / units` is non-integer).
**Suggested fix:** Either compute `amount = unitPrice * units` (then the total may shift by cents — acceptable when there's no breakdown) or render the legacy item as one row with qty=1, unit_price = equipmentAmount.

---

### F-MATH-15: Invoice PDF does not validate that `items` sum to `total` — `deposit = total - balance` can silently differ from the line items
**Severity:** Medium
**Where:** `src/app/api/invoices/pdf/route.tsx:458-473` and `src/app/api/invoices/from-order/route.ts:210-227`
**Symptom:** `total` is taken from `order.amount`. The "Total / Amount Paid / Balance" block uses that scalar, while the table rows above are built independently from `order.items`, `order.delivery_fee`, etc. With any of the prior bugs (F-MATH-9, F-MATH-10, F-MATH-11) the sum of items + delivery + install ± adjustments doesn't equal the printed Total. There is no assertion or warning either at generation time or at preview.
**Root cause:** No reconciliation step between the rendered line totals and the rendered Grand Total.
**Reproduce:** Trigger any of the upstream finds (e.g. F-MATH-11: edit order without applying Amount). Generate invoice. Line items sum to X, Total prints Y.
**Suggested fix:** In `from-order` (or in the PDF route), compute `lineSum = items.reduce(...)`. If `Math.abs(lineSum - total) > 0.01`, either log + refuse to render, or render a visible "Adjustments / Rounding" reconciliation line that closes the gap.

---

## Out of scope but worth noting

- `formatCurrency`'s default currency is "MYR" — every call site in `order-detail-modal.tsx` omits the second argument, so SG orders display amounts labelled "RM" in the breakdown UI too. Pair with F-MATH-7.
- `quotation-builder.tsx:707, 716` recomputes `installation_fee` on every line-item change via `calcInstallFee` and writes it back to the form. If the user manually overrode the install fee, any subsequent qty/product/mode change silently clobbers that override. Not a math bug strictly, but a UX surprise that affects what the customer is quoted.
