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
  invoiceTag: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: "#1e293b",
    textAlign: "right",
  },
  invoiceNumber: {
    fontSize: 10,
    color: "#64748b",
    textAlign: "right",
    marginTop: 4,
  },
  invoiceDate: {
    fontSize: 9,
    color: "#94a3b8",
    textAlign: "right",
    marginTop: 2,
  },
  statusBadge: {
    marginTop: 6,
    backgroundColor: "#dcfce7",
    borderRadius: 4,
    paddingVertical: 3,
    paddingHorizontal: 8,
    alignSelf: "flex-end",
  },
  statusText: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#166534",
    textAlign: "right",
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
    backgroundColor: "#1e293b",
    borderRadius: 4,
    paddingVertical: 7,
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
  colDesc: { flex: 4 },
  colQty: { flex: 1, textAlign: "center" },
  colUnit: { flex: 2, textAlign: "right" },
  colAmount: { flex: 2, textAlign: "right" },
  thText: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#fff",
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
    backgroundColor: "#1e293b",
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
  paymentBox: {
    backgroundColor: "#f0f9ff",
    borderRadius: 6,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: "#6366f1",
  },
  paymentTitle: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#1e40af",
    marginBottom: 4,
  },
  paymentText: {
    fontSize: 9,
    color: "#1e293b",
    lineHeight: 1.6,
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

interface InvoiceLineItem {
  description: string
  qty: number
  unit_price: number
  amount: number
}

interface InvoicePDFInput {
  invoice_number: string
  type: string
  customer_name: string
  customer_email?: string
  order_case_code?: string
  items: InvoiceLineItem[]
  amount: number
  currency: string
  due_date?: string
}

function InvoiceDocument(props: InvoicePDFInput) {
  const {
    invoice_number,
    type,
    customer_name,
    customer_email,
    order_case_code,
    items,
    amount,
    currency,
    due_date,
  } = props

  const today = new Date().toLocaleDateString("en-MY", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
  const dueDateStr =
    due_date ||
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString("en-MY", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })

  const typeLabel =
    type === "rental" ? "Rental Invoice" : type === "deposit" ? "Deposit Invoice" : "Invoice"

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
            <Text style={{ ...styles.brandSub, marginTop: 8 }}>Malaysia & Singapore</Text>
          </View>
          <View>
            <Text style={styles.invoiceTag}>{typeLabel.toUpperCase()}</Text>
            <Text style={styles.invoiceNumber}>{invoice_number}</Text>
            <Text style={styles.invoiceDate}>Issue date: {today}</Text>
            <Text style={styles.invoiceDate}>Due date: {dueDateStr}</Text>
            {order_case_code && (
              <Text style={{ ...styles.invoiceDate, marginTop: 4, color: "#6366f1" }}>
                Ref: {order_case_code}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.divider} />

        {/* Customer */}
        <View style={styles.sectionRow}>
          <View style={styles.sectionBox}>
            <Text style={styles.sectionLabel}>BILLED TO</Text>
            <Text style={styles.sectionValueBold}>{customer_name}</Text>
            {customer_email && (
              <Text style={styles.sectionValue}>{customer_email}</Text>
            )}
          </View>
          <View style={styles.sectionBox}>
            <Text style={styles.sectionLabel}>INVOICE DETAILS</Text>
            <Text style={styles.sectionValue}>
              {"Type: " + typeLabel + "\nDue: " + dueDateStr}
            </Text>
          </View>
        </View>

        {/* Items */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={{ ...styles.thText, ...styles.colDesc }}>DESCRIPTION</Text>
            <Text style={{ ...styles.thText, ...styles.colQty }}>QTY</Text>
            <Text style={{ ...styles.thText, ...styles.colUnit }}>UNIT PRICE</Text>
            <Text style={{ ...styles.thText, ...styles.colAmount }}>AMOUNT</Text>
          </View>
          {items.map((item, i) => (
            <View key={i} style={styles.tableRow}>
              <Text style={{ ...styles.tdBold, ...styles.colDesc }}>{item.description}</Text>
              <Text style={{ ...styles.tdText, ...styles.colQty }}>{item.qty}</Text>
              <Text style={{ ...styles.tdText, ...styles.colUnit }}>
                {currency} {item.unit_price.toLocaleString()}
              </Text>
              <Text style={{ ...styles.tdBold, ...styles.colAmount }}>
                {currency} {item.amount.toLocaleString()}
              </Text>
            </View>
          ))}
        </View>

        {/* Total */}
        <View style={styles.totalsBox}>
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>TOTAL DUE</Text>
            <Text style={styles.grandTotalValue}>
              {currency} {amount.toLocaleString()}
            </Text>
          </View>
        </View>

        {/* Payment instructions */}
        <View style={styles.paymentBox}>
          <Text style={styles.paymentTitle}>PAYMENT INSTRUCTIONS</Text>
          <Text style={styles.paymentText}>
            {
              "Please transfer payment to:\nBank: Maybank / CIMB\nAccount name: Pulse Pilates Sdn Bhd\n\nInclude your invoice number " +
              invoice_number +
              " as reference.\nPayment due by " +
              dueDateStr +
              "."
            }
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>pilatesreformer.my</Text>
          <Text style={styles.footerText}>Questions? Contact us at hello@pilatesreformer.my</Text>
          <Text style={styles.footerText}>{invoice_number}</Text>
        </View>
      </Page>
    </Document>
  )
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as InvoicePDFInput

    const pdfBuffer = await renderToBuffer(<InvoiceDocument {...body} />)

    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${body.invoice_number ?? "invoice"}.pdf"`,
      },
    })
  } catch (err) {
    console.error("Invoice PDF error:", err)
    return NextResponse.json({ error: "PDF generation failed" }, { status: 500 })
  }
}
