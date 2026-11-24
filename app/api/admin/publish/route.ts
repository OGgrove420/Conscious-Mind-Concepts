import { NextResponse } from "next/server";
import { sb } from "@/lib/db";
import { getAdmin } from "@/lib/session";

/**
 * publish toggle — publishing stays blocked without an uploaded file (same
 * rule as the PHP admin). Admin-only.
 */
export async function POST(req: Request) {
  if (!(await getAdmin())) return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  const { productId, status } = (await req.json().catch(() => ({}))) as {
    productId?: number;
    status?: string;
  };
  if (!productId) return NextResponse.json({ error: "bad product" }, { status: 400 });

  const { data: p } = await sb().from("products").select("id,file_path,status").eq("id", productId).maybeSingle();
  if (!p) return NextResponse.json({ error: "not found" }, { status: 404 });

  if (status === "published" && !p.file_path) {
    return NextResponse.json(
      { error: "Upload the PDF first — publishing stays blocked without a file." },
      { status: 400 }
    );
  }
  await sb().from("products").update({ status, updated_at: new Date().toISOString() }).eq("id", productId);
  return NextResponse.json({ ok: true });
}
