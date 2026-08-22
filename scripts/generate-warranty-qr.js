/**
 * Regenerate the warranty QR code PNG that gets embedded in B2C invoices
 * and receipts.
 *
 * Run this whenever WARRANTY_URL changes (i.e. a new warranty version is
 * published). The QR is baked to a static PNG rather than generated per
 * request because the target URL is a constant — this keeps `qrcode` a
 * devDependency and costs the PDF route nothing at runtime.
 *
 *   node scripts/generate-warranty-qr.js
 */
const QRCode = require("qrcode")
const path = require("path")

// Keep in sync with WARRANTY_URL in src/app/api/invoices/pdf/route.tsx
const WARRANTY_URL =
  "https://pulse-pilates.vercel.app/warranty/b2c-limited-warranty-v2.0.pdf"

const OUT = path.join(__dirname, "..", "public", "warranty", "b2c-warranty-qr.png")

QRCode.toFile(OUT, WARRANTY_URL, {
  errorCorrectionLevel: "M",
  margin: 1,
  width: 420,
  color: { dark: "#1a1a1aff", light: "#ffffffff" },
})
  .then(() => console.log(`QR written to ${OUT}\n  -> ${WARRANTY_URL}`))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
