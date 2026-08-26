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
    url: "https://d3104be0-b60e-4e0f-a8dc-8d5677bee712.usrfiles.com/ugd/d3104b_bc6b713f1e564c15b735a5199da7bf10.pdf",
    out: "b2c-warranty-qr.png",
  },
  {
    name: "b2b",
    url: "https://d3104be0-b60e-4e0f-a8dc-8d5677bee712.usrfiles.com/ugd/d3104b_130c838bd48845c9b86c7164dd875674.pdf",
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
