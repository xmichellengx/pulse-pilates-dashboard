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

// ---- PDF styles ----

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    color: "#1e293b",
    paddingTop: 48,
    paddingBottom: 64,
    paddingHorizontal: 48,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 28,
  },
  logoBox: {
    width: 40,
    height: 40,
    backgroundColor: "#6366f1",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  logoText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
  },
  brandName: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: "#1e293b",
    marginTop: 4,
  },
  brandSub: {
    fontSize: 8,
    color: "#64748b",
    marginTop: 2,
  },
  docTitle: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: "#6366f1",
    textAlign: "right",
  },
  docNumber: {
    fontSize: 10,
    color: "#64748b",
    textAlign: "right",
    marginTop: 4,
  },
  docDate: {
    fontSize: 9,
    color: "#94a3b8",
    textAlign: "right",
    marginTop: 2,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    marginBottom: 20,
  },
  sectionRow: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 20,
  },
  sectionBox: {
    flex: 1,
    backgroundColor: "#f8fafc",
    borderRadius: 6,
    padding: 12,
  },
  sectionLabel: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#94a3b8",
    marginBottom: 6,
  },
  sectionValue: {
    fontSize: 10,
    color: "#1e293b",
    lineHeight: 1.6,
  },
  sectionValueBold: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#1e293b",
    marginBottom: 2,
  },
  table: {
    marginBottom: 16,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    borderRadius: 4,
    paddingVertical: 6,
    paddingHorizontal: 8,
    marginBottom: 2,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  colProduct: { flex: 3 },
  colQty: { flex: 1, textAlign: "center" },
  colUnitPrice: { flex: 2, textAlign: "right" },
  colCustom: { flex: 2, textAlign: "right" },
  colSubtotal: { flex: 2, textAlign: "right" },
  thText: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#64748b",
  },
  tdText: {
    fontSize: 10,
    color: "#334155",
  },
  tdBold: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#1e293b",
  },
  totalsBox: {
    marginLeft: "auto",
    width: 220,
    marginBottom: 20,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
  },
  totalLabel: {
    fontSize: 10,
    color: "#64748b",
  },
  totalValue: {
    fontSize: 10,
    color: "#1e293b",
    fontFamily: "Helvetica-Bold",
  },
  grandTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: "#6366f1",
    borderRadius: 6,
    marginTop: 6,
  },
  grandTotalLabel: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: "#fff",
  },
  grandTotalValue: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: "#fff",
  },
  validityBox: {
    backgroundColor: "#fef9c3",
    borderRadius: 4,
    padding: 8,
    marginBottom: 16,
  },
  validityText: {
    fontSize: 9,
    color: "#92400e",
  },
  footer: {
    position: "absolute",
    bottom: 28,
    left: 48,
    right: 48,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 8,
  },
  footerText: {
    fontSize: 8,
    color: "#94a3b8",
  },
})

// ---- interfaces ----

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
  customer_email?: string
  customer_phone: string
  market: string
  items: LineItem[]
  delivery_fee: number
  installation_fee: number
  subtotal: number
  total: number
  estimated_delivery?: string
  delivery_location?: string
  remarks?: string
}

// ---- PDF document ----

function QuotationDocument(props: QuotationPDFInput) {
  const {
    quotation_number,
    customer_name,
    customer_email,
    customer_phone,
    market,
    items,
    delivery_fee,
    installation_fee,
    subtotal,
    total,
    estimated_delivery,
    delivery_location,
    remarks,
  } = props

  const currency = market === "SG" ? "SGD" : "RM"
  const today = new Date().toLocaleDateString("en-MY", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
  const expiryDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString("en-MY", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })

  const validItems = items.filter((i) => i.product_id)

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View style={styles.logoBox}>
                <Text style={styles.logoText}>PP</Text>
              </View>
              <View>
                <Text style={styles.brandName}>Pulse Pilates</Text>
                <Text style={styles.brandSub}>pilatesreformer.my</Text>
              </View>
            </View>
            <Text style={{ ...styles.brandSub, marginTop: 8 }}>
              Malaysia & Singapore
            </Text>
          </View>
          <View>
            <Text style={styles.docTitle}>QUOTATION</Text>
            <Text style={styles.docNumber}>{quotation_number}</Text>
            <Text style={styles.docDate}>Issued: {today}</Text>
            <Text style={styles.docDate}>Valid until: {expiryDate}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Customer + Delivery */}
        <View style={styles.sectionRow}>
          <View style={styles.sectionBox}>
            <Text style={styles.sectionLabel}>BILLED TO</Text>
            <Text style={styles.sectionValueBold}>{customer_name}</Text>
            <Text style={styles.sectionValue}>
              {customer_phone}
              {customer_email ? "\n" + customer_email : ""}
              {"\nMarket: " + market}
            </Text>
          </View>
          <View style={styles.sectionBox}>
            <Text style={styles.sectionLabel}>DELIVERY</Text>
            <Text style={styles.sectionValue}>
              {delivery_location || "To be confirmed"}
              {estimated_delivery ? "\nETA: " + estimated_delivery : ""}
              {remarks ? "\n\nNotes: " + remarks : ""}
            </Text>
          </View>
        </View>

        {/* Items table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={{ ...styles.thText, ...styles.colProduct }}>PRODUCT</Text>
            <Text style={{ ...styles.thText, ...styles.colQty }}>QTY</Text>
            <Text style={{ ...styles.thText, ...styles.colUnitPrice }}>UNIT PRICE</Text>
            <Text style={{ ...styles.thText, ...styles.colCustom }}>CUSTOMISATION</Text>
            <Text style={{ ...styles.thText, ...styles.colSubtotal }}>SUBTOTAL</Text>
          </View>
          {validItems.map((item, i) => {
            const lineSubtotal = item.unit_price * item.qty + item.customisation_surcharge
            const customNotes = [
              item.custom_colour && item.colour_name ? "Colour: " + item.colour_name : "",
              item.logo_engraving
                ? "Logo" + (item.engraving_notes ? ": " + item.engraving_notes : "")
                : "",
            ]
              .filter(Boolean)
              .join(", ")

            return (
              <View key={i} style={styles.tableRow}>
                <View style={styles.colProduct}>
                  <Text style={styles.tdBold}>{item.product_name}</Text>
                  <Text style={{ fontSize: 8, color: "#6366f1", marginTop: 1 }}>
                    {item.purchase_mode === "rental"
                      ? "Rental"
                      : item.purchase_mode === "cc_installment"
                      ? "CC Installment"
                      : "Direct Purchase"}
                  </Text>
                </View>
                <Text style={{ ...styles.tdText, ...styles.colQty }}>{item.qty}</Text>
                <Text style={{ ...styles.tdText, ...styles.colUnitPrice }}>
                  {currency} {item.unit_price.toLocaleString()}
                </Text>
                <View style={styles.colCustom}>
                  {item.customisation_surcharge > 0 ? (
                    <>
                      <Text style={{ ...styles.tdText, textAlign: "right" }}>
                        {currency} {item.customisation_surcharge.toLocaleString()}
                      </Text>
                      {customNotes ? (
                        <Text style={{ fontSize: 7, color: "#64748b", textAlign: "right", marginTop: 1 }}>
                          {customNotes}
                        </Text>
                      ) : null}
                    </>
                  ) : (
                    <Text style={{ ...styles.tdText, textAlign: "right", color: "#94a3b8" }}>—</Text>
                  )}
                </View>
                <Text style={{ ...styles.tdBold, ...styles.colSubtotal }}>
                  {currency} {lineSubtotal.toLocaleString()}
                </Text>
              </View>
            )
          })}
        </View>

        {/* Totals */}
        <View style={styles.totalsBox}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Equipment Subtotal</Text>
            <Text style={styles.totalValue}>{currency} {subtotal.toLocaleString()}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Delivery</Text>
            <Text style={styles.totalValue}>{currency} {delivery_fee.toLocaleString()}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Installation</Text>
            <Text style={styles.totalValue}>{currency} {installation_fee.toLocaleString()}</Text>
          </View>
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>TOTAL</Text>
            <Text style={styles.grandTotalValue}>{currency} {total.toLocaleString()}</Text>
          </View>
        </View>

        {/* Validity */}
        <View style={styles.validityBox}>
          <Text style={styles.validityText}>
            This quotation is valid for 7 days from the date of issue (expires {expiryDate}).
            Prices are subject to change after this period. Thank you for your interest.
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>pilatesreformer.my</Text>
          <Text style={styles.footerText}>Thank you for choosing Pulse Pilates</Text>
          <Text style={styles.footerText}>{quotation_number}</Text>
        </View>
      </Page>
    </Document>
  )
}

// ---- Route handler ----

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
