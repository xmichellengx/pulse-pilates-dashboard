export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { renderToBuffer } from "@react-pdf/renderer"
import React from "react"
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer"

// ---------- styles ----------

const s = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    color: "#000",
    paddingTop: 32,
    paddingBottom: 48,
    paddingHorizontal: 36,
    backgroundColor: "#fff",
  },

  // ---- Header ----
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  logoPulse: {
    fontSize: 38,
    fontFamily: "Helvetica-Bold",
    color: "#000",
    lineHeight: 1,
    letterSpacing: -1,
  },
  logoPilates: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: "#000",
    textAlign: "right",
    marginTop: -2,
    letterSpacing: 3,
  },
  headerRight: {
    alignItems: "flex-end",
    maxWidth: 260,
  },
  quotationRef: {
    fontSize: 9,
    color: "#000",
    marginBottom: 6,
  },
  companyName: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#000",
    marginBottom: 2,
  },
  companyDetail: {
    fontSize: 8,
    color: "#333",
    textAlign: "right",
    lineHeight: 1.5,
  },

  // ---- Title ----
  titleRow: {
    alignItems: "center",
    marginBottom: 10,
  },
  title: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: "#000",
    textAlign: "center",
  },

  // ---- Customer Info ----
  customerBox: {
    backgroundColor: "#f0f0f0",
    padding: 10,
    marginBottom: 10,
  },
  customerTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#000",
    marginBottom: 6,
  },
  customerRow: {
    flexDirection: "row",
    marginBottom: 3,
  },
  customerLabel: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#000",
    width: 100,
  },
  customerValue: {
    fontSize: 8,
    color: "#000",
    flex: 1,
  },

  // ---- Purchase Mode ----
  modeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 24,
  },
  modeItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  checkBox: {
    width: 10,
    height: 10,
    borderWidth: 1,
    borderColor: "#000",
    borderStyle: "solid",
    alignItems: "center",
    justifyContent: "center",
  },
  checkBoxChecked: {
    width: 10,
    height: 10,
    borderWidth: 1,
    borderColor: "#000",
    borderStyle: "solid",
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
  },
  checkMark: {
    fontSize: 7,
    color: "#fff",
    fontFamily: "Helvetica-Bold",
  },
  modeLabel: {
    fontSize: 9,
    color: "#000",
  },

  // ---- Table ----
  tableHeaderRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#000",
    borderStyle: "solid",
    paddingVertical: 4,
    backgroundColor: "#f0f0f0",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#ccc",
    borderBottomStyle: "solid",
    paddingVertical: 5,
    minHeight: 22,
  },
  customisationRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#ccc",
    borderBottomStyle: "solid",
    paddingVertical: 5,
    backgroundColor: "#fafafa",
  },
  th: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#000",
    textAlign: "center",
  },
  td: {
    fontSize: 8,
    color: "#000",
    textAlign: "center",
  },
  tdBold: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#000",
  },
  tdLeft: {
    fontSize: 8,
    color: "#000",
    textAlign: "left",
  },
  customisationLabel: {
    fontSize: 7,
    color: "#555",
    fontFamily: "Helvetica-Oblique",
    marginTop: 1,
  },

  // column widths
  colProduct: { flex: 3, paddingLeft: 4 },
  colRemarks: { flex: 2.5, paddingHorizontal: 4 },
  colQty: { width: 40, textAlign: "center" },
  colUnitPrice: { width: 64, textAlign: "right", paddingRight: 6 },
  colTotal: { width: 64, textAlign: "right", paddingRight: 4 },

  // rental extra cols
  colPerMonth: { width: 50, textAlign: "right", paddingRight: 4 },
  colYear: { width: 64, textAlign: "right", paddingRight: 4 },

  // ---- Totals ----
  totalsSection: {
    alignItems: "flex-end",
    marginTop: 6,
    marginBottom: 10,
  },
  totalsBox: {
    width: 240,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
    paddingHorizontal: 6,
  },
  totalLabel: {
    fontSize: 8,
    color: "#000",
  },
  totalValue: {
    fontSize: 8,
    color: "#000",
    fontFamily: "Helvetica-Bold",
    minWidth: 70,
    textAlign: "right",
  },
  grandTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#e0e0e0",
    paddingVertical: 5,
    paddingHorizontal: 6,
    marginTop: 2,
  },
  grandTotalLabel: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#000",
  },
  grandTotalValue: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#000",
    minWidth: 70,
    textAlign: "right",
  },

  // ---- Footer ----
  footerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 12,
    gap: 12,
  },
  footerBankBox: {
    backgroundColor: "#000",
    padding: 10,
    width: 160,
  },
  footerBankLine: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#fff",
    marginBottom: 2,
  },
  footerTCBox: {
    flex: 1,
  },
  footerTCTitle: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#000",
    marginBottom: 4,
  },
  footerTCText: {
    fontSize: 7.5,
    color: "#333",
    lineHeight: 1.5,
  },
})

// ---------- interfaces ----------

interface LineItem {
  product_id: string
  product_name: string
  qty: number
  unit_price: number
  purchase_mode: string
  custom_colour: boolean
  colour_name: string
  logo_engraving: boolean
  engraving_notes: string
  customisation_surcharge: number
}

interface QuotationPDFInput {
  quotation_number: string
  customer_name: string
  customer_phone: string
  customer_email?: string
  studio_name?: string
  market: string
  pricing_tier?: string
  items: LineItem[]
  delivery_fee: number
  installation_fee: number
  subtotal: number
  total: number
  estimated_delivery?: string
  delivery_location?: string
  remarks?: string
}

// ---------- helpers ----------

function fmt(n: number, currency: string) {
  return `${currency} ${n.toLocaleString("en-MY", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

// ---------- PDF Document ----------

function QuotationDocument(props: QuotationPDFInput) {
  const {
    quotation_number,
    customer_name,
    customer_phone,
    customer_email,
    studio_name,
    market,
    items,
    delivery_fee,
    installation_fee,
    total,
    estimated_delivery,
    delivery_location,
  } = props

  const currency = market === "SG" ? "SGD" : "RM"
  const validItems = items.filter((i) => i.product_id)

  // Determine dominant purchase mode
  const isRental = validItems.length > 0 && validItems.every((i) => i.purchase_mode === "rental")
  const isInstalment = !isRental && validItems.some((i) => i.purchase_mode === "cc_installment")

  // Customisation items (colour / logo per product)
  const colourItems = validItems.filter((i) => i.custom_colour)
  const logoItems = validItems.filter((i) => i.logo_engraving)

  // Rental totals
  const monthlyTotal = isRental
    ? validItems.reduce((s, i) => s + i.unit_price * i.qty, 0)
    : 0
  const deposit4M = monthlyTotal * 4
  const rentalActivation = isRental ? delivery_fee + installation_fee + monthlyTotal + deposit4M : 0

  return (
    <Document>
      <Page size="A4" style={s.page}>

        {/* ── Header ── */}
        <View style={s.headerRow}>
          {/* Logo */}
          <View>
            <Text style={s.logoPulse}>pulse</Text>
            <Text style={s.logoPilates}>pilates</Text>
          </View>

          {/* Company info + Quotation # */}
          <View style={s.headerRight}>
            <Text style={s.quotationRef}>Quotation #: {quotation_number}</Text>
            <Text style={s.companyName}>Pulse Pilates Sdn. Bhd. (1569742-U)</Text>
            <Text style={s.companyDetail}>
              {"Level 2 A2-30, Sentul Point, 8, Jln Sentul Pasar,\nSentul, 51000 Kuala Lumpur.\nTel : +6018-929 4693\nEmail: pilatesreformer.my@gmail.com"}
            </Text>
          </View>
        </View>

        {/* ── Title ── */}
        <View style={s.titleRow}>
          <Text style={s.title}>Quotation</Text>
        </View>

        {/* ── Customer Information ── */}
        <View style={s.customerBox}>
          <Text style={s.customerTitle}>Customer Information</Text>
          <View style={s.customerRow}>
            <Text style={s.customerLabel}>Name :</Text>
            <Text style={s.customerValue}>{customer_name}</Text>
          </View>
          <View style={s.customerRow}>
            <Text style={s.customerLabel}>WhatsApp:</Text>
            <Text style={s.customerValue}>{customer_phone}</Text>
          </View>
          {customer_email ? (
            <View style={s.customerRow}>
              <Text style={s.customerLabel}>Email:</Text>
              <Text style={s.customerValue}>{customer_email}</Text>
            </View>
          ) : null}
          <View style={s.customerRow}>
            <Text style={s.customerLabel}>Studio Name:</Text>
            <Text style={s.customerValue}>{studio_name ?? ""}</Text>
          </View>
          <View style={s.customerRow}>
            <Text style={s.customerLabel}>Studio Location:</Text>
            <Text style={s.customerValue}>{delivery_location ?? ""}</Text>
          </View>
          <View style={s.customerRow}>
            <Text style={s.customerLabel}>Estimated Delivery:</Text>
            <Text style={s.customerValue}>{estimated_delivery ?? ""}</Text>
          </View>
        </View>

        {/* ── Purchase Mode checkboxes ── */}
        <View style={s.modeRow}>
          <View style={s.modeItem}>
            <View style={isRental ? s.checkBoxChecked : s.checkBox}>
              {isRental && <Text style={s.checkMark}>✓</Text>}
            </View>
            <Text style={s.modeLabel}>Rental</Text>
          </View>
          <View style={s.modeItem}>
            <View style={!isRental && !isInstalment ? s.checkBoxChecked : s.checkBox}>
              {!isRental && !isInstalment && <Text style={s.checkMark}>✓</Text>}
            </View>
            <Text style={s.modeLabel}>Purchase</Text>
          </View>
          <View style={s.modeItem}>
            <View style={isInstalment ? s.checkBoxChecked : s.checkBox}>
              {isInstalment && <Text style={s.checkMark}>✓</Text>}
            </View>
            <Text style={s.modeLabel}>Purchase - Installment</Text>
          </View>
        </View>

        {/* ── Product Table ── */}
        {isRental ? (
          /* Rental table */
          <View>
            <View style={s.tableHeaderRow}>
              <Text style={{ ...s.th, ...s.colProduct }}>Product Name</Text>
              <Text style={{ ...s.th, ...s.colRemarks }}>Remarks</Text>
              <Text style={{ ...s.th, ...s.colQty }}>Qty</Text>
              <Text style={{ ...s.th, ...s.colUnitPrice }}>Unit Price</Text>
              <Text style={{ ...s.th, ...s.colPerMonth }}>/month</Text>
              <Text style={{ ...s.th, ...s.colYear }}>12 months</Text>
            </View>
            {validItems.map((item, i) => {
              const monthly = item.unit_price * item.qty
              const yearly = monthly * 12
              return (
                <View key={i} style={s.tableRow}>
                  <Text style={{ ...s.tdBold, ...s.colProduct }}>{item.product_name}</Text>
                  <Text style={{ ...s.tdLeft, ...s.colRemarks }}></Text>
                  <Text style={{ ...s.td, ...s.colQty }}>{item.qty}</Text>
                  <Text style={{ ...s.td, ...s.colUnitPrice }}>{currency} {item.unit_price.toLocaleString()}</Text>
                  <Text style={{ ...s.td, ...s.colPerMonth }}>{currency} {monthly.toLocaleString()}</Text>
                  <Text style={{ ...s.td, ...s.colYear }}>{currency} {yearly.toLocaleString()}</Text>
                </View>
              )
            })}
          </View>
        ) : (
          /* Purchase / Installment table */
          <View>
            <View style={s.tableHeaderRow}>
              <Text style={{ ...s.th, ...s.colProduct }}>Product Name</Text>
              <Text style={{ ...s.th, ...s.colRemarks }}>Remarks</Text>
              <Text style={{ ...s.th, ...s.colQty }}>Quantity</Text>
              <Text style={{ ...s.th, ...s.colUnitPrice }}>Unit Price ({currency})</Text>
              <Text style={{ ...s.th, ...s.colTotal }}>Total Price ({currency})</Text>
            </View>
            {validItems.map((item, i) => {
              const lineTotal = item.unit_price * item.qty
              const remarks = [
                item.custom_colour && item.colour_name ? `Colour: ${item.colour_name}` : "",
                item.logo_engraving && item.engraving_notes ? `Logo: ${item.engraving_notes}` : "",
              ].filter(Boolean).join(", ")
              return (
                <View key={i} style={s.tableRow}>
                  <Text style={{ ...s.tdBold, ...s.colProduct }}>{item.product_name}</Text>
                  <Text style={{ ...s.tdLeft, ...s.colRemarks }}>{remarks}</Text>
                  <Text style={{ ...s.td, ...s.colQty }}>{item.qty}</Text>
                  <Text style={{ ...s.td, ...s.colUnitPrice }}>{item.unit_price.toLocaleString()}</Text>
                  <Text style={{ ...s.td, ...s.colTotal }}>{lineTotal.toLocaleString()}</Text>
                </View>
              )
            })}

            {/* Customisation rows */}
            {colourItems.map((item, i) => (
              <View key={`colour-${i}`} style={s.customisationRow}>
                <Text style={{ ...s.customisationLabel, ...s.colProduct, paddingLeft: 4 }}>
                  Customisation
                </Text>
                <Text style={{ ...s.td, ...s.colRemarks, textAlign: "left" }}>
                  PU Color{item.colour_name ? ` — ${item.colour_name}` : ""}
                </Text>
                <Text style={{ ...s.td, ...s.colQty }}>{item.qty}</Text>
                <Text style={{ ...s.td, ...s.colUnitPrice }}>300</Text>
                <Text style={{ ...s.td, ...s.colTotal }}>{(300 * item.qty).toLocaleString()}</Text>
              </View>
            ))}
            {logoItems.map((item, i) => (
              <View key={`logo-${i}`} style={s.customisationRow}>
                <Text style={{ ...s.customisationLabel, ...s.colProduct, paddingLeft: 4 }}>
                  Customisation
                </Text>
                <Text style={{ ...s.td, ...s.colRemarks, textAlign: "left" }}>
                  UV Print Logo{item.engraving_notes ? ` — ${item.engraving_notes}` : ""}
                </Text>
                <Text style={{ ...s.td, ...s.colQty }}>{item.qty}</Text>
                <Text style={{ ...s.td, ...s.colUnitPrice }}>200</Text>
                <Text style={{ ...s.td, ...s.colTotal }}>{(200 * item.qty).toLocaleString()}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── Totals ── */}
        <View style={s.totalsSection}>
          <View style={s.totalsBox}>
            {isRental ? (
              <>
                <View style={s.totalRow}>
                  <Text style={s.totalLabel}>(+) Delivery Fee ({currency})</Text>
                  <Text style={s.totalValue}>{delivery_fee.toLocaleString()}</Text>
                </View>
                <View style={s.totalRow}>
                  <Text style={s.totalLabel}>(+) Installation Fee ({currency})</Text>
                  <Text style={s.totalValue}>{installation_fee.toLocaleString()}</Text>
                </View>
                <View style={s.totalRow}>
                  <Text style={s.totalLabel}>(+) 1st Month Rental</Text>
                  <Text style={s.totalValue}>{monthlyTotal.toLocaleString()}</Text>
                </View>
                <View style={s.totalRow}>
                  <Text style={s.totalLabel}>(+) Deposit 4 Months</Text>
                  <Text style={s.totalValue}>{deposit4M.toLocaleString()}</Text>
                </View>
                <View style={s.grandTotalRow}>
                  <Text style={s.grandTotalLabel}>Rental Activation ({currency})</Text>
                  <Text style={s.grandTotalValue}>{rentalActivation.toLocaleString()}</Text>
                </View>
                <View style={s.totalRow}>
                  <Text style={s.totalLabel}>(-) Booking Fee ({currency})</Text>
                  <Text style={s.totalValue}></Text>
                </View>
              </>
            ) : (
              <>
                <View style={s.totalRow}>
                  <Text style={s.totalLabel}>(+) Delivery Fee ({currency})</Text>
                  <Text style={s.totalValue}>{delivery_fee.toLocaleString()}</Text>
                </View>
                <View style={s.totalRow}>
                  <Text style={s.totalLabel}>(+) Installation Fee ({currency})</Text>
                  <Text style={s.totalValue}>{installation_fee.toLocaleString()}</Text>
                </View>
                <View style={s.grandTotalRow}>
                  <Text style={s.grandTotalLabel}>Grand Total ({currency})</Text>
                  <Text style={s.grandTotalValue}>{fmt(total, currency)}</Text>
                </View>
                <View style={s.totalRow}>
                  <Text style={s.totalLabel}>(-) Booking Fee ({currency})</Text>
                  <Text style={s.totalValue}></Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* ── Footer ── */}
        <View style={s.footerRow}>
          {/* Black bank box */}
          <View style={s.footerBankBox}>
            <Text style={s.footerBankLine}>Pulse Pilates Sdn Bhd</Text>
            <Text style={s.footerBankLine}>Maybank 5140 1249 2051</Text>
          </View>

          {/* Terms & Conditions */}
          <View style={s.footerTCBox}>
            <Text style={s.footerTCTitle}>Terms and Conditions</Text>
            <Text style={s.footerTCText}>
              {"(i) This quotation is valid for 14 days only.\n(ii) To secure the quotation price and avoid price fluctuation, book before the expiration date. Please check with your sales consultants."}
            </Text>
          </View>
        </View>

      </Page>
    </Document>
  )
}

// ---------- Route handler ----------

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as QuotationPDFInput
    const pdfBuffer = await renderToBuffer(<QuotationDocument {...body} />)

    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${body.quotation_number ?? "quotation"}.pdf"`,
      },
    })
  } catch (err) {
    console.error("Quotation PDF error:", err)
    return NextResponse.json({ error: "PDF generation failed" }, { status: 500 })
  }
}
