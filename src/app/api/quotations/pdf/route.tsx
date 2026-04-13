export const runtime = "nodejs"

import fs from "fs"
import path from "path"
import { NextRequest, NextResponse } from "next/server"
import { renderToBuffer } from "@react-pdf/renderer"
import React from "react"
import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer"

// ---------- image helpers ----------

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

// Product name → image file mapping (fuzzy)
const EQUIPMENT_DIR = path.join(PUBLIC, "equipment")
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

// ---------- styles ----------

const PURPLE = "#4a1a6e"

const s = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    color: "#000",
    paddingTop: 28,
    paddingBottom: 40,
    paddingHorizontal: 32,
    backgroundColor: "#fff",
  },

  // Header
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  logo: {
    width: 100,
    height: 100,
  },
  headerRight: {
    alignItems: "flex-end",
    flex: 1,
    paddingLeft: 16,
    justifyContent: "center",
  },
  quotationRefLabel: {
    fontSize: 8,
    color: "#555",
    marginBottom: 2,
  },
  quotationRefBox: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderStyle: "solid",
    padding: "3 8",
    marginBottom: 4,
    minWidth: 160,
    textAlign: "right",
  },
  quotationRefValue: {
    fontSize: 8,
    color: "#000",
    textAlign: "right",
  },
  companyName: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#000",
    textAlign: "right",
    marginBottom: 4,
  },
  companyDetail: {
    fontSize: 8.5,
    color: "#444",
    textAlign: "right",
    lineHeight: 1.6,
  },

  // Title
  titleRow: { alignItems: "center", marginBottom: 10 },
  title: { fontSize: 20, fontFamily: "Helvetica-Bold", color: "#000" },

  // Customer box
  customerBox: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderStyle: "solid",
    padding: 10,
    marginBottom: 10,
  },
  customerTitle: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    marginBottom: 6,
  },
  customerRow: { flexDirection: "row", marginBottom: 3 },
  customerLabel: { fontSize: 8, fontFamily: "Helvetica-Bold", width: 110 },
  customerValue: { fontSize: 8, flex: 1 },

  // Purchase mode checkboxes
  modeRow: { flexDirection: "row", alignItems: "center", marginBottom: 8, gap: 24 },
  modeItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  checkBox: {
    width: 10, height: 10,
    borderWidth: 1, borderColor: "#000", borderStyle: "solid",
    alignItems: "center", justifyContent: "center",
  },
  checkBoxChecked: {
    width: 10, height: 10,
    borderWidth: 1, borderColor: "#000", borderStyle: "solid",
    backgroundColor: "#000",
    alignItems: "center", justifyContent: "center",
  },
  checkMark: { fontSize: 7, color: "#fff", fontFamily: "Helvetica-Bold" },
  modeLabel: { fontSize: 9, color: "#000" },

  // Table
  tableHeaderRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#000",
    borderStyle: "solid",
    paddingVertical: 4,
    backgroundColor: "#f0f0f0",
    alignItems: "center",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#ccc",
    borderBottomStyle: "solid",
    minHeight: 44,
    alignItems: "center",
  },
  customisationRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#ccc",
    borderBottomStyle: "solid",
    paddingVertical: 4,
    backgroundColor: "#fafafa",
    alignItems: "center",
  },
  th: { fontSize: 8, fontFamily: "Helvetica-Bold", color: "#000", textAlign: "center" },
  td: { fontSize: 8, color: "#000", textAlign: "center" },
  tdBold: { fontSize: 8, fontFamily: "Helvetica-Bold", color: "#000" },
  tdLeft: { fontSize: 8, color: "#000", textAlign: "left" },

  // Column widths (image | product | remarks | qty | unit | total)
  colImg: { width: 42, alignItems: "center", justifyContent: "center" },
  colProduct: { flex: 2.5, paddingLeft: 4 },
  colRemarks: { flex: 2, paddingHorizontal: 4 },
  colQty: { width: 36, textAlign: "center" },
  colUnitPrice: { width: 60, textAlign: "right", paddingRight: 6 },
  colTotal: { width: 60, textAlign: "right", paddingRight: 4 },

  productImg: { width: 36, height: 36, objectFit: "contain" },

  // Totals
  totalsSection: { alignItems: "flex-end", marginTop: 6, marginBottom: 10 },
  totalsBox: { width: 240 },
  totalRow: {
    flexDirection: "row", justifyContent: "space-between",
    paddingVertical: 3, paddingHorizontal: 6,
  },
  totalLabel: { fontSize: 8, color: "#000" },
  totalValue: { fontSize: 8, fontFamily: "Helvetica-Bold", color: "#000", minWidth: 70, textAlign: "right" },
  grandTotalRow: {
    flexDirection: "row", justifyContent: "space-between",
    backgroundColor: "#e0e0e0",
    paddingVertical: 5, paddingHorizontal: 6, marginTop: 2,
  },
  grandTotalLabel: { fontSize: 9, fontFamily: "Helvetica-Bold", color: "#000" },
  grandTotalValue: { fontSize: 9, fontFamily: "Helvetica-Bold", color: "#000", minWidth: 70, textAlign: "right" },
  discountRow: {
    flexDirection: "row", justifyContent: "space-between",
    paddingVertical: 3, paddingHorizontal: 6,
  },
  discountLabel: { fontSize: 8, color: "#c00" },
  discountValue: { fontSize: 8, fontFamily: "Helvetica-Bold", color: "#c00", minWidth: 70, textAlign: "right" },

  // Footer
  footerRow: { flexDirection: "row", alignItems: "flex-start", marginTop: 14, gap: 12 },
  footerBankBox: { backgroundColor: "#000", padding: 10, width: 160 },
  footerBankLine: { fontSize: 9, fontFamily: "Helvetica-Bold", color: "#fff", marginBottom: 2 },
  footerTCBox: { flex: 1 },
  footerTCTitle: { fontSize: 8, fontFamily: "Helvetica-Bold", color: "#000", marginBottom: 4 },
  footerTCText: { fontSize: 7.5, color: "#333", lineHeight: 1.5 },
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

interface DiscountItem {
  label: string
  amount: number
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
  discounts?: DiscountItem[]
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
    discounts,
    estimated_delivery,
    delivery_location,
  } = props

  const currency = market === "SG" ? "SGD" : "RM"
  const validItems = items.filter((i) => i.product_id)

  const isRental = validItems.length > 0 && validItems.every((i) => i.purchase_mode === "rental")
  const isInstalment = !isRental && validItems.some((i) => i.purchase_mode === "cc_installment")

  const colourItems = validItems.filter((i) => i.custom_colour)
  const logoItems = validItems.filter((i) => i.logo_engraving)

  const monthlyTotal = isRental ? validItems.reduce((s, i) => s + i.unit_price * i.qty, 0) : 0
  const deposit4M = monthlyTotal * 4
  const rentalActivation = isRental ? delivery_fee + installation_fee + monthlyTotal + deposit4M : 0

  const activeDiscounts = (discounts ?? []).filter((d) => d.amount > 0)

  const today = new Date()
  const dateStr = `${String(today.getDate()).padStart(2, "0")}/${String(today.getMonth() + 1).padStart(2, "0")}/${today.getFullYear()}`

  return (
    <Document>
      <Page size="A4" style={s.page}>

        {/* ── Header ── */}
        <View style={s.headerRow}>
          {/* Pulse logo PNG */}
          {LOGO_SRC ? (
            <Image src={LOGO_SRC} style={s.logo} />
          ) : (
            <View>
              <Text style={{ fontSize: 34, fontFamily: "Helvetica-Bold" }}>pulse</Text>
              <Text style={{ fontSize: 11, letterSpacing: 2 }}>pilates</Text>
            </View>
          )}

          {/* Right: Quotation # box + company */}
          <View style={s.headerRight}>
            <Text style={s.companyName}>Pulse Pilates Sdn. Bhd. (1569742-U)</Text>
            <Text style={s.companyDetail}>
              {"Level 2 A2-30, Sentul Point, 8, Jln Sentul Pasar,\nSentul, 51000 Kuala Lumpur.\nTel : +6018-929 4693   Email: pilatesreformer.my@gmail.com"}
            </Text>
            <View style={{ marginTop: 6, alignItems: "flex-end" }}>
              <Text style={{ fontSize: 7.5, color: "#555", marginBottom: 1 }}>Quotation #:</Text>
              <View style={s.quotationRefBox}>
                <Text style={s.quotationRefValue}>{quotation_number}</Text>
              </View>
              <Text style={{ fontSize: 7.5, color: "#555", marginBottom: 1 }}>Date of Quotation:</Text>
              <View style={s.quotationRefBox}>
                <Text style={s.quotationRefValue}>{dateStr}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Title ── */}
        <View style={s.titleRow}>
          <Text style={s.title}>Quotation</Text>
        </View>

        {/* ── Customer Info ── */}
        <View style={s.customerBox}>
          <Text style={s.customerTitle}>Customer Information</Text>
          {[
            ["Name :", customer_name],
            ["WhatsApp:", customer_phone],
            ["Email:", customer_email ?? ""],
            ["Studio Name:", studio_name ?? ""],
            ["Studio Location:", delivery_location ?? ""],
            ["Estimated Delivery:", estimated_delivery ?? "4 - 6 Working Weeks Upon Booking Confirmation"],
          ].map(([label, value]) => (
            <View key={label} style={s.customerRow}>
              <Text style={s.customerLabel}>{label}</Text>
              <Text style={s.customerValue}>{value}</Text>
            </View>
          ))}
        </View>

        {/* ── Purchase mode checkboxes ── */}
        <View style={s.modeRow}>
          {[
            { label: "Rental", checked: isRental },
            { label: "Purchase", checked: !isRental && !isInstalment },
            { label: "Purchase - Installment", checked: isInstalment },
          ].map(({ label, checked }) => (
            <View key={label} style={s.modeItem}>
              <View style={checked ? s.checkBoxChecked : s.checkBox}>
                {checked && <Text style={s.checkMark}>✓</Text>}
              </View>
              <Text style={s.modeLabel}>{label}</Text>
            </View>
          ))}
        </View>

        {/* ── Product Table ── */}
        {!isRental && (
          <View>
            {/* Header */}
            <View style={s.tableHeaderRow}>
              <View style={s.colImg} />
              <Text style={{ ...s.th, ...s.colProduct }}>Product Name</Text>
              <Text style={{ ...s.th, ...s.colRemarks }}>Remarks</Text>
              <Text style={{ ...s.th, ...s.colQty }}>Quantity</Text>
              <Text style={{ ...s.th, ...s.colUnitPrice }}>Unit Price ({"\n"}{currency})</Text>
              <Text style={{ ...s.th, ...s.colTotal }}>Total Price ({"\n"}{currency})</Text>
            </View>

            {/* Rows */}
            {validItems.map((item, i) => {
              const imgSrc = getProductImage(item.product_name)
              const itemTotal = item.unit_price * item.qty
              return (
                <View key={i} style={s.tableRow}>
                  <View style={s.colImg}>
                    {imgSrc ? <Image src={imgSrc} style={s.productImg} /> : null}
                  </View>
                  <Text style={{ ...s.tdBold, ...s.colProduct }}>{item.product_name}</Text>
                  <Text style={{ ...s.td, ...s.colRemarks }}>
                    {[item.custom_colour && item.colour_name ? `Colour: ${item.colour_name}` : "", item.logo_engraving ? "Logo/Engraving" : ""].filter(Boolean).join(", ")}
                  </Text>
                  <Text style={{ ...s.td, ...s.colQty }}>{item.qty}</Text>
                  <Text style={{ ...s.td, ...s.colUnitPrice }}>{item.unit_price.toLocaleString()}</Text>
                  <Text style={{ ...s.td, ...s.colTotal }}>{itemTotal.toLocaleString()}</Text>
                </View>
              )
            })}

            {/* Customisation rows */}
            {colourItems.map((item, i) => (
              <View key={`col-${i}`} style={s.customisationRow}>
                <View style={s.colImg} />
                <Text style={{ ...s.tdLeft, ...s.colProduct, fontSize: 7, color: "#555", fontFamily: "Helvetica-Oblique" }}>
                  {`  ↳ Colour customisation${item.colour_name ? ` (${item.colour_name})` : ""}`}
                </Text>
                <Text style={{ ...s.td, ...s.colRemarks }} />
                <Text style={{ ...s.td, ...s.colQty }}>{item.qty}</Text>
                <Text style={{ ...s.td, ...s.colUnitPrice }}>300</Text>
                <Text style={{ ...s.td, ...s.colTotal }}>{(300 * item.qty).toLocaleString()}</Text>
              </View>
            ))}
            {logoItems.map((item, i) => (
              <View key={`logo-${i}`} style={s.customisationRow}>
                <View style={s.colImg} />
                <Text style={{ ...s.colProduct, fontSize: 7, color: "#555", fontFamily: "Helvetica-Oblique" }}>
                  {`  ↳ UV Print Logo / Engraving`}
                </Text>
                <Text style={{ ...s.td, ...s.colRemarks }} />
                <Text style={{ ...s.td, ...s.colQty }}>{item.qty}</Text>
                <Text style={{ ...s.td, ...s.colUnitPrice }}>200</Text>
                <Text style={{ ...s.td, ...s.colTotal }}>{(200 * item.qty).toLocaleString()}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Rental table */}
        {isRental && (
          <View>
            <View style={s.tableHeaderRow}>
              <View style={s.colImg} />
              <Text style={{ ...s.th, ...s.colProduct }}>Product Name</Text>
              <Text style={{ ...s.th, ...s.colRemarks }}>Remarks</Text>
              <Text style={{ ...s.th, ...s.colQty }}>Qty</Text>
              <Text style={{ ...s.th, ...s.colUnitPrice }}>Unit Price ({currency})</Text>
              <Text style={{ ...s.th, width: 50 }}>/month</Text>
              <Text style={{ ...s.th, width: 64 }}>12 months</Text>
            </View>
            {validItems.map((item, i) => {
              const imgSrc = getProductImage(item.product_name)
              return (
                <View key={i} style={s.tableRow}>
                  <View style={s.colImg}>
                    {imgSrc ? <Image src={imgSrc} style={s.productImg} /> : null}
                  </View>
                  <Text style={{ ...s.tdBold, ...s.colProduct }}>{item.product_name}</Text>
                  <Text style={{ ...s.td, ...s.colRemarks }} />
                  <Text style={{ ...s.td, ...s.colQty }}>{item.qty}</Text>
                  <Text style={{ ...s.td, ...s.colUnitPrice }}>{item.unit_price.toLocaleString()}</Text>
                  <Text style={{ ...s.td, width: 50, textAlign: "right", paddingRight: 4 }}>{item.unit_price.toLocaleString()}</Text>
                  <Text style={{ ...s.td, width: 64, textAlign: "right", paddingRight: 4 }}>{(item.unit_price * 12).toLocaleString()}</Text>
                </View>
              )
            })}
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
                {activeDiscounts.map((d, i) => (
                  <View key={i} style={s.discountRow}>
                    <Text style={s.discountLabel}>(-) Discount ({d.label || "Discount"})</Text>
                    <Text style={s.discountValue}>-{d.amount.toLocaleString()}</Text>
                  </View>
                ))}
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
          <View style={s.footerBankBox}>
            <Text style={s.footerBankLine}>Pulse Pilates Sdn Bhd</Text>
            <Text style={s.footerBankLine}>Maybank 5140 1249 2051</Text>
          </View>
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

// ---------- POST handler ----------

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const buffer = await renderToBuffer(<QuotationDocument {...body} />)
    return new NextResponse(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${body.quotation_number ?? "quotation"}.pdf"`,
      },
    })
  } catch (err) {
    console.error("Quotation PDF error:", err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
