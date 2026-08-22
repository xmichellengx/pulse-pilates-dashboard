/**
 * Regenerate the warranty QR code PNGs embedded in invoices and receipts.
 *
 * Run this whenever a WARRANTY_URL changes (i.e. a new warranty version is
 * published). The QRs are baked to static PNGs rather than generated per
 * request because the target URLs are constants — this keeps `qrcode` a
 * devDependency and costs the PDF route nothing at runtime.
 *
 *   node scripts/generate-warranty-qr.js
 */
const QRCode = require("qrcode")
const path = require("path")

// Keep in sync with WARRANTY in src/app/api/invoices/pdf/route.tsx.
//
// VERSIONING: never delete or overwrite a warranty PDF that issued invoices
// still link to. An invoice's QR is a permanent pointer to the exact terms
// that governed that sale — publish a new version alongside the old one.
const TARGETS = [
  {
    name: "b2c",
    url: "https://pulse-pilates.vercel.app/warranty/b2c-limited-warranty-v3.0.pdf",
    out: "b2c-warranty-qr.png",
  },
  {
    name: "b2b",
    url: "https://pulse-pilates.vercel.app/warranty/b2b-limited-warranty-v1.0.pdf",
    out: "b2b-warranty-qr.png",
  },
]

const DIR = path.join(__dirname, "..", "public", "warranty")

Promise.all(
  TARGETS.map((t) =>
    QRCode.toFile(path.join(DIR, t.out), t.url, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 420,
      color: { dark: "#1a1a1aff", light: "#ffffffff" },
    }).then(() => console.log(`${t.name}: ${t.out}\n  -> ${t.url}`))
  )
).catch((err) => {
  console.error(err)
  process.exit(1)
})
