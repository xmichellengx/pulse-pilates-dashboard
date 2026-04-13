export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { renderToBuffer } from "@react-pdf/renderer"
import React from "react"
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from "@react-pdf/renderer"
import fs from "fs"
import path from "path"

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
const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    color: "#1a1a1a",
    paddingTop: 40,
    paddingBottom: 60,
    paddingHorizontal: 48,
  },
  // ── Header ──
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  logoImg: {
    width: 110,
    height: 44,
    objectFit: "contain",
  },
  companyBlock: {
    flex: 1,
    marginLeft: 32,
    alignItems: "flex-end",
  },
  companyName: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#111111",
    textAlign: "right",
  },
  companyDetail: {
    fontSize: 8,
    color: "#555555",
    textAlign: "right",
    marginTop: 2,
    lineHeight: 1.5,
  },
  // ── Divider ──
  divider: {
    borderBottomWidth: 0.75,
    borderBottomColor: "#cccccc",
    marginBottom: 14,
  },
  // ── Bill to / Bill info row ──
  billRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  billToBlock: {
    flex: 1,
  },
  billMetaBlock: {
    width: 200,
    alignItems: "flex-end",
  },
  billLabel: {
    fontSize: 8,
    color: "#666666",
    marginBottom: 4,
  },
  billCustomerName: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#111111",
    marginBottom: 2,
  },
  billCustomerLine: {
    fontSize: 9,
    color: "#333333",
    marginBottom: 1,
  },
  billMetaRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 3,
  },
  billMetaKey: {
    fontSize: 9,
    color: "#555555",
    width: 80,
    textAlign: "right",
  },
  billMetaVal: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#111111",
    marginLeft: 8,
    width: 90,
    textAlign: "right",
  },
  // ── Title ──
  docTitle: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: "#111111",
    textAlign: "center",
    marginBottom: 16,
    letterSpacing: 2,
  },
  // ── Table ──
  table: {
    marginBottom: 8,
  },
  tableHeader: {
    flexDirection: "row",
    borderTopWidth: 0.75,
    borderBottomWidth: 0.75,
    borderColor: "#999999",
    paddingVertical: 5,
    paddingHorizontal: 4,
    backgroundColor: "#f5f5f5",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#e5e5e5",
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  colNo: { width: 24, textAlign: "left" },
  colDesc: { flex: 1 },
  colQty: { width: 52, textAlign: "center" },
  colUnit: { width: 90, textAlign: "right" },
  colAmount: { width: 90, textAlign: "right" },
  thText: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#333333",
  },
  tdText: {
    fontSize: 9,
    color: "#333333",
  },
  tdBold: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#111111",
  },
  // ── Totals ──
  totalsArea: {
    alignItems: "flex-end",
    marginBottom: 20,
  },
  totalLine: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 3,
  },
  totalKey: {
    fontSize: 9,
    color: "#333333",
    width: 160,
    textAlign: "right",
    paddingRight: 12,
  },
  totalVal: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#111111",
    width: 90,
    textAlign: "right",
  },
  totalDivider: {
    borderTopWidth: 0.5,
    borderTopColor: "#aaaaaa",
    width: 260,
    marginBottom: 4,
    marginTop: 2,
  },
  // ── Sections ──
  sectionTitle: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#111111",
    marginBottom: 4,
    marginTop: 14,
  },
  sectionLine: {
    fontSize: 9,
    color: "#333333",
    marginBottom: 2,
    lineHeight: 1.4,
  },
  // ── Important notes ──
  importantBox: {
    marginTop: 16,
    borderTopWidth: 0.5,
    borderTopColor: "#cccccc",
    paddingTop: 10,
  },
  importantTitle: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#111111",
    marginBottom: 5,
  },
  importantItem: {
    fontSize: 8,
    color: "#444444",
    marginBottom: 3,
    lineHeight: 1.4,
  },
  // ── Footer / Signature ──
  signatureBlock: {
    marginTop: 20,
    borderTopWidth: 0.5,
    borderTopColor: "#cccccc",
    paddingTop: 10,
  },
  signatureText: {
    fontSize: 9,
    color: "#333333",
    marginBottom: 2,
  },
})

// ── Types ──────────────────────────────────────────────────────────────────────
export interface InvoicePDFInput {
  doc_type: "invoice" | "receipt"
  bill_number: string
  bill_date: string
  customer_name: string
  customer_email?: string
  customer_phone?: string
  customer_location?: string
  customer_address?: string
  items: Array<{
    description: string
    qty: number
    unit_price: number
    amount: number
  }>
  total: number
  deposit: number
  balance: number
  delivery_date?: string
  buying_method?: string
  issued_by?: string
}

function fmt(n: number) {
  return n.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// ── Document component ─────────────────────────────────────────────────────────
function InvoiceDocument(props: InvoicePDFInput & { logoSrc: string }) {
  const {
    doc_type,
    bill_number,
    bill_date,
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
    buying_method,
    issued_by,
    logoSrc,
  } = props

  const title = doc_type === "receipt" ? "RECEIPT" : "INVOICE"

  return (
    <Document>
      <Page size="A4" style={styles.page}>

        {/* ── Header ── */}
        <View style={styles.headerRow}>
          {/* Logo */}
          {logoSrc ? (
            <Image src={logoSrc} style={styles.logoImg} />
          ) : (
            <Text style={{ fontSize: 28, fontFamily: "Helvetica-Bold" }}>pulse</Text>
          )}

          {/* Company block */}
          <View style={styles.companyBlock}>
            <Text style={styles.companyName}>UTOPIA HOLIDAY SDN BHD (1358713-H)</Text>
            <Text style={styles.companyDetail}>
              {"A-30 Level 2 Sentul Point, Puncak Sentul, No. 8 Jalan Sentul Perdana, 51000 Kuala Lumpur"}
            </Text>
            <Text style={styles.companyDetail}>
              {"Email: pilatesreformer.my@gmail.com   Tel: +60 18-929 4693"}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* ── Bill To / Bill Meta ── */}
        <View style={styles.billRow}>
          <View style={styles.billToBlock}>
            <Text style={styles.billLabel}>To:</Text>
            <Text style={styles.billCustomerName}>{customer_name},</Text>
            {customer_location && (
              <Text style={styles.billCustomerLine}>{customer_location},</Text>
            )}
            {customer_address && (
              <Text style={styles.billCustomerLine}>{customer_address},</Text>
            )}
            {(customer_email || customer_phone) && (
              <Text style={styles.billCustomerLine}>
                {[customer_email, customer_phone].filter(Boolean).join(" | ")}
              </Text>
            )}
          </View>

          <View style={styles.billMetaBlock}>
            <View style={styles.billMetaRow}>
              <Text style={styles.billMetaKey}>Bill Number :</Text>
              <Text style={styles.billMetaVal}>{bill_number}</Text>
            </View>
            <View style={styles.billMetaRow}>
              <Text style={styles.billMetaKey}>Bill Date :</Text>
              <Text style={styles.billMetaVal}>{bill_date}</Text>
            </View>
          </View>
        </View>

        {/* ── Document Title ── */}
        <Text style={styles.docTitle}>{title}</Text>

        {/* ── Items Table ── */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={{ ...styles.thText, ...styles.colNo }}>Item</Text>
            <Text style={{ ...styles.thText, ...styles.colDesc }}>Description</Text>
            <Text style={{ ...styles.thText, ...styles.colQty }}>Quantity</Text>
            <Text style={{ ...styles.thText, ...styles.colUnit }}>Unit Price (RM)</Text>
            <Text style={{ ...styles.thText, ...styles.colAmount }}>Amount (RM)</Text>
          </View>

          {items.map((item, i) => (
            <View key={i} style={styles.tableRow}>
              <Text style={{ ...styles.tdText, ...styles.colNo }}>{i + 1}.</Text>
              <Text style={{ ...styles.tdText, ...styles.colDesc }}>{item.description}</Text>
              <Text style={{ ...styles.tdText, ...styles.colQty }}>{item.qty}</Text>
              <Text style={{ ...styles.tdText, ...styles.colUnit }}>{fmt(item.unit_price)}</Text>
              <Text style={{ ...styles.tdBold, ...styles.colAmount }}>{fmt(item.amount)}</Text>
            </View>
          ))}
        </View>

        {/* ── Totals ── */}
        <View style={styles.totalsArea}>
          <View style={styles.totalDivider} />
          <View style={styles.totalLine}>
            <Text style={styles.totalKey}>Total (RM)</Text>
            <Text style={styles.totalVal}>{fmt(total)}</Text>
          </View>
          <View style={styles.totalLine}>
            <Text style={styles.totalKey}>(-) Deposit (RM)</Text>
            <Text style={styles.totalVal}>{fmt(deposit)}</Text>
          </View>
          <View style={styles.totalDivider} />
          <View style={styles.totalLine}>
            <Text style={{ ...styles.totalKey, fontFamily: "Helvetica-Bold" }}>Balance (RM)</Text>
            <Text style={{ ...styles.totalVal, fontSize: 10 }}>{fmt(balance)}</Text>
          </View>
        </View>

        {/* ── Delivery Details ── */}
        <Text style={styles.sectionTitle}>Delivery Details</Text>
        <Text style={styles.sectionLine}>
          {"Delivery Date : " + (delivery_date || "TBC")}
        </Text>
        <Text style={styles.sectionLine}>{"Delivery Time : TBC"}</Text>

        {/* ── Payment Details ── */}
        <Text style={styles.sectionTitle}>Payment Details</Text>
        <Text style={styles.sectionLine}>
          {"Buying Method                         : " + (buying_method || "—")}
        </Text>
        <Text style={styles.sectionLine}>
          {"Installment Period (if any)            : N/A"}
        </Text>
        <Text style={styles.sectionLine}>
          {"Installment Amount (if any)            : RM0.00 / monthly"}
        </Text>
        <Text style={styles.sectionLine}>
          {"Monthly Billing Date (if any)          : N/A"}
        </Text>
        <Text style={styles.sectionLine}>
          {"Auto Debit Effective Date (if any)     : N/A"}
        </Text>

        {/* ── Important ── */}
        <View style={styles.importantBox}>
          <Text style={styles.importantTitle}>Important - Please Read</Text>
          <Text style={styles.importantItem}>
            {"1. Condominium Delivery : Please ensure all necessary permits for condo access are secured prior to delivery, delivery fee will apply even if the delivery is unsuccessful due to lack of permission to enter."}
          </Text>
          <Text style={styles.importantItem}>
            {"2. Installment Auto Debit : You will be provided with an auto debit link to enroll for installment payments starting from the second month onwards."}
          </Text>
        </View>

        {/* ── Bank + Signature ── */}
        <View style={styles.signatureBlock}>
          <Text style={styles.signatureText}>
            {"Utopia Holiday Sdn Bhd - CIMB Bank - 8010 343 152"}
          </Text>
          <Text style={styles.signatureText}>{"For Pulse Pilates :"}</Text>
          <Text style={{ ...styles.signatureText, marginTop: 6 }}>{"Issued By"}</Text>
          <Text style={{ ...styles.signatureText, fontFamily: "Helvetica-Bold" }}>
            {issued_by || "Aisy"}
          </Text>
          <Text style={styles.signatureText}>{"Contact No : 018-929 4693"}</Text>
        </View>

      </Page>
    </Document>
  )
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as InvoicePDFInput

    const pdfBuffer = await renderToBuffer(
      <InvoiceDocument {...body} logoSrc={LOGO_SRC} />
    )

    const filename = body.bill_number
      ? `${body.bill_number}${body.doc_type === "receipt" ? "-receipt" : ""}.pdf`
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
