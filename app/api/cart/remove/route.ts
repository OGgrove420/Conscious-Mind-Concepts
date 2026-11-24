import { NextResponse } from "next/server";
import { cartRemove } from "@/lib/cart";
import { sb } from "@/lib/db";

export async function POST(req: Request) {
  const { productId } = (await req.json().catch(() => ({}))) as { productId?: number };
  if (!productId || !Number.isFinite(productId)) {
    return NextResponse.json({ error: "bad product" }, { status: 400 });
  }
  const { data: p } = await sb().from("products").select("title").eq("id", productId).maybeSingle();
  await cartRemove(productId);
  return NextResponse.json({ ok: true, title: p?.title ?? "Item" });
}
