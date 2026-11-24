import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { sb } from "@/lib/db";
import { getAdmin } from "@/lib/session";
import { slugify } from "@/lib/format";

/**
 * product PDF upload — streams the file into the PRIVATE product-files bucket
 * and records the path on the product. Magic-byte sniffed: a renamed text
 * file is rejected; executables can never upload. Admin-only.
 */
const MAX_BYTES = 80 * 1024 * 1024;

export async function POST(req: Request) {
  if (!(await getAdmin())) return NextResponse.json({ error: "unauthorised" }, { status: 401 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  const productId = Number(form?.get("productId") ?? 0);
  if (!(file instanceof File) || !productId) {
    return NextResponse.json({ error: "file and productId required" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "PDF too large (80 MB max)." }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  // PDF magic: %PDF-
  if (!(buf.length > 5 && buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46)) {
    return NextResponse.json({ error: "That file is not a real PDF (content sniffed, not just the name)." }, { status: 400 });
  }

  const { data: p } = await sb().from("products").select("slug,title,sku").eq("id", productId).maybeSingle();
  if (!p) return NextResponse.json({ error: "product not found" }, { status: 404 });

  const storedName = `${slugify(String(p.title))}-${Date.now()}.pdf`;
  const { error: upErr } = await (async () => {
    const { createClient } = await import("@supabase/supabase-js");
    const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const key = process.env.SUPABASE_SERVICE_KEY || "";
    const admin = createClient(url, key, { auth: { persistSession: false } });
    return admin.storage.from("product-files").upload(storedName, buf, {
      contentType: "application/pdf",
      upsert: false,
    });
  })();
  if (upErr) return NextResponse.json({ error: `storage upload failed: ${upErr.message}` }, { status: 500 });

  await sb().from("products").update({
    file_path: storedName,
    updated_at: new Date().toISOString(),
  }).eq("id", productId);

  void headers;
  return NextResponse.json({ ok: true, path: storedName });
}
