export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { renderToBuffer } from "@react-pdf/renderer"
import React from "react"
import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer"
import fs from "fs"
import path from "path"
import { z } from "zod"
import { requireUser } from "@/lib/api/auth"

// ── Image helpers ──────────────────────────────────────────────────────────────
function imgB64(filePath: string): string {
  try {
    const buf = fs.readFileSync(filePath)
    const ext = path.extname(filePath).slice(1).toLowerCase()
    return `data:image/${ext === "jpg" ? "jpeg" : ext};base64,${buf.toString("base64")}`
  } catch {
    return ""
  }
}
const PUBLIC = path.join(process.cwd(), "public")
const LOGO_SRC = imgB64(path.join(PUBLIC, "pulse-logo.png"))

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    color: "#1a1a1a",
    paddingTop: 36,
    paddingBottom: 56,
    paddingHorizontal: 48,
    backgroundColor: "#fff",
  },

  // ── Header ──
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },
  logoImg: {
    width: 90,
    height: 90,
  },
  companyBlock: {
    flex: 1,
    paddingLeft: 16,
    alignItems: "flex-start",
  },
  companyNameRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: 2,
  },
  companyNameBig: {
    fontSize: 17,
    fontFamily: "Helvetica-Bold",
    color: "#111",
    letterSpacing: 0.4,
  },
  companyReg: {
    fontSize: 8.5,
    color: "#444",
    marginLeft: 5,
  },
  companyAddress: {
    fontSize: 8,
    color: "#555",
    marginBottom: 1,
    lineHeight: 1.5,
  },
  companyContact: {
    fontSize: 8,
    color: "#555",
    marginBottom: 1,
  },
  companyWebsite: {
    fontSize: 8,
    color: "#555",
  },

  // ── Divider ──
  divider: {
    borderBottomWidth: 0.75,
    borderBottomColor: "#bbb",
    marginBottom: 14,
  },

  // ── Bill To + Bill Meta ──
  billRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  billToBlock: {
    flex: 1,
  },
  toLabel: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#111",
    marginBottom: 3,
  },
  billCustomerName: {
    fontSize: 9,
    color: "#222",
    marginBottom: 1,
  },
  billLine: {
    fontSize: 9,
    color: "#222",
    marginBottom: 1,
  },
  billMetaBlock: {
    // Don't right-align each row individually — that makes rows of different
    // widths have different left edges, so the colons don't line up across
    // Bill Number / Bill Date / Reference. The block itself is already pinned
    // to the right of the page via billRow's space-between, so rows align
    // consistently on their left edge (= block's left edge) → colons line up.
  },
  billMetaRow: {
    flexDirection: "row",
    marginBottom: 2,
  },
  billMetaKey: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#111",
    width: 70,
    textAlign: "right",
    marginRight: 6,
  },
  billMetaVal: {
    fontSize: 9,
    color: "#222",
    minWidth: 100,
  },

  // ── Doc title ──
  docTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#111",
    textAlign: "center",
    marginBottom: 10,
    textDecoration: "underline",
    letterSpacing: 1,
  },

  // ── Table ──
  tableHeader: {
    flexDirection: "row",
    borderTopWidth: 0.5,
    borderBottomWidth: 0.5,
    borderColor: "#999",
    paddingVertical: 5,
    paddingHorizontal: 2,
    backgroundColor: "#fafafa",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.4,
    borderBottomColor: "#e8e8e8",
    paddingVertical: 7,
    paddingHorizontal: 2,
  },
  colItem: { width: 36, textAlign: "center" },
  colDesc: { flex: 1 },
  colQty: { width: 60, textAlign: "center" },
  colUnit: { width: 100, textAlign: "right" },
  colAmt: { width: 100, textAlign: "right" },
  thText: { fontSize: 8.5, fontFamily: "Helvetica-Bold", color: "#333" },
  tdText: { fontSize: 9, color: "#333" },
  tdBold: { fontSize: 9, fontFamily: "Helvetica-Bold", color: "#111" },
  tdSub: { fontSize: 8, color: "#777", fontFamily: "Helvetica-Oblique" },

  // ── Totals ──
  totalsArea: {
    alignItems: "flex-end",
    marginTop: 4,
    marginBottom: 16,
  },
  totalLine: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 3,
  },
  totalKey: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#111",
    width: 120,
    textAlign: "right",
    paddingRight: 10,
  },
  totalVal: {
    fontSize: 9,
    color: "#111",
    width: 100,
    textAlign: "right",
  },
  totalValBold: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#111",
    width: 100,
    textAlign: "right",
  },
  totalDivider: {
    borderTopWidth: 0.5,
    borderTopColor: "#aaa",
    width: 230,
    marginTop: 2,
    marginBottom: 4,
  },

  // ── Sections ──
  sectionTitle: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#111",
    marginBottom: 4,
    marginTop: 10,
  },
  sectionLine: {
    fontSize: 9,
    color: "#333",
    marginBottom: 3,
    flexDirection: "row",
  },
  sectionKey: {
    fontSize: 9,
    color: "#333",
    width: 130,
  },
  sectionVal: {
    fontSize: 9,
    color: "#222",
    flex: 1,
  },

  // ── Important notes ──
  importantBox: {
    marginTop: 14,
    paddingTop: 8,
    paddingRight: 8,
  },
  importantTitle: {
    fontSize: 9,
    fontFamily: "Helvetica-BoldOblique",
    color: "#111",
    marginBottom: 5,
  },
  importantItem: {
    fontSize: 8,
    color: "#333",
    marginBottom: 3,
    lineHeight: 1.45,
    paddingRight: 4,
  },
  importantLabel: {
    fontFamily: "Helvetica-Bold",
  },

  // ── Footer ──
  bankLine: {
    marginTop: 10,
    paddingTop: 6,
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#111",
    marginBottom: 6,
  },
  forPulse: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#111",
    marginBottom: 8,
  },
  issuedByLabel: {
    fontSize: 9,
    color: "#333",
    marginBottom: 2,
  },
  issuedByName: {
    fontSize: 9,
    fontFamily: "Helvetica-BoldOblique",
    color: "#111",
    marginBottom: 2,
  },
  // Appendix page (Scope of Work)
  appendixTitle: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: "#111",
    marginBottom: 4,
  },
  appendixSubtitle: {
    fontSize: 9,
    color: "#555",
    marginBottom: 14,
  },
  appendixHeading: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#111",
    marginTop: 12,
    marginBottom: 6,
  },
  appendixParagraph: {
    fontSize: 9,
    color: "#222",
    marginBottom: 6,
    lineHeight: 1.5,
  },
  appendixBulletRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  appendixBulletDot: {
    fontSize: 9,
    color: "#222",
    width: 10,
  },
  appendixBulletText: {
    fontSize: 9,
    color: "#222",
    flex: 1,
    lineHeight: 1.5,
  },
  contactLine: {
    fontSize: 9,
    color: "#333",
  },
})

// ── Types ──────────────────────────────────────────────────────────────────────
export interface InvoicePDFInput {
  doc_type: "invoice" | "receipt" | "rental"
  bill_number: string
  bill_date: string
  reference?: string
  customer_name: string
  customer_email?: string
  customer_phone?: string
  customer_location?: string
  customer_address?: string
  items: Array<{
    description: string
    sub_description?: string
    qty: number
    unit_price: number
    amount: number
  }>
  total: number
  deposit: number
  balance: number
  delivery_date?: string
  estimated_delivery?: string
  delivery_location?: string
  payment_date?: string
  buying_method?: string
  // Warranty (used on receipts; auto-derived from delivery_date)
  warranty_body_start?: string
  warranty_body_end?: string
  warranty_spring_start?: string
  warranty_spring_end?: string
  // Rental specific
  rental_start_date?: string
  monthly_rental_amount?: number
  monthly_billing_date?: string
  auto_debit_effective_date?: string
  issued_by?: string
  // When true, swaps the "Important - Please Read" block for the
  // maintenance-specific clauses (drops Condominium Delivery + the
  // 3mo spring / 6mo body equipment warranty — irrelevant for a
  // service call on already-delivered equipment).
  is_maintenance?: boolean
  // When true, swaps the T&Cs for AI-services engagement terms
  // (scope, maintenance scope, out-of-scope work, payment terms).
  is_ai_service?: boolean
  // Optional "Maintenance Schedule" text block, rendered above the
  // T&Cs. Used on AI-service upfront invoices to surface the recurring
  // maintenance fee plan to the customer.
  maintenance_schedule_text?: string
  // Optional "Scope of Work — Appendix" content. If present, renders
  // as a SECOND PDF page. Supports basic markdown: ### headings,
  // - bullets, **bold** inline. Used on AI service upfront invoices.
  appendix_text?: string
  appendix_subtitle?: string
}

function fmt(n: number) {
  return n.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// Render a string with **bold** segments as inline-bold spans. Returns an
// array of <Text> children suitable for placing inside a parent <Text>.
function renderInlineBold(text: string): React.ReactNode[] {
  const parts = text.split(/\*\*(.+?)\*\*/g)
  return parts.map((part, i) => {
    if (i % 2 === 1) {
      return (
        <Text key={i} style={{ fontFamily: "Helvetica-Bold" }}>
          {part}
        </Text>
      )
    }
    return <Text key={i}>{part}</Text>
  })
}

// Very small markdown subset for the appendix page: ###/##/# headings,
// '- ' bullets, **bold** inline. Blank lines = paragraph breaks.
function renderAppendixMarkdown(md: string): React.ReactNode[] {
  const lines = md.replace(/\r\n/g, "\n").split("\n")
  const nodes: React.ReactNode[] = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    const trimmed = line.trimEnd()
    if (!trimmed) {
      i++
      continue
    }
    const headingMatch = /^(#{1,3})\s+(.+)$/.exec(trimmed)
    if (headingMatch) {
      nodes.push(
        <Text key={`h-${i}`} style={s.appendixHeading}>
          {headingMatch[2]}
        </Text>
      )
      i++
      continue
    }
    if (/^[-•]\s+/.test(trimmed)) {
      // Group consecutive bullets
      while (i < lines.length) {
        const cur = lines[i].trimEnd()
        if (!/^[-•]\s+/.test(cur)) break
        const content = cur.replace(/^[-•]\s+/, "")
        nodes.push(
          <View key={`b-${i}`} style={s.appendixBulletRow}>
            <Text style={s.appendixBulletDot}>•</Text>
            <Text style={s.appendixBulletText}>{renderInlineBold(content)}</Text>
          </View>
        )
        i++
      }
      continue
    }
    // Paragraph — collect consecutive non-empty, non-heading, non-bullet lines
    const buf: string[] = []
    while (i < lines.length) {
      const cur = lines[i].trimEnd()
      if (!cur) break
      if (/^(#{1,3})\s+/.test(cur)) break
      if (/^[-•]\s+/.test(cur)) break
      buf.push(cur)
      i++
    }
    nodes.push(
      <Text key={`p-${i}`} style={s.appendixParagraph}>
        {renderInlineBold(buf.join(" "))}
      </Text>
    )
  }
  return nodes
}

// ── Document ───────────────────────────────────────────────────────────────────
function InvoiceDocument(props: InvoicePDFInput & { logoSrc: string }) {
  const {
    doc_type,
    bill_number,
    bill_date,
    reference,
    customer_name,
    customer_email,
    customer_phone,
    customer_location,
    customer_address,
    items,
    total,
    deposit,
    balance,
    delivery_date,
    estimated_delivery,
    delivery_location,
    payment_date,
    buying_method,
    warranty_body_start,
    warranty_body_end,
    warranty_spring_start,
    warranty_spring_end,
    rental_start_date,
    monthly_rental_amount,
    monthly_billing_date,
    auto_debit_effective_date,
    issued_by,
    is_maintenance,
    is_ai_service,
    maintenance_schedule_text,
    appendix_text,
    appendix_subtitle,
    logoSrc,
  } = props

  const title = doc_type === "receipt" ? "RECEIPT" : "INVOICE"
  const isRental = doc_type === "rental"

  return (
    <Document>
      <Page size="A4" style={s.page}>

        {/* ── Header: logo left, company right ── */}
        <View style={s.headerRow}>
          {logoSrc
            ? <Image src={logoSrc} style={s.logoImg} />
            : <Text style={{ fontSize: 24, fontFamily: "Helvetica-Bold" }}>pulse{"\n"}pilates</Text>
          }
          <View style={s.companyBlock}>
            <View style={s.companyNameRow}>
              <Text style={s.companyNameBig}>PULSE PILATES SDN. BHD.</Text>
              <Text style={s.companyReg}> (1569742-U)</Text>
            </View>
            <Text style={s.companyAddress}>
              {"A-30, Level 2, Sentul Point, Puncak Sentul, No.8 Jalan Sentul Perdana, 5100 Kuala Lumpur"}
            </Text>
            <Text style={s.companyContact}>
              {"Email: pilatesreformer.my@gmail.com     Tel: +6018-929 4693"}
            </Text>
            <Text style={s.companyWebsite}>{"www.pilatesreformer.my"}</Text>
          </View>
        </View>

        <View style={s.divider} />

        {/* ── Bill To + Bill Meta ── */}
        <View style={s.billRow}>
          <View style={s.billToBlock}>
            <Text style={s.toLabel}>To :</Text>
            <Text style={s.billCustomerName}>{customer_name},</Text>
            {customer_location && <Text style={s.billLine}>{customer_location},</Text>}
            {customer_address && <Text style={s.billLine}>{customer_address},</Text>}
            {(customer_email || customer_phone) && (
              <Text style={s.billLine}>
                {[customer_email, customer_phone].filter(Boolean).join(" | ")}
              </Text>
            )}
          </View>

          <View style={s.billMetaBlock}>
            <View style={s.billMetaRow}>
              <Text style={s.billMetaKey}>Bill Number</Text>
              <Text style={s.billMetaVal}>{": " + bill_number}</Text>
            </View>
            <View style={s.billMetaRow}>
              <Text style={s.billMetaKey}>Bill Date</Text>
              <Text style={s.billMetaVal}>{": " + bill_date}</Text>
            </View>
            {reference && (
              <View style={s.billMetaRow}>
                <Text style={s.billMetaKey}>Reference</Text>
                <Text style={s.billMetaVal}>{": " + reference}</Text>
              </View>
            )}
          </View>
        </View>

        {/* ── Document Title (underlined) ── */}
        <Text style={s.docTitle}>{title}</Text>

        {/* ── Items Table ── */}
        <View style={s.tableHeader}>
          <Text style={{ ...s.thText, ...s.colItem }}>Item</Text>
          <Text style={{ ...s.thText, ...s.colDesc }}>Description</Text>
          <Text style={{ ...s.thText, ...s.colQty }}>Quantity</Text>
          <Text style={{ ...s.thText, ...s.colUnit }}>Unit Price (RM)</Text>
          <Text style={{ ...s.thText, ...s.colAmt }}>Amount  (RM)</Text>
        </View>

        {items.map((item, i) => (
          <View key={i} style={s.tableRow}>
            <Text style={{ ...s.tdText, ...s.colItem }}>{i + 1}.</Text>
            <View style={s.colDesc}>
              <Text style={s.tdText}>{item.description}</Text>
              {item.sub_description && (
                <Text style={s.tdSub}>{item.sub_description}</Text>
              )}
            </View>
            <Text style={{ ...s.tdText, ...s.colQty }}>{item.qty}</Text>
            <Text style={{ ...s.tdText, ...s.colUnit }}>{fmt(item.unit_price)}</Text>
            <Text style={{ ...s.tdText, ...s.colAmt }}>{fmt(item.amount)}</Text>
          </View>
        ))}

        {/* ── Totals ── */}
        <View style={s.totalsArea}>
          <View style={s.totalLine}>
            <Text style={s.totalKey}>Total (RM)</Text>
            <Text style={s.totalValBold}>{fmt(total)}</Text>
          </View>
          <View style={s.totalLine}>
            <Text style={s.totalKey}>{doc_type === "receipt" ? "(-) Amount Paid (RM)" : "(-) Deposit (RM)"}</Text>
            <Text style={s.totalVal}>{fmt(deposit)}</Text>
          </View>
          <View style={s.totalDivider} />
          <View style={s.totalLine}>
            <Text style={s.totalKey}>Balance (RM)</Text>
            <Text style={s.totalValBold}>{fmt(balance)}</Text>
          </View>
        </View>

        {/* ── Delivery Details (hidden for AI-service invoices — no physical delivery) ── */}
        {!is_ai_service && (
          <>
            <Text style={s.sectionTitle}>Delivery Details</Text>
            {delivery_date && (
              <View style={s.sectionLine}>
                <Text style={s.sectionKey}>Delivery Date</Text>
                <Text style={s.sectionVal}>{": " + delivery_date}</Text>
              </View>
            )}
            {estimated_delivery && (
              <View style={s.sectionLine}>
                <Text style={s.sectionKey}>Est. Delivery</Text>
                <Text style={s.sectionVal}>{": " + estimated_delivery}</Text>
              </View>
            )}
            {delivery_location && (
              <View style={s.sectionLine}>
                <Text style={s.sectionKey}>Delivery Location</Text>
                <Text style={s.sectionVal}>{": " + delivery_location}</Text>
              </View>
            )}
          </>
        )}

        {/* ── Warranty (auto-derived from delivery date for receipts) ── */}
        {(warranty_body_start || warranty_spring_start) && (
          <>
            {warranty_body_start && warranty_body_end && (
              <View style={s.sectionLine}>
                <Text style={s.sectionKey}>Warranty (Body)</Text>
                <Text style={s.sectionVal}>{`: ${warranty_body_start} – ${warranty_body_end} (6 months)`}</Text>
              </View>
            )}
            {warranty_spring_start && warranty_spring_end && (
              <View style={s.sectionLine}>
                <Text style={s.sectionKey}>Warranty (Spring)</Text>
                <Text style={s.sectionVal}>{`: ${warranty_spring_start} – ${warranty_spring_end} (3 months)`}</Text>
              </View>
            )}
          </>
        )}

        {/* ── Payment or Rental Details ── */}
        {isRental ? (
          <>
            <Text style={s.sectionTitle}>Rental Details</Text>
            <View style={s.sectionLine}>
              <Text style={s.sectionKey}>Start Date</Text>
              <Text style={s.sectionVal}>{": " + (rental_start_date || "")}</Text>
            </View>
            <View style={s.sectionLine}>
              <Text style={s.sectionKey}>Rental Amount</Text>
              <Text style={s.sectionVal}>
                {": RM" + (monthly_rental_amount ? fmt(monthly_rental_amount) : "") + " / monthly"}
              </Text>
            </View>
            <View style={s.sectionLine}>
              <Text style={s.sectionKey}>Monthly Billing Date</Text>
              <Text style={s.sectionVal}>
                {monthly_billing_date
                  ? `: Deduction on every ${monthly_billing_date} of the month (Effective From ${auto_debit_effective_date || ""})`
                  : ""}
              </Text>
            </View>
          </>
        ) : is_ai_service ? (
          // AI service invoices: skip Payment Details entirely. "Buying Method:
          // Direct Purchase" is meaningless for a service engagement, and the
          // payment date is already on the bill date at the top of a receipt.
          null
        ) : (
          <>
            <Text style={s.sectionTitle}>Payment Details</Text>
            <View style={s.sectionLine}>
              <Text style={s.sectionKey}>Buying Method</Text>
              <Text style={s.sectionVal}>{": " + (buying_method || "Direct Purchase")}</Text>
            </View>
            <View style={s.sectionLine}>
              <Text style={s.sectionKey}>Payment Date</Text>
              <Text style={s.sectionVal}>{": " + (payment_date || "")}</Text>
            </View>
          </>
        )}

        {/* ── Maintenance Schedule (AI service upfront invoices) ── */}
        {maintenance_schedule_text && (
          <View style={s.importantBox}>
            <Text style={s.importantTitle}>Maintenance Schedule</Text>
            <Text style={s.importantItem}>{maintenance_schedule_text}</Text>
          </View>
        )}

        {/* ── Terms & Conditions ── */}
        <View style={s.importantBox}>
          <Text style={s.importantTitle}>Terms &amp; Conditions</Text>

          {is_ai_service ? (
            <>
              <Text style={s.importantItem}>
                <Text style={s.importantLabel}>{"1. Scope of Services : "}</Text>
                {"Services rendered are as per the agreed scope. Any work outside this scope (new features, additional integrations, scope expansions) will be quoted separately before work proceeds."}
              </Text>
              <Text style={s.importantItem}>
                <Text style={s.importantLabel}>{"2. Maintenance Coverage : "}</Text>
                {"Maintenance covers system errors, bug fixes, debugging, and routine system upkeep arising from defects in the originally delivered scope. It does not cover new feature development, design changes, third-party service outages, or work caused by client-side changes."}
              </Text>
              <Text style={s.importantItem}>
                <Text style={s.importantLabel}>{"3. Payment Terms : "}</Text>
                {"Payment is due within 14 days of the invoice date. Late payment may result in suspension of services until the account is settled."}
              </Text>
            </>
          ) : is_maintenance ? (
            <>
              <Text style={s.importantItem}>
                <Text style={s.importantLabel}>{"1. Service Inspection : "}</Text>
                {"Customer is required to inspect and test the equipment before our service team departs. Any concerns must be raised on the day of service."}
              </Text>
              <Text style={s.importantItem}>
                <Text style={s.importantLabel}>{"2. Service Warranty : "}</Text>
                {"Replaced parts and labour are warranted for 30 days from the service date against defects in materials or workmanship. Damage from external factors or unrelated issues is not covered."}
              </Text>
              <Text style={s.importantItem}>
                <Text style={s.importantLabel}>{"3. Additional Work : "}</Text>
                {"Any issues identified beyond the originally reported problem will be quoted separately before work proceeds."}
              </Text>
            </>
          ) : (
          <>
          <Text style={s.importantItem}>
            <Text style={s.importantLabel}>{"1. Condominium Delivery : "}</Text>
            {"Please ensure all necessary permits for condo access are secured prior to delivery, delivery fee will apply even if the delivery is unsuccessful due to lack of permission to enter."}
          </Text>

          {isRental ? (
            <>
              <Text style={s.importantItem}>
                <Text style={s.importantLabel}>{"2. Minimum rental duration: "}</Text>
                {"3 months"}
              </Text>
              <Text style={s.importantItem}>
                <Text style={s.importantLabel}>{"3. Document Verification: "}</Text>
                {"Photo of IC/PASSPORT/LICENSE upon delivery for verification"}
              </Text>
              <Text style={s.importantItem}>
                <Text style={s.importantLabel}>{"4. Payex setup: "}</Text>
                {"Set up of auto-debit account for monthly recurring rental"}
              </Text>
              <Text style={s.importantItem}>
                <Text style={s.importantLabel}>{"5. Termination: "}</Text>
                {"A minimum of two weeks notice before your next charging cycle needs to be given if you wish to terminate"}
              </Text>
              <Text style={s.importantItem}>
                <Text style={s.importantLabel}>{"6. Damage: "}</Text>
                {"Any cost or replacement, fixing, etc due to external damages on equipment during rental duration should bear by renter, according to our schedule of equipment parts"}
              </Text>
              <Text style={s.importantItem}>
                <Text style={s.importantLabel}>{"7. Rental Unit: "}</Text>
                {"For rental based on stock availability you might receive a used unit in good condition. In the event of conversion to purchase, we will exchange with a new unit, delivery charges is applicable."}
              </Text>
            </>
          ) : (
            <>
              <Text style={s.importantItem}>
                <Text style={s.importantLabel}>{"2. Warranty Period : "}</Text>
                {"All our equipments comes with 3 months warranty on spring, 6 months warranty on equipment for manufacturing defect, any damage caused by external factors are not eligible for warranty."}
              </Text>
              {doc_type === "invoice" && (
                <Text style={s.importantItem}>
                  <Text style={s.importantLabel}>{"3. Delivery Timeline : "}</Text>
                  {"The delivery timeline provided is an estimate and may be subject to change due to unforeseen circumstances such as logistics delays, customs clearance or other factors beyond our control."}
                </Text>
              )}
            </>
          )}
          </>
          )}
        </View>

        {/* ── Bank + Footer ── */}
        <Text style={s.bankLine}>
          {"Pulse Pilates Sdn Bhd - Maybank Berhad - 5140 1249 2051"}
        </Text>
        <Text style={s.forPulse}>{"For Pulse Pilates :"}</Text>
        <Text style={s.issuedByLabel}>{"Issued By"}</Text>
        <Text style={s.issuedByName}>{issued_by || "Aisy"}</Text>
        <Text style={s.contactLine}>{"Contact No : 018-929 4693"}</Text>

      </Page>

      {/* ── Appendix page (Scope of Work) ── */}
      {appendix_text && (
        <Page size="A4" style={s.page}>
          <Text style={s.appendixTitle}>
            {`Scope of Work — Appendix to Invoice ${bill_number}`}
          </Text>
          {appendix_subtitle && (
            <Text style={s.appendixSubtitle}>{appendix_subtitle}</Text>
          )}
          <View style={s.divider} />
          {renderAppendixMarkdown(appendix_text)}
        </Page>
      )}
    </Document>
  )
}

// ── Input validation ───────────────────────────────────────────────────────────
// The route used to do `body as InvoicePDFInput` with no runtime check, which
// let any caller render a fully-branded Pulse Pilates PDF with arbitrary
// content (fraud / phishing). This schema mirrors `InvoicePDFInput` above
// and caps every free-text field + the item count to prevent abuse.

const MAX_BODY_BYTES = 256 * 1024

const InvoicePDFInputSchema = z.object({
  doc_type: z.enum(["invoice", "receipt", "rental"]),
  bill_number: z.string().min(1).max(100),
  bill_date: z.string().min(1).max(50),
  reference: z.string().max(100).optional(),
  customer_name: z.string().min(1).max(200),
  customer_email: z.string().max(200).optional().nullable(),
  customer_phone: z.string().max(50).optional().nullable(),
  customer_location: z.string().max(200).optional().nullable(),
  customer_address: z.string().max(500).optional().nullable(),
  items: z
    .array(
      z.object({
        description: z.string().max(500),
        sub_description: z.string().max(500).optional(),
        qty: z.number().finite(),
        unit_price: z.number().finite(),
        amount: z.number().finite(),
      })
    )
    .max(50),
  total: z.number().finite(),
  deposit: z.number().finite(),
  balance: z.number().finite(),
  delivery_date: z.string().max(50).optional().nullable(),
  estimated_delivery: z.string().max(200).optional().nullable(),
  delivery_location: z.string().max(200).optional().nullable(),
  payment_date: z.string().max(50).optional().nullable(),
  buying_method: z.string().max(100).optional().nullable(),
  warranty_body_start: z.string().max(50).optional().nullable(),
  warranty_body_end: z.string().max(50).optional().nullable(),
  warranty_spring_start: z.string().max(50).optional().nullable(),
  warranty_spring_end: z.string().max(50).optional().nullable(),
  rental_start_date: z.string().max(50).optional().nullable(),
  monthly_rental_amount: z.number().finite().optional().nullable(),
  monthly_billing_date: z.string().max(50).optional().nullable(),
  auto_debit_effective_date: z.string().max(50).optional().nullable(),
  issued_by: z.string().max(100).optional().nullable(),
  is_maintenance: z.boolean().optional().nullable(),
  is_ai_service: z.boolean().optional().nullable(),
  maintenance_schedule_text: z.string().max(2000).optional().nullable(),
  appendix_text: z.string().max(10000).optional().nullable(),
  appendix_subtitle: z.string().max(300).optional().nullable(),
})

// ── Route handler ──────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const auth = await requireUser()
  if (!auth.ok) return auth.response

  // Per-request size cap
  const contentLength = req.headers.get("content-length")
  if (contentLength && Number(contentLength) > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Request body too large" }, { status: 413 })
  }

  let rawBody: unknown
  try {
    rawBody = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const parsed = InvoicePDFInputSchema.safeParse(rawBody)
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid invoice payload",
        details: parsed.error.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      },
      { status: 400 }
    )
  }

  // Zod produces optional vs nullable that doesn't quite match the interface;
  // coerce nullables to undefined so the React component (which expects
  // optionals) renders correctly.
  const body = parsed.data as unknown as InvoicePDFInput

  try {
    const pdfBuffer = await renderToBuffer(
      <InvoiceDocument {...body} logoSrc={LOGO_SRC} />
    )

    const suffix = body.doc_type === "receipt" ? "-receipt" : body.doc_type === "rental" ? "-rental" : ""
    const filename = body.bill_number
      ? `${body.bill_number}${suffix}.pdf`
      : "invoice.pdf"

    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  } catch (err) {
    console.error("Invoice PDF error:", err)
    return NextResponse.json({ error: "PDF generation failed" }, { status: 500 })
  }
}
