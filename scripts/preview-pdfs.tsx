#!/usr/bin/env npx tsx
/**
 * Generates sample PDFs and saves them to the Desktop folder for preview.
 * Run: npx tsx scripts/preview-pdfs.tsx
 */

// Must set cwd so imgB64 path resolution works like in Next.js
process.chdir("/Users/michelleng/pulse-pilates")

import { renderToBuffer } from "@react-pdf/renderer"
import React from "react"
import fs from "fs"
import path from "path"
import {
  Document, Page, Text, View, Image, StyleSheet,
} from "@react-pdf/renderer"

const OUT_DIR = "/Users/michelleng/Desktop/AI/Pulse Dashbord"

// ── Shared helpers ─────────────────────────────────────────────────────────────
function imgB64(filePath: string): string {
  try {
    const buf = fs.readFileSync(filePath)
    const ext = path.extname(filePath).slice(1).toLowerCase()
    return `data:image/${ext === "jpg" ? "jpeg" : ext};base64,${buf.toString("base64")}`
  } catch { return "" }
}
const PUBLIC = path.join(process.cwd(), "public")
const LOGO = imgB64(path.join(PUBLIC, "pulse-logo.png"))
const EQ = path.join(PUBLIC, "equipment")
function productImg(name: string): string {
  const n = name.toLowerCase()
  if (n.includes("foldable")) return imgB64(path.join(EQ, "Alu II Foldable Reformer.png"))
  if (n.includes("alu") && n.includes("tower")) return imgB64(path.join(EQ, "Alu II Tower.png"))
  if (n.includes("alu") && n.includes("reformer")) return imgB64(path.join(EQ, "Alu II Reformer.png"))
  if (n.includes("cadillac")) return imgB64(path.join(EQ, "Classic Cadillac.png"))
  if (n.includes("reformer")) return imgB64(path.join(EQ, "Classic Reformer.png"))
  if (n.includes("barrel")) return imgB64(path.join(EQ, "Foot-Adjustable Barrel.png"))
  if (n.includes("chair") || n.includes("maple")) return imgB64(path.join(EQ, "Chair.png"))
  if (n.includes("elevare")) return imgB64(path.join(EQ, "Elevare II.png"))
  return ""
}
function fmt(n: number) {
  return n.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// ═══════════════════════════════════════════════════════════════════════════════
// INVOICE / RECEIPT TEMPLATE
// ═══════════════════════════════════════════════════════════════════════════════
const inv = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 9, color: "#1a1a1a", paddingTop: 36, paddingBottom: 56, paddingHorizontal: 48, backgroundColor: "#fff" },
  headerRow: { flexDirection: "row", alignItems: "center", marginBottom: 18 },
  logoImg: { width: 90, height: 90 },
  companyBlock: { flex: 1, paddingLeft: 16 },
  companyNameRow: { flexDirection: "row", alignItems: "baseline", marginBottom: 2 },
  companyNameBig: { fontSize: 17, fontFamily: "Helvetica-Bold", color: "#111", letterSpacing: 0.4 },
  companyReg: { fontSize: 8.5, color: "#444", marginLeft: 5 },
  companyAddress: { fontSize: 8, color: "#555", marginBottom: 1, lineHeight: 1.5 },
  companyContact: { fontSize: 8, color: "#555", marginBottom: 1 },
  companyWebsite: { fontSize: 8, color: "#555" },
  divider: { borderBottomWidth: 0.75, borderBottomColor: "#bbb", marginBottom: 14 },
  billRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 14 },
  billToBlock: { flex: 1 },
  toLabel: { fontSize: 9, fontFamily: "Helvetica-Bold", color: "#111", marginBottom: 3 },
  billLine: { fontSize: 9, color: "#222", marginBottom: 1 },
  billMetaBlock: { alignItems: "flex-end" },
  billMetaRow: { flexDirection: "row", marginBottom: 2 },
  billMetaKey: { fontSize: 9, fontFamily: "Helvetica-Bold", color: "#111", width: 70, textAlign: "right", marginRight: 6 },
  billMetaVal: { fontSize: 9, color: "#222", minWidth: 100 },
  docTitle: { fontSize: 11, fontFamily: "Helvetica-Bold", color: "#111", textAlign: "center", marginBottom: 10, textDecoration: "underline", letterSpacing: 1 },
  tableHeader: { flexDirection: "row", borderTopWidth: 0.5, borderBottomWidth: 0.5, borderColor: "#999", paddingVertical: 5, paddingHorizontal: 2, backgroundColor: "#fafafa" },
  tableRow: { flexDirection: "row", borderBottomWidth: 0.4, borderBottomColor: "#e8e8e8", paddingVertical: 7, paddingHorizontal: 2 },
  colItem: { width: 36, textAlign: "center" },
  colDesc: { flex: 1 },
  colQty: { width: 60, textAlign: "center" },
  colUnit: { width: 100, textAlign: "right" },
  colAmt: { width: 100, textAlign: "right" },
  thText: { fontSize: 8.5, fontFamily: "Helvetica-Bold", color: "#333" },
  tdText: { fontSize: 9, color: "#333" },
  tdBold: { fontSize: 9, fontFamily: "Helvetica-Bold", color: "#111" },
  tdSub: { fontSize: 8, color: "#777", fontFamily: "Helvetica-Oblique" },
  totalsArea: { alignItems: "flex-end", marginTop: 4, marginBottom: 16 },
  totalLine: { flexDirection: "row", justifyContent: "flex-end", marginBottom: 3 },
  totalKey: { fontSize: 9, fontFamily: "Helvetica-Bold", color: "#111", width: 120, textAlign: "right", paddingRight: 10 },
  totalVal: { fontSize: 9, color: "#111", width: 100, textAlign: "right" },
  totalValBold: { fontSize: 9, fontFamily: "Helvetica-Bold", color: "#111", width: 100, textAlign: "right" },
  totalDivider: { borderTopWidth: 0.5, borderTopColor: "#aaa", width: 230, marginTop: 2, marginBottom: 4 },
  sectionTitle: { fontSize: 9, fontFamily: "Helvetica-Bold", color: "#111", marginBottom: 4, marginTop: 10 },
  sectionLine: { flexDirection: "row", marginBottom: 3 },
  sectionKey: { fontSize: 9, color: "#333", width: 130 },
  sectionVal: { fontSize: 9, color: "#222", flex: 1 },
  importantBox: { marginTop: 14, paddingTop: 8 },
  importantTitle: { fontSize: 9, fontFamily: "Helvetica-BoldOblique", color: "#111", marginBottom: 5 },
  importantItem: { fontSize: 8, color: "#333", marginBottom: 3, lineHeight: 1.45 },
  importantLabel: { fontFamily: "Helvetica-Bold" },
  bankLine: { marginTop: 16, paddingTop: 10, fontSize: 9, fontFamily: "Helvetica-Bold", color: "#111", marginBottom: 10 },
  forPulse: { fontSize: 9, fontFamily: "Helvetica-Bold", color: "#111", marginBottom: 16 },
  issuedByLabel: { fontSize: 9, color: "#333", marginBottom: 2 },
  issuedByName: { fontSize: 9, fontFamily: "Helvetica-BoldOblique", color: "#111", marginBottom: 2 },
  contactLine: { fontSize: 9, color: "#333" },
})

type DocType = "invoice" | "receipt" | "rental"
interface Item { description: string; sub_description?: string; qty: number; unit_price: number; amount: number }

function InvoiceDoc({ docType, items, total, deposit, balance, issuedBy, billNo, billDate, reference, rental }: {
  docType: DocType; items: Item[]; total: number; deposit: number; balance: number; issuedBy: string
  billNo: string; billDate: string; reference?: string
  rental?: { start_date: string; monthly_amount: number; billing_date: string; auto_debit_date: string }
}) {
  const title = docType === "receipt" ? "RECEIPT" : "INVOICE"
  const isRental = docType === "rental"

  return (
    <Document>
      <Page size="A4" style={inv.page}>
        {/* Header */}
        <View style={inv.headerRow}>
          {LOGO ? <Image src={LOGO} style={inv.logoImg} /> : <Text style={{ fontSize: 22, fontFamily: "Helvetica-Bold" }}>pulse{"\n"}pilates</Text>}
          <View style={inv.companyBlock}>
            <View style={inv.companyNameRow}>
              <Text style={inv.companyNameBig}>PULSE PILATES SDN. BHD.</Text>
              <Text style={inv.companyReg}> (1569742-U)</Text>
            </View>
            <Text style={inv.companyAddress}>{"A-30, Level 2, Sentul Point, Puncak Sentul, No.8 Jalan Sentul Perdana, 5100 Kuala Lumpur"}</Text>
            <Text style={inv.companyContact}>{"Email: pilatesreformer.my@gmail.com     Tel: +6018-929 4693"}</Text>
            <Text style={inv.companyWebsite}>{"www.pilatesreformer.my"}</Text>
          </View>
        </View>

        <View style={inv.divider} />

        {/* Bill to + meta */}
        <View style={inv.billRow}>
          <View style={inv.billToBlock}>
            <Text style={inv.toLabel}>To :</Text>
            <Text style={inv.billLine}>{"Michelle Ng,"}</Text>
            <Text style={inv.billLine}>{"Kuala Lumpur,"}</Text>
            <Text style={inv.billLine}>{"michelle@example.com | +60 12-345 6789"}</Text>
          </View>
          <View style={inv.billMetaBlock}>
            <View style={inv.billMetaRow}>
              <Text style={inv.billMetaKey}>Bill Number</Text>
              <Text style={inv.billMetaVal}>{": " + billNo}</Text>
            </View>
            <View style={inv.billMetaRow}>
              <Text style={inv.billMetaKey}>Bill Date</Text>
              <Text style={inv.billMetaVal}>{": " + billDate}</Text>
            </View>
            {reference && (
              <View style={inv.billMetaRow}>
                <Text style={inv.billMetaKey}>Reference</Text>
                <Text style={inv.billMetaVal}>{": " + reference}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Title */}
        <Text style={inv.docTitle}>{title}</Text>

        {/* Table */}
        <View style={inv.tableHeader}>
          <Text style={{ ...inv.thText, ...inv.colItem }}>Item</Text>
          <Text style={{ ...inv.thText, ...inv.colDesc }}>Description</Text>
          <Text style={{ ...inv.thText, ...inv.colQty }}>Quantity</Text>
          <Text style={{ ...inv.thText, ...inv.colUnit }}>Unit Price (RM)</Text>
          <Text style={{ ...inv.thText, ...inv.colAmt }}>Amount  (RM)</Text>
        </View>
        {items.map((item, i) => (
          <View key={i} style={inv.tableRow}>
            <Text style={{ ...inv.tdText, ...inv.colItem }}>{i + 1}.</Text>
            <View style={inv.colDesc}>
              <Text style={inv.tdText}>{item.description}</Text>
              {item.sub_description && <Text style={inv.tdSub}>{item.sub_description}</Text>}
            </View>
            <Text style={{ ...inv.tdText, ...inv.colQty }}>{item.qty}</Text>
            <Text style={{ ...inv.tdText, ...inv.colUnit }}>{fmt(item.unit_price)}</Text>
            <Text style={{ ...inv.tdText, ...inv.colAmt }}>{fmt(item.amount)}</Text>
          </View>
        ))}

        {/* Totals */}
        <View style={inv.totalsArea}>
          <View style={inv.totalLine}>
            <Text style={inv.totalKey}>Total (RM)</Text>
            <Text style={inv.totalValBold}>{fmt(total)}</Text>
          </View>
          <View style={inv.totalLine}>
            <Text style={inv.totalKey}>(-) Deposit (RM)</Text>
            <Text style={inv.totalVal}>{fmt(deposit)}</Text>
          </View>
          <View style={inv.totalDivider} />
          <View style={inv.totalLine}>
            <Text style={inv.totalKey}>Balance (RM)</Text>
            <Text style={inv.totalValBold}>{fmt(balance)}</Text>
          </View>
        </View>

        {/* Delivery */}
        <Text style={inv.sectionTitle}>Delivery Details</Text>
        <View style={inv.sectionLine}>
          <Text style={inv.sectionKey}>Delivery Date</Text>
          <Text style={inv.sectionVal}>{": 20 Apr 2026"}</Text>
        </View>

        {/* Payment / Rental */}
        {isRental && rental ? (
          <>
            <Text style={inv.sectionTitle}>Rental Details</Text>
            <View style={inv.sectionLine}>
              <Text style={inv.sectionKey}>Start Date</Text>
              <Text style={inv.sectionVal}>{": " + rental.start_date}</Text>
            </View>
            <View style={inv.sectionLine}>
              <Text style={inv.sectionKey}>Rental Amount</Text>
              <Text style={inv.sectionVal}>{": RM" + fmt(rental.monthly_amount) + " / monthly"}</Text>
            </View>
            <View style={inv.sectionLine}>
              <Text style={inv.sectionKey}>Monthly Billing Date</Text>
              <Text style={inv.sectionVal}>{`: Deduction on every ${rental.billing_date} of the month (Effective From ${rental.auto_debit_date})`}</Text>
            </View>
          </>
        ) : (
          <>
            <Text style={inv.sectionTitle}>Payment Details</Text>
            <View style={inv.sectionLine}>
              <Text style={inv.sectionKey}>Buying Method</Text>
              <Text style={inv.sectionVal}>{": Direct Purchase"}</Text>
            </View>
            <View style={inv.sectionLine}>
              <Text style={inv.sectionKey}>Payment Date</Text>
              <Text style={inv.sectionVal}>{": 13 Apr 2026"}</Text>
            </View>
          </>
        )}

        {/* Notes */}
        <View style={inv.importantBox}>
          <Text style={inv.importantTitle}>Important - Please Read</Text>
          <Text style={inv.importantItem}>
            <Text style={inv.importantLabel}>{"1. Condominium Delivery : "}</Text>
            {"Please ensure all necessary permits for condo access are secured prior to delivery, delivery fee will apply even if the delivery is unsuccessful due to lack of permission to enter."}
          </Text>
          {isRental ? (
            <>
              <Text style={inv.importantItem}><Text style={inv.importantLabel}>{"2. Minimum rental duration: "}</Text>{"3 months"}</Text>
              <Text style={inv.importantItem}><Text style={inv.importantLabel}>{"3. Document Verification: "}</Text>{"Photo of IC/PASSPORT/LICENSE upon delivery for verification"}</Text>
              <Text style={inv.importantItem}><Text style={inv.importantLabel}>{"4. Payex setup: "}</Text>{"Set up of auto-debit account for monthly recurring rental"}</Text>
              <Text style={inv.importantItem}><Text style={inv.importantLabel}>{"5. Termination: "}</Text>{"A minimum of two weeks notice before your next charging cycle needs to be given if you wish to terminate"}</Text>
              <Text style={inv.importantItem}><Text style={inv.importantLabel}>{"6. Damage: "}</Text>{"Any cost or replacement, fixing, etc due to external damages on equipment during rental duration should bear by renter, according to our schedule of equipment parts"}</Text>
              <Text style={inv.importantItem}><Text style={inv.importantLabel}>{"7. Rental Unit: "}</Text>{"For rental based on stock availability you might receive a used unit in good condition. In the event of conversion to purchase, we will exchange with a new unit, delivery charges is applicable."}</Text>
            </>
          ) : (
            <>
              <Text style={inv.importantItem}><Text style={inv.importantLabel}>{"2. Warranty Period : "}</Text>{"All our equipments comes with 3 months warranty on spring, 6 months warranty on equipment for manufacturing defect, any damage caused by external factors are not eligible for warranty."}</Text>
              {docType === "invoice" && (
                <Text style={inv.importantItem}><Text style={inv.importantLabel}>{"3. Delivery Timeline : "}</Text>{"The delivery timeline provided is an estimate and may be subject to change due to unforeseen circumstances such as logistics delays, customs clearance or other factors beyond our control."}</Text>
              )}
            </>
          )}
        </View>

        {/* Footer */}
        <Text style={inv.bankLine}>{"Pulse Pilates Sdn Bhd - Maybank Berhad - 5140 1249 2051"}</Text>
        <Text style={inv.forPulse}>{"For Pulse Pilates :"}</Text>
        <Text style={inv.issuedByLabel}>{"Issued By"}</Text>
        <Text style={inv.issuedByName}>{issuedBy}</Text>
        <Text style={inv.contactLine}>{"Contact No : 018-929 4693"}</Text>
      </Page>
    </Document>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUOTATION TEMPLATE
// ═══════════════════════════════════════════════════════════════════════════════
const q = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 9, color: "#222", paddingTop: 36, paddingBottom: 60, paddingHorizontal: 44, backgroundColor: "#fff" },
  headerRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  logoImg: { width: 90, height: 90 },
  companyBlock: { flex: 1, paddingLeft: 16 },
  companyNameRow: { flexDirection: "row", alignItems: "baseline", marginBottom: 2 },
  companyNameBig: { fontSize: 17, fontFamily: "Helvetica-Bold", color: "#111", letterSpacing: 0.4 },
  companyReg: { fontSize: 8.5, color: "#444", marginLeft: 5 },
  companyAddress: { fontSize: 8, color: "#555", marginBottom: 1, lineHeight: 1.5 },
  companyContact: { fontSize: 8, color: "#555", marginBottom: 1 },
  companyWebsite: { fontSize: 8, color: "#555" },
  metaBoxRow: { flexDirection: "row", justifyContent: "flex-end", gap: 8, marginBottom: 10 },
  metaBox: { borderWidth: 0.75, borderColor: "#999", paddingHorizontal: 10, paddingVertical: 5, minWidth: 130 },
  metaBoxLabel: { fontSize: 7, color: "#777", marginBottom: 2 },
  metaBoxValue: { fontSize: 9, fontFamily: "Helvetica-Bold", color: "#111" },
  divider: { borderBottomWidth: 0.75, borderBottomColor: "#ccc", marginBottom: 10 },
  clientBlock: { marginBottom: 14 },
  clientLabel: { fontSize: 8, color: "#777", marginBottom: 3 },
  clientName: { fontSize: 10, fontFamily: "Helvetica-Bold", color: "#111", marginBottom: 2 },
  clientLine: { fontSize: 8.5, color: "#333", marginBottom: 1 },
  docTitle: { fontSize: 13, fontFamily: "Helvetica-Bold", letterSpacing: 3, textAlign: "center", color: "#111", marginBottom: 10, textDecoration: "underline" },
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
  grandKey: { fontSize: 10, fontFamily: "Helvetica-Bold", color: "#111", width: 140, textAlign: "right", paddingRight: 10 },
  grandVal: { fontSize: 10, fontFamily: "Helvetica-Bold", color: "#111", width: 80, textAlign: "right" },
  discountVal: { fontSize: 8.5, color: "#c0392b", width: 80, textAlign: "right" },
  notesSection: { marginTop: 18, borderTopWidth: 0.5, borderTopColor: "#ccc", paddingTop: 10 },
  notesTitle: { fontSize: 8.5, fontFamily: "Helvetica-Bold", color: "#111", marginBottom: 5 },
  notesItem: { fontSize: 8, color: "#555", marginBottom: 3, lineHeight: 1.4 },
  validityText: { fontSize: 8, color: "#777", textAlign: "center", marginTop: 10 },
})

function QuotationDoc() {
  const items = [
    { product_name: "Classic Reformer", colour_name: "Champagne", qty: 1, unit_price: 8500 },
    { product_name: "Maple Chair", colour_name: "", qty: 1, unit_price: 3200 },
  ]
  const delivery_fee = 300
  const discounts = [{ label: "Staff Referral", amount: 300 }]
  const subtotal = items.reduce((s, i) => s + i.unit_price * i.qty, 0)
  const totalDiscount = discounts.reduce((s, d) => s + d.amount, 0)
  const total = subtotal + delivery_fee - totalDiscount

  return (
    <Document>
      <Page size="A4" style={q.page}>
        {/* Header */}
        <View style={q.headerRow}>
          {LOGO ? <Image src={LOGO} style={q.logoImg} /> : <Text style={{ fontSize: 22, fontFamily: "Helvetica-Bold" }}>pulse{"\n"}pilates</Text>}
          <View style={q.companyBlock}>
            <View style={q.companyNameRow}>
              <Text style={q.companyNameBig}>PULSE PILATES SDN. BHD.</Text>
              <Text style={q.companyReg}> (1569742-U)</Text>
            </View>
            <Text style={q.companyAddress}>{"A-30, Level 2, Sentul Point, Puncak Sentul, No.8 Jalan Sentul Perdana, 5100 Kuala Lumpur"}</Text>
            <Text style={q.companyContact}>{"Email: pilatesreformer.my@gmail.com     Tel: +6018-929 4693"}</Text>
            <Text style={q.companyWebsite}>{"www.pilatesreformer.my"}</Text>
          </View>
        </View>

        {/* Meta boxes */}
        <View style={q.metaBoxRow}>
          <View style={q.metaBox}>
            <Text style={q.metaBoxLabel}>Quotation #</Text>
            <Text style={q.metaBoxValue}>QUO-20260413-001</Text>
          </View>
          <View style={q.metaBox}>
            <Text style={q.metaBoxLabel}>Date of Quotation</Text>
            <Text style={q.metaBoxValue}>13 April 2026</Text>
          </View>
        </View>

        <View style={q.divider} />

        {/* Client */}
        <View style={q.clientBlock}>
          <Text style={q.clientLabel}>Prepared for:</Text>
          <Text style={q.clientName}>Michelle Ng</Text>
          <Text style={q.clientLine}>Kuala Lumpur, Malaysia</Text>
          <Text style={q.clientLine}>michelle@example.com  |  +60 12-345 6789</Text>
        </View>

        <Text style={q.docTitle}>Q U O T A T I O N</Text>

        {/* Table */}
        <View style={q.tableHeader}>
          <View style={q.colImg} />
          <Text style={{ ...q.thText, ...q.colProduct }}>Product / Description</Text>
          <Text style={{ ...q.thText, ...q.colRemarks }}>Remarks</Text>
          <Text style={{ ...q.thText, ...q.colQty, textAlign: "center" }}>Qty</Text>
          <Text style={{ ...q.thText, ...q.colUnitPrice }}>Unit Price (RM)</Text>
          <Text style={{ ...q.thText, ...q.colTotal }}>Total (RM)</Text>
        </View>
        {items.map((item, i) => {
          const imgSrc = productImg(item.product_name)
          return (
            <View key={i} style={q.tableRow}>
              <View style={q.colImg}>
                {imgSrc ? <Image src={imgSrc} style={q.productImg} /> : <View style={q.productImg} />}
              </View>
              <Text style={{ ...q.tdLeft, ...q.colProduct }}>{item.product_name}{item.colour_name ? ` (${item.colour_name})` : ""}</Text>
              <Text style={{ ...q.td, ...q.colRemarks }} />
              <Text style={{ ...q.td, ...q.colQty, textAlign: "center" }}>{item.qty}</Text>
              <Text style={{ ...q.td, ...q.colUnitPrice }}>{item.unit_price.toLocaleString()}</Text>
              <Text style={{ ...q.td, ...q.colTotal }}>{(item.unit_price * item.qty).toLocaleString()}</Text>
            </View>
          )
        })}

        {/* Totals */}
        <View style={q.totalsArea}>
          <View style={q.totalDivider} />
          <View style={q.totalLine}>
            <Text style={q.totalKey}>Subtotal (RM)</Text>
            <Text style={q.totalVal}>{subtotal.toLocaleString()}</Text>
          </View>
          {delivery_fee > 0 && (
            <View style={q.totalLine}>
              <Text style={q.totalKey}>Delivery Fee (RM)</Text>
              <Text style={q.totalVal}>{delivery_fee.toLocaleString()}</Text>
            </View>
          )}
          {discounts.map((d, i) => (
            <View key={i} style={q.totalLine}>
              <Text style={q.totalKey}>{`(-) Discount (${d.label})`}</Text>
              <Text style={q.discountVal}>{`-${d.amount.toLocaleString()}`}</Text>
            </View>
          ))}
          <View style={q.totalDivider} />
          <View style={q.totalLine}>
            <Text style={q.grandKey}>Grand Total (RM)</Text>
            <Text style={q.grandVal}>{total.toLocaleString()}</Text>
          </View>
        </View>

        {/* T&Cs */}
        <View style={q.notesSection}>
          <Text style={q.notesTitle}>Terms & Conditions</Text>
          <Text style={q.notesItem}>{"1. This quotation is valid for 7 days from the date of issue."}</Text>
          <Text style={q.notesItem}>{"2. Prices quoted are in Malaysian Ringgit (RM) and are subject to change without prior notice."}</Text>
          <Text style={q.notesItem}>{"3. Delivery lead time is approximately 2–4 weeks upon confirmation and deposit received."}</Text>
          <Text style={q.notesItem}>{"4. Full payment or agreed deposit required before order is processed."}</Text>
          <Text style={q.notesItem}>{"5. Colour customisation and UV print logo add-ons are non-refundable once confirmed."}</Text>
        </View>
        <Text style={q.validityText}>This quotation was prepared by Pulse Pilates · pilatesreformer.my</Text>
      </Page>
    </Document>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════
const sampleItems: Item[] = [
  { description: "Classic Reformer (Champagne)", qty: 1, unit_price: 8500, amount: 8500 },
  { description: "Product Delivery", qty: 1, unit_price: 300, amount: 300 },
  { description: "Product Installation", qty: 1, unit_price: 0, amount: 0 },
  { description: "(-) Promotional Discount", sub_description: "Staff Referral", qty: 1, unit_price: -300, amount: -300 },
]
const total = 8500
const deposit = 3000
const balance = 5500

async function main() {
  const jobs: [string, React.ReactElement][] = [
    ["TEMPLATE-Purchase-Invoice.pdf", <InvoiceDoc docType="invoice" items={sampleItems} total={total} deposit={deposit} balance={balance} issuedBy="Aisy" billNo="INV-PPAS100" billDate="13 Apr 2026" reference="Classic Reformer Order" />],
    ["TEMPLATE-Purchase-Receipt.pdf", <InvoiceDoc docType="receipt" items={sampleItems} total={total} deposit={deposit} balance={balance} issuedBy="Aisy" billNo="REC-PPAS100" billDate="13 Apr 2026" />],
    ["TEMPLATE-Rental-Invoice.pdf",   <InvoiceDoc docType="rental"  items={[
      { description: "Classic Reformer (Champagne) - 1st Month Rental", qty: 1, unit_price: 500, amount: 500 },
      { description: "Product Delivery", qty: 1, unit_price: 300, amount: 300 },
      { description: "Product Installation", qty: 1, unit_price: 0, amount: 0 },
    ]} total={800} deposit={500} balance={300} issuedBy="Aisy" billNo="INV-PPAS101" billDate="13 Apr 2026"
      rental={{ start_date: "20 Apr 2026", monthly_amount: 500, billing_date: "20th", auto_debit_date: "20 May 2026" }} />],
    ["TEMPLATE-Quotation.pdf", <QuotationDoc />],
  ]

  for (const [filename, el] of jobs) {
    console.log(`Generating ${filename}…`)
    const buf = await renderToBuffer(el)
    fs.writeFileSync(path.join(OUT_DIR, filename), buf)
    console.log(`  ✓ Saved`)
  }
  console.log("Done.")
}

main().catch((e) => { console.error(e); process.exit(1) })
