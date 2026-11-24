import { NextResponse } from "next/server";
import { sb } from "@/lib/db";
import { getAdmin } from "@/lib/session";

/** attach/detach media to products — admin only. */
export async function POST(req: Request) {
  if (!(await getAdmin())) return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  const { mediaId, productIds } = (await req.json().catch(() => ({}))) as {
    mediaId?: number;
    productIds?: number[];
  };
  if (!mediaId || !Array.isArray(productIds)) {
    return NextResponse.json({ error: "mediaId and productIds required" }, { status: 400 });
  }

  const { data: media } = await sb().from("media").select("id").eq("id", mediaId).maybeSingle();
  if (!media) return NextResponse.json({ error: "media not found" }, { status: 404 });

  await sb().from("product_media").delete().eq("media_id", mediaId);
  const keep = productIds.filter((id) => Number.isFinite(id));
  if (keep.length) {
    await sb().from("product_media").insert(
      keep.map((pid, i) => ({ product_id: pid, media_id: mediaId, sort_order: i }))
    );
  }
  return NextResponse.json({ ok: true });
}
