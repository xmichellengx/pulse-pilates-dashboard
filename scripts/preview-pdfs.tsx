#!/usr/bin/env npx tsx
/**
 * Generates sample invoice + quotation PDFs and saves them to the Desktop folder.
 * Run: npx tsx scripts/preview-pdfs.tsx
 */

import { renderToBuffer } from "@react-pdf/renderer"
import React from "react"
import fs from "fs"
import path from "path"

// ─── shared ────────────────────────────────────────────────────────────────────
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
const EQUIPMENT_DIR = path.join(PUBLIC, "equipment")
const OUT_DIR = "/Users/michelleng/Desktop/AI/Pulse Dashbord"

function getProductImage(productName: string): string {
  const n = productName.toLowerCase()
  if (n.includes("foldable")) return imgB64(path.join(EQUIPMENT_DIR, "Alu II Foldable Reformer.png"))
  if (n.includes("alu") && n.includes("tower")) return imgB64(path.join(EQUIPMENT_DIR, "Alu II Tower.png"))
  if (n.includes("alu") && n.includes("reformer")) return imgB64(path.join(EQUIPMENT_DIR, "Alu II Reformer.png"))
  if (n.includes("cadillac")) return imgB64(path.join(EQUIPMENT_DIR, "Classic Cadillac.png"))
  if (n.includes("classic reformer") || (n.includes("reformer") && !n.includes("alu"))) return imgB64(path.join(EQUIPMENT_DIR, "Classic Reformer.png"))
  if (n.includes("barrel")) return imgB64(path.join(EQUIPMENT_DIR, "Foot-Adjustable Barrel.png"))
  if (n.includes("chair") || n.includes("maple")) return imgB64(path.join(EQUIPMENT_DIR, "Chair.png"))
  if (n.includes("elevare")) return imgB64(path.join(EQUIPMENT_DIR, "Elevare II.png"))
  return ""
}

// ─── Invoice ────────────────────────────────────────────────────────────────────
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from "@react-pdf/renderer"

const invStyles = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 9, color: "#1a1a1a", paddingTop: 40, paddingBottom: 60, paddingHorizontal: 48 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 },
  logoImg: { width: 160, height: 80, objectFit: "contain" },
  companyBlock: { flex: 1, marginLeft: 32, alignItems: "flex-end" },
  companyName: { fontSize: 10, fontFamily: "Helvetica-Bold", color: "#111111", textAlign: "right" },
  companyDetail: { fontSize: 8, color: "#555555", textAlign: "right", marginTop: 2, lineHeight: 1.5 },
  divider: { borderBottomWidth: 0.75, borderBottomColor: "#cccccc", marginBottom: 14 },
  billRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 18 },
  billToBlock: { flex: 1 },
  billMetaBlock: { width: 200, alignItems: "flex-end" },
  billLabel: { fontSize: 8, color: "#666666", marginBottom: 4 },
  billCustomerName: { fontSize: 10, fontFamily: "Helvetica-Bold", color: "#111111", marginBottom: 2 },
  billCustomerLine: { fontSize: 9, color: "#333333", marginBottom: 1 },
  billMetaRow: { flexDirection: "row", justifyContent: "flex-end", marginBottom: 3 },
  billMetaKey: { fontSize: 9, color: "#555555", width: 80, textAlign: "right" },
  billMetaVal: { fontSize: 9, fontFamily: "Helvetica-Bold", color: "#111111", marginLeft: 8, width: 90, textAlign: "right" },
  docTitle: { fontSize: 16, fontFamily: "Helvetica-Bold", color: "#111111", textAlign: "center", marginBottom: 16, letterSpacing: 2 },
  table: { marginBottom: 8 },
  tableHeader: { flexDirection: "row", borderTopWidth: 0.75, borderBottomWidth: 0.75, borderColor: "#999999", paddingVertical: 5, paddingHorizontal: 4, backgroundColor: "#f5f5f5" },
  tableRow: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#e5e5e5", paddingVertical: 6, paddingHorizontal: 4 },
  colNo: { width: 24 },
  colDesc: { flex: 1 },
  colQty: { width: 52, textAlign: "center" },
  colUnit: { width: 90, textAlign: "right" },
  colAmount: { width: 90, textAlign: "right" },
  thText: { fontSize: 8, fontFamily: "Helvetica-Bold", color: "#333333" },
  tdText: { fontSize: 9, color: "#333333" },
  tdBold: { fontSize: 9, fontFamily: "Helvetica-Bold", color: "#111111" },
  totalsArea: { alignItems: "flex-end", marginBottom: 20 },
  totalLine: { flexDirection: "row", justifyContent: "flex-end", marginBottom: 3 },
  totalKey: { fontSize: 9, color: "#333333", width: 160, textAlign: "right", paddingRight: 12 },
  totalVal: { fontSize: 9, fontFamily: "Helvetica-Bold", color: "#111111", width: 90, textAlign: "right" },
  totalDivider: { borderTopWidth: 0.5, borderTopColor: "#aaaaaa", width: 260, marginBottom: 4, marginTop: 2 },
  sectionTitle: { fontSize: 9, fontFamily: "Helvetica-Bold", color: "#111111", marginBottom: 4, marginTop: 14 },
  sectionLine: { fontSize: 9, color: "#333333", marginBottom: 2, lineHeight: 1.4 },
  importantBox: { marginTop: 16, borderTopWidth: 0.5, borderTopColor: "#cccccc", paddingTop: 10 },
  importantTitle: { fontSize: 9, fontFamily: "Helvetica-Bold", color: "#111111", marginBottom: 5 },
  importantItem: { fontSize: 8, color: "#444444", marginBottom: 3, lineHeight: 1.4 },
  signatureBlock: { marginTop: 20, borderTopWidth: 0.5, borderTopColor: "#cccccc", paddingTop: 10 },
  signatureText: { fontSize: 9, color: "#333333", marginBottom: 2 },
})

function fmt(n: number) {
  return n.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function InvoiceDoc() {
  const items = [
    { description: "Classic Reformer (Champagne)", qty: 1, unit_price: 8500, amount: 8500 },
    { description: "Delivery & Installation", qty: 1, unit_price: 300, amount: 300 },
  ]
  const total = 8800
  const deposit = 3000
  const balance = 5800

  return (
    <Document>
      <Page size="A4" style={invStyles.page}>
        <View style={invStyles.headerRow}>
          {LOGO_SRC
            ? <Image src={LOGO_SRC} style={invStyles.logoImg} />
            : <Text style={{ fontSize: 28, fontFamily: "Helvetica-Bold" }}>pulse</Text>
          }
          <View style={invStyles.companyBlock}>
            <Text style={invStyles.companyName}>UTOPIA HOLIDAY SDN BHD (1358713-H)</Text>
            <Text style={invStyles.companyDetail}>{"A-30 Level 2 Sentul Point, Puncak Sentul, No. 8 Jalan Sentul Perdana, 51000 Kuala Lumpur"}</Text>
            <Text style={invStyles.companyDetail}>{"Email: pilatesreformer.my@gmail.com   Tel: +60 18-929 4693"}</Text>
          </View>
        </View>

        <View style={invStyles.divider} />

        <View style={invStyles.billRow}>
          <View style={invStyles.billToBlock}>
            <Text style={invStyles.billLabel}>To:</Text>
            <Text style={invStyles.billCustomerName}>Michelle Ng,</Text>
            <Text style={invStyles.billCustomerLine}>Kuala Lumpur,</Text>
            <Text style={invStyles.billCustomerLine}>michelle@example.com | +60 12-345 6789</Text>
          </View>
          <View style={invStyles.billMetaBlock}>
            <View style={invStyles.billMetaRow}>
              <Text style={invStyles.billMetaKey}>Bill Number :</Text>
              <Text style={invStyles.billMetaVal}>INV-PPAS100</Text>
            </View>
            <View style={invStyles.billMetaRow}>
              <Text style={invStyles.billMetaKey}>Bill Date :</Text>
              <Text style={invStyles.billMetaVal}>13 Apr 2026</Text>
            </View>
          </View>
        </View>

        <Text style={invStyles.docTitle}>INVOICE</Text>

        <View style={invStyles.table}>
          <View style={invStyles.tableHeader}>
            <Text style={{ ...invStyles.thText, ...invStyles.colNo }}>Item</Text>
            <Text style={{ ...invStyles.thText, ...invStyles.colDesc }}>Description</Text>
            <Text style={{ ...invStyles.thText, ...invStyles.colQty }}>Quantity</Text>
            <Text style={{ ...invStyles.thText, ...invStyles.colUnit }}>Unit Price (RM)</Text>
            <Text style={{ ...invStyles.thText, ...invStyles.colAmount }}>Amount (RM)</Text>
          </View>
          {items.map((item, i) => (
            <View key={i} style={invStyles.tableRow}>
              <Text style={{ ...invStyles.tdText, ...invStyles.colNo }}>{i + 1}.</Text>
              <Text style={{ ...invStyles.tdText, ...invStyles.colDesc }}>{item.description}</Text>
              <Text style={{ ...invStyles.tdText, ...invStyles.colQty }}>{item.qty}</Text>
              <Text style={{ ...invStyles.tdText, ...invStyles.colUnit }}>{fmt(item.unit_price)}</Text>
              <Text style={{ ...invStyles.tdBold, ...invStyles.colAmount }}>{fmt(item.amount)}</Text>
            </View>
          ))}
        </View>

        <View style={invStyles.totalsArea}>
          <View style={invStyles.totalDivider} />
          <View style={invStyles.totalLine}>
            <Text style={invStyles.totalKey}>Total (RM)</Text>
            <Text style={invStyles.totalVal}>{fmt(total)}</Text>
          </View>
          <View style={invStyles.totalLine}>
            <Text style={invStyles.totalKey}>(-) Deposit (RM)</Text>
            <Text style={invStyles.totalVal}>{fmt(deposit)}</Text>
          </View>
          <View style={invStyles.totalDivider} />
          <View style={invStyles.totalLine}>
            <Text style={{ ...invStyles.totalKey, fontFamily: "Helvetica-Bold" }}>Balance (RM)</Text>
            <Text style={{ ...invStyles.totalVal, fontSize: 10 }}>{fmt(balance)}</Text>
          </View>
        </View>

        <Text style={invStyles.sectionTitle}>Delivery Details</Text>
        <Text style={invStyles.sectionLine}>{"Delivery Date : 20 Apr 2026"}</Text>
        <Text style={invStyles.sectionLine}>{"Delivery Time : TBC"}</Text>

        <Text style={invStyles.sectionTitle}>Payment Details</Text>
        <Text style={invStyles.sectionLine}>{"Buying Method                         : Direct Purchase - Cash Payment"}</Text>
        <Text style={invStyles.sectionLine}>{"Installment Period (if any)            : N/A"}</Text>
        <Text style={invStyles.sectionLine}>{"Installment Amount (if any)            : RM0.00 / monthly"}</Text>
        <Text style={invStyles.sectionLine}>{"Monthly Billing Date (if any)          : N/A"}</Text>
        <Text style={invStyles.sectionLine}>{"Auto Debit Effective Date (if any)     : N/A"}</Text>

        <View style={invStyles.importantBox}>
          <Text style={invStyles.importantTitle}>Important - Please Read</Text>
          <Text style={invStyles.importantItem}>{"1. Condominium Delivery : Please ensure all necessary permits for condo access are secured prior to delivery, delivery fee will apply even if the delivery is unsuccessful due to lack of permission to enter."}</Text>
          <Text style={invStyles.importantItem}>{"2. Installment Auto Debit : You will be provided with an auto debit link to enroll for installment payments starting from the second month onwards."}</Text>
        </View>

        <View style={invStyles.signatureBlock}>
          <Text style={invStyles.signatureText}>{"Utopia Holiday Sdn Bhd - CIMB Bank - 8010 343 152"}</Text>
          <Text style={invStyles.signatureText}>{"For Pulse Pilates :"}</Text>
          <Text style={{ ...invStyles.signatureText, marginTop: 6 }}>{"Issued By"}</Text>
          <Text style={{ ...invStyles.signatureText, fontFamily: "Helvetica-Bold" }}>{"Aisy"}</Text>
          <Text style={invStyles.signatureText}>{"Contact No : 018-929 4693"}</Text>
        </View>
      </Page>
    </Document>
  )
}

// ─── Quotation ─────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 9, color: "#222", paddingTop: 36, paddingBottom: 60, paddingHorizontal: 44, backgroundColor: "#fff" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 },
  logoImg: { width: 160, height: 80, objectFit: "contain" },
  companyBlock: { flex: 1, marginLeft: 32, alignItems: "flex-end" },
  companyName: { fontSize: 9, fontFamily: "Helvetica-Bold", color: "#111", textAlign: "right" },
  companyDetail: { fontSize: 7.5, color: "#555", textAlign: "right", marginTop: 1.5, lineHeight: 1.5 },
  metaBoxRow: { flexDirection: "row", justifyContent: "flex-end", gap: 8, marginBottom: 10 },
  metaBox: { borderWidth: 0.75, borderColor: "#999", paddingHorizontal: 10, paddingVertical: 5, minWidth: 130 },
  metaBoxLabel: { fontSize: 7, color: "#777", marginBottom: 2 },
  metaBoxValue: { fontSize: 9, fontFamily: "Helvetica-Bold", color: "#111" },
  divider: { borderBottomWidth: 0.75, borderBottomColor: "#ccc", marginBottom: 10 },
  clientRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 14 },
  clientBlock: { flex: 1 },
  clientLabel: { fontSize: 8, color: "#777", marginBottom: 3 },
  clientName: { fontSize: 10, fontFamily: "Helvetica-Bold", color: "#111", marginBottom: 2 },
  clientLine: { fontSize: 8.5, color: "#333", marginBottom: 1 },
  docTitle: { fontSize: 13, fontFamily: "Helvetica-Bold", letterSpacing: 3, textAlign: "center", color: "#111", marginBottom: 10 },
  tableHeader: { flexDirection: "row", backgroundColor: "#f0f0f0", borderTopWidth: 0.75, borderBottomWidth: 0.75, borderColor: "#999", paddingVertical: 5, paddingHorizontal: 4 },
  tableRow: { flexDirection: "row", borderBottomWidth: 0.4, borderBottomColor: "#e0e0e0", paddingVertical: 7, paddingHorizontal: 4, alignItems: "center" },
  thText: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: "#333" },
  tdLeft: { fontSize: 8.5, color: "#222" },
  td: { fontSize: 8.5, color: "#222", textAlign: "right" },
  colImg: { width: 44 },
  colProduct: { flex: 1 },
  colRemarks: { width: 70 },
  colQty: { width: 32, textAlign: "center" },
  colUnitPrice: { width: 68, textAlign: "right" },
  colTotal: { width: 72, textAlign: "right" },
  productImg: { width: 36, height: 36, objectFit: "contain" },
  totalsArea: { marginTop: 6, alignItems: "flex-end" },
  totalLine: { flexDirection: "row", justifyContent: "flex-end", marginBottom: 3 },
  totalKey: { fontSize: 8.5, color: "#444", width: 140, textAlign: "right", paddingRight: 10 },
  totalVal: { fontSize: 8.5, color: "#111", width: 80, textAlign: "right" },
  totalDivider: { borderTopWidth: 0.5, borderTopColor: "#aaa", width: 230, marginBottom: 3, marginTop: 2 },
  grandTotalLine: { flexDirection: "row", justifyContent: "flex-end", marginBottom: 3 },
  grandKey: { fontSize: 10, fontFamily: "Helvetica-Bold", color: "#111", width: 140, textAlign: "right", paddingRight: 10 },
  grandVal: { fontSize: 10, fontFamily: "Helvetica-Bold", color: "#111", width: 80, textAlign: "right" },
  discountVal: { fontSize: 8.5, color: "#c0392b", width: 80, textAlign: "right" },
  notesSection: { marginTop: 18, borderTopWidth: 0.5, borderTopColor: "#ccc", paddingTop: 10 },
  notesTitle: { fontSize: 8.5, fontFamily: "Helvetica-Bold", color: "#111", marginBottom: 5 },
  notesItem: { fontSize: 8, color: "#555", marginBottom: 3, lineHeight: 1.4 },
  footer: { marginTop: 14, borderTopWidth: 0.5, borderTopColor: "#ccc", paddingTop: 8 },
  footerText: { fontSize: 8, color: "#555", marginBottom: 2 },
  footerTCText: { fontSize: 7.5, color: "#888", lineHeight: 1.4 },
  validityText: { fontSize: 8, color: "#777", textAlign: "center", marginTop: 10 },
})

function QuotationDoc() {
  const items = [
    { product_name: "Classic Reformer", colour_name: "Champagne", logo_engraving: false, qty: 1, unit_price: 8500 },
    { product_name: "Maple Chair", colour_name: "", logo_engraving: false, qty: 1, unit_price: 3200 },
  ]
  const delivery_fee = 300
  const installation_fee = 0
  const discounts = [{ label: "Staff Referral", amount: 300 }]
  const subtotal = items.reduce((s, item) => s + item.unit_price * item.qty, 0)
  const totalDiscount = discounts.reduce((s, d) => s + d.amount, 0)
  const total = subtotal + delivery_fee + installation_fee - totalDiscount

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.headerRow}>
          {LOGO_SRC
            ? <Image src={LOGO_SRC} style={s.logoImg} />
            : <Text style={{ fontSize: 28, fontFamily: "Helvetica-Bold" }}>pulse</Text>
          }
          <View style={s.companyBlock}>
            <Text style={s.companyName}>UTOPIA HOLIDAY SDN BHD (1358713-H)</Text>
            <Text style={s.companyDetail}>{"A-30 Level 2 Sentul Point, Puncak Sentul"}</Text>
            <Text style={s.companyDetail}>{"No. 8 Jalan Sentul Perdana, 51000 Kuala Lumpur"}</Text>
            <Text style={s.companyDetail}>{"pilatesreformer.my@gmail.com  |  +60 18-929 4693"}</Text>
          </View>
        </View>

        {/* Meta boxes */}
        <View style={s.metaBoxRow}>
          <View style={s.metaBox}>
            <Text style={s.metaBoxLabel}>Quotation #</Text>
            <Text style={s.metaBoxValue}>QUO-20260413-001</Text>
          </View>
          <View style={s.metaBox}>
            <Text style={s.metaBoxLabel}>Date of Quotation</Text>
            <Text style={s.metaBoxValue}>13 April 2026</Text>
          </View>
        </View>

        <View style={s.divider} />

        {/* Client block */}
        <View style={s.clientBlock}>
          <Text style={s.clientLabel}>Prepared for:</Text>
          <Text style={s.clientName}>Michelle Ng</Text>
          <Text style={s.clientLine}>Kuala Lumpur, Malaysia</Text>
          <Text style={s.clientLine}>michelle@example.com  |  +60 12-345 6789</Text>
        </View>

        <Text style={[s.docTitle, { marginTop: 14 }]}>Q U O T A T I O N</Text>

        {/* Table */}
        <View style={s.tableHeader}>
          <View style={s.colImg} />
          <Text style={{ ...s.thText, ...s.colProduct }}>Product / Description</Text>
          <Text style={{ ...s.thText, ...s.colRemarks }}>Remarks</Text>
          <Text style={{ ...s.thText, ...s.colQty, textAlign: "center" }}>Qty</Text>
          <Text style={{ ...s.thText, ...s.colUnitPrice }}>Unit Price (RM)</Text>
          <Text style={{ ...s.thText, ...s.colTotal }}>Total (RM)</Text>
        </View>

        {items.map((item, i) => {
          const imgSrc = getProductImage(item.product_name)
          const itemTotal = item.unit_price * item.qty
          return (
            <View key={i} style={s.tableRow}>
              <View style={s.colImg}>
                {imgSrc ? <Image src={imgSrc} style={s.productImg} /> : <View style={s.productImg} />}
              </View>
              <Text style={{ ...s.tdLeft, ...s.colProduct }}>{item.product_name}{item.colour_name ? ` (${item.colour_name})` : ""}</Text>
              <Text style={{ ...s.td, ...s.colRemarks }} />
              <Text style={{ ...s.td, ...s.colQty, textAlign: "center" }}>{item.qty}</Text>
              <Text style={{ ...s.td, ...s.colUnitPrice }}>{item.unit_price.toLocaleString()}</Text>
              <Text style={{ ...s.td, ...s.colTotal }}>{itemTotal.toLocaleString()}</Text>
            </View>
          )
        })}

        {/* Totals */}
        <View style={s.totalsArea}>
          <View style={s.totalDivider} />
          <View style={s.totalLine}>
            <Text style={s.totalKey}>Subtotal (RM)</Text>
            <Text style={s.totalVal}>{subtotal.toLocaleString()}</Text>
          </View>
          {delivery_fee > 0 && (
            <View style={s.totalLine}>
              <Text style={s.totalKey}>Delivery Fee (RM)</Text>
              <Text style={s.totalVal}>{delivery_fee.toLocaleString()}</Text>
            </View>
          )}
          {discounts.map((d, i) => (
            <View key={i} style={s.totalLine}>
              <Text style={s.totalKey}>{`(-) Discount (${d.label})`}</Text>
              <Text style={s.discountVal}>{`-${d.amount.toLocaleString()}`}</Text>
            </View>
          ))}
          <View style={s.totalDivider} />
          <View style={s.grandTotalLine}>
            <Text style={s.grandKey}>Grand Total (RM)</Text>
            <Text style={s.grandVal}>{total.toLocaleString()}</Text>
          </View>
        </View>

        {/* Notes */}
        <View style={s.notesSection}>
          <Text style={s.notesTitle}>Terms & Conditions</Text>
          <Text style={s.notesItem}>{"1. This quotation is valid for 7 days from the date of issue."}</Text>
          <Text style={s.notesItem}>{"2. Prices quoted are in Malaysian Ringgit (RM) and are subject to change without prior notice."}</Text>
          <Text style={s.notesItem}>{"3. Delivery lead time is approximately 2–4 weeks upon confirmation and deposit received."}</Text>
          <Text style={s.notesItem}>{"4. Full payment or agreed deposit required before order is processed."}</Text>
          <Text style={s.notesItem}>{"5. Colour customisation and UV print logo add-ons are non-refundable once confirmed."}</Text>
        </View>

        <Text style={s.validityText}>This quotation was prepared by Pulse Pilates · pilatesreformer.my</Text>
      </Page>
    </Document>
  )
}

// ─── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log("Generating invoice PDF…")
  const invBuf = await renderToBuffer(React.createElement(InvoiceDoc))
  const invPath = path.join(OUT_DIR, "TEMPLATE-Invoice.pdf")
  fs.writeFileSync(invPath, invBuf)
  console.log("  ✓ Saved:", invPath)

  console.log("Generating quotation PDF…")
  const quoBuf = await renderToBuffer(React.createElement(QuotationDoc))
  const quoPath = path.join(OUT_DIR, "TEMPLATE-Quotation.pdf")
  fs.writeFileSync(quoPath, quoBuf)
  console.log("  ✓ Saved:", quoPath)

  console.log("Done.")
}

main().catch((e) => { console.error(e); process.exit(1) })
