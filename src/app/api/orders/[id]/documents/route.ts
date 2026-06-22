import { createClient as createServiceClient } from "@supabase/supabase-js"
import { requireUser } from "@/lib/api/auth"

const supabase = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const BUCKET = "rental-documents"

// Doc type → orders column holding the storage path.
const DOC_COLUMN: Record<string, "payex_proof_url" | "customer_id_url" | "leasing_contract_url"> = {
  payex_proof: "payex_proof_url",
  customer_id: "customer_id_url",
  leasing_contract: "leasing_contract_url",
}

const MAX_BYTES = 10 * 1024 * 1024
const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "application/pdf",
])

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser()
  if (!auth.ok) return auth.response

  const { id: orderId } = await params
  if (!orderId) return Response.json({ error: "order id required" }, { status: 400 })

  const form = await req.formData()
  const type = String(form.get("type") ?? "")
  const file = form.get("file")
  const column = DOC_COLUMN[type]
  if (!column) return Response.json({ error: "invalid doc type" }, { status: 400 })
  if (!(file instanceof File)) return Response.json({ error: "file required" }, { status: 400 })
  if (file.size === 0) return Response.json({ error: "empty file" }, { status: 400 })
  if (file.size > MAX_BYTES) return Response.json({ error: "file too large (max 10MB)" }, { status: 413 })
  if (!ALLOWED_MIME.has(file.type)) {
    return Response.json({ error: `unsupported file type: ${file.type}` }, { status: 415 })
  }

  const ext = (file.name.split(".").pop() ?? "bin").toLowerCase().replace(/[^a-z0-9]/g, "")
  const safeExt = ext.length > 0 && ext.length <= 8 ? ext : "bin"
  const path = `${orderId}/${type}-${Date.now()}.${safeExt}`

  const buffer = Buffer.from(await file.arrayBuffer())
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType: file.type, upsert: false })
  if (uploadError) {
    return Response.json({ error: `upload failed: ${uploadError.message}` }, { status: 500 })
  }

  // Remove the previous file for this doc type so we don't accumulate orphans.
  const { data: existing } = await supabase
    .from("orders")
    .select(column)
    .eq("id", orderId)
    .single()
  // @ts-expect-error dynamic column index
  const prevPath: string | null = existing?.[column] ?? null
  if (prevPath && prevPath !== path) {
    await supabase.storage.from(BUCKET).remove([prevPath])
  }

  const { error: updateError } = await supabase
    .from("orders")
    .update({ [column]: path })
    .eq("id", orderId)
  if (updateError) {
    await supabase.storage.from(BUCKET).remove([path])
    return Response.json({ error: updateError.message }, { status: 500 })
  }

  return Response.json({ path, type })
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser()
  if (!auth.ok) return auth.response

  const { id: orderId } = await params
  const url = new URL(req.url)
  const type = url.searchParams.get("type") ?? ""
  const column = DOC_COLUMN[type]
  if (!column) return Response.json({ error: "invalid doc type" }, { status: 400 })

  const { data: row } = await supabase
    .from("orders")
    .select(column)
    .eq("id", orderId)
    .single()
  // @ts-expect-error dynamic column index
  const path: string | null = row?.[column] ?? null

  if (path) {
    await supabase.storage.from(BUCKET).remove([path])
  }
  const { error } = await supabase
    .from("orders")
    .update({ [column]: null })
    .eq("id", orderId)
  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ ok: true })
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser()
  if (!auth.ok) return auth.response

  const { id: orderId } = await params
  const url = new URL(req.url)
  const type = url.searchParams.get("type") ?? ""
  const column = DOC_COLUMN[type]
  if (!column) return Response.json({ error: "invalid doc type" }, { status: 400 })

  const { data: row, error: rowError } = await supabase
    .from("orders")
    .select(column)
    .eq("id", orderId)
    .single()
  if (rowError || !row) return Response.json({ error: "order not found" }, { status: 404 })
  // @ts-expect-error dynamic column index
  const path: string | null = row[column] ?? null
  if (!path) return Response.json({ error: "no file" }, { status: 404 })

  const { data: signed, error: signError } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, 60)
  if (signError || !signed) {
    return Response.json({ error: "failed to sign url" }, { status: 500 })
  }
  return Response.json({ url: signed.signedUrl })
}
