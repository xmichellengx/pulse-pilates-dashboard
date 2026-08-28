# Pulse Pilates — Sales Data Handover

For: Atiqah, Head of Accounts & Finance, Utopia Group
Access: read-only (`pulse_finance_ro`). You cannot change anything in this database.

**Where the data lives:** everything below is in the **`finance`** schema, not `public`.
Query it as `finance.orders`, `finance.invoices`, and so on. The table names are
otherwise exactly as described here.

Pulse Pilates sells and rents Pilates equipment (reformers, towers, cadillacs, chairs)
to customers in Malaysia and Singapore. This note explains what each table you can read
actually holds, which field is the real money, and which rows are genuine sales.

---

## Read this first — two things that will trip up a report

**1. There is no currency column on orders.** The currency is implied by the `market`
field: `MY` means the amount is in **Malaysian Ringgit**, `SG` means **Singapore
Dollars**. Summing `amount` across both markets silently mixes two currencies.
Currently 370 orders are MY and 5 are SG, so the error is small but real — filter or
convert by `market`.

**2. Revenue is dated by `payment_date`, not by when the row was created.** The Pulse
dashboard books an order into the month the customer paid. `created_at` is just when the
record was typed in, which can be much later for historical imports.

---

## The rule for "what counts as a real sale"

This is the exact rule the Pulse dashboard uses for its own revenue figure:

> Sum `orders.amount`, where `payment_date` falls in the period,
> and `status` is **not** `Cancelled` and **not** `Returned`.

Everything else in `orders` is a genuine sale at some stage of fulfilment.

| `orders.status` | Rows | Counts as a sale? |
|---|---|---|
| `Delivered` | 364 | Yes — delivered and complete |
| `Pending Shipment Arrival` | 8 | Yes — paid, stock not yet arrived |
| `Pending Delivery` | 2 | Yes — paid, awaiting delivery |
| `Pending` | 1 | Yes — early stage |
| `Returned` | 8 | **No — exclude** |
| `Cancelled` | 3 | **No — exclude** |

---

## The tables

### `orders` — the actual sales ledger
One row per sale or rental. This is the table nearly every finance question is answered from.

| Field | What it is |
|---|---|
| **`amount`** | **The money figure.** Full invoiced total: equipment + delivery + installation + extra charges − discounts. |
| `subtotal` | Equipment only, before delivery/installation/adjustments. |
| `balance` | Still outstanding. `0` means paid in full. |
| `payment_date` | Date the customer paid — **use this for period reporting**. |
| `delivery_fee`, `installation_fee` | Components already included in `amount`. |
| `monthly_rental` | For rentals: the recurring monthly figure. `amount` on a rental row is the *first* payment, not the contract value. |
| `market` | `MY` = amount is MYR, `SG` = amount is SGD. |
| `case_code` | The human reference, e.g. `PPAS0141`. Matches `invoices.order_case_code`. |
| `status` | See the table above. |
| `mode` | How it was sold — `Direct Purchase`, `Rental`, instalment variants. Free text, spelling varies. |
| `payment_type` | Free text, entered by hand. Useful colour, **not** reliable for grouping — there are 25 distinct spellings including `Full Payment` and `Full payment` as separate values. |

### `invoices` — the documents that were generated
A log of every invoice and receipt PDF produced. **Do not sum this as revenue.** An order
can have both an invoice and a receipt, so amounts here double-count. Use it to find the
paperwork for a given sale, via `order_case_code` or `order_id`.

`type` is one of: `invoice`, `receipt`, `rental`, `purchase`. Money field is `amount`.

### `quotations` — proposals, not sales
Prices quoted to prospects. **Not revenue.** Money field is `total`. If
`converted_to_order` is set, the quote became a real order — count it there, not here.

### `ai_engagements` — the software services side
A separate, small revenue line: Pulse builds software for clients. One row per
engagement.

| Field | What it is |
|---|---|
| `upfront_amount` | One-off build fee. |
| `year_one_monthly` | Recurring maintenance fee, first year. |
| `year_two_plus_monthly` | Recurring fee thereafter. |
| `upfront_paid_date` | When the upfront fee was paid. |

### `ai_invoices` — invoices for those engagements
Money field is `amount`. `invoice_type` distinguishes `upfront` from recurring
maintenance billing. `status` `paid` means settled. Links back via `engagement_id`.

### `maintenance_requests` — chargeable service jobs
Callouts and repairs on equipment already sold.

**`total`** is the money field, and it is exactly `transport_fee + labour_fee +
parts_cost`. Jobs done under warranty are normally zero-charge — check
`is_under_warranty`. `status` runs `Pending` → `Scheduled` → `Completed`, or `Cancelled`.

### `products` — the price list
Reference data, not transactions. One row per equipment model with retail and partner-tier
prices in both MYR and SGD. Useful for checking whether an order was priced correctly.
No money is earned in this table.

---

## Data quality — known issues, as at 27 August 2026

Out of 375 countable orders:

- **9 have an empty `balance`.** Empty is not the same as zero. Do not read it as paid in full.
- **6 have no `payment_date`.** These will silently drop out of any period report.
- **9 have `amount` empty or zero.** Mostly older imported records.
- A small number of orders have stored line-item breakdowns that do not add up to
  `amount`. Where they disagree, **`amount` is the authoritative figure.**

These are being worked on. If a reconciliation looks off by one or two orders, this is
usually why — please flag it rather than assuming the total is wrong.

---

## What you do not have access to

Deliberately excluded, so you know it is not an oversight:

- `leads`, `calls` — sales enquiry notes and call logs. No money field.
- `rental_follow_ups` — internal scheduling reminders.
- Anything in Supabase's `auth` or `storage` schemas — logins, sessions, uploaded files.
- Several unrelated tables in this database left over from a different project. They
  contain nothing to do with Pulse Pilates.

## A note on customer data

The `orders` view includes full customer contact details — name, email, phone, delivery
address — and link fields pointing to uploaded identity documents and signed contracts.
This is deliberate: Michelle has authorised full visibility for reconciliation.

Please treat it accordingly. It is personal data under Malaysia's PDPA and Singapore's
PDPA, it should not be copied outside your finance system or shared onward, and it should
not appear in reports that circulate more widely than they need to.

---

## Payment slips

Proof-of-payment images are not in the database — they are files. To fetch them:

```
GET https://pulse-pilates.vercel.app/api/finance/payment-slips
Authorization: Bearer <the token Michelle sent you separately>
```

Returns one entry per order that has a slip, with `case_code`, `payment_date`,
`amount`, `currency` and a `url`. Optional filters: `?since=YYYY-MM-DD` and
`?order_id=<uuid>`.

**The `url` values expire after one hour.** Fetch the list and download in the same
run rather than storing the links.

This endpoint returns payment slips only. Identity documents and signed contracts
are held separately and are not reachable through it.

---

## Questions

Anything that looks wrong, ask Michelle before adjusting a figure. The `case_code` on an
order (e.g. `PPAS0141`) is the fastest way to refer to a specific sale.
