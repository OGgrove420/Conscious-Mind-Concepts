import { NextResponse } from "next/server";
import { cartAdd } from "@/lib/cart";
import { sb } from "@/lib/db";

export async function POST(req: Request) {
  const { productId } = (await req.json().catch(() => ({}))) as { productId?: number };
  if (!productId || !Number.isFinite(productId)) {
    return NextResponse.json({ error: "bad product" }, { status: 400 });
  }
  const { data: p } = await sb().from("products").select("id,status,file_path,price_cents,sale_price_cents")
    .eq("id", productId).eq("status", "published").maybeSingle();
  if (!p) return NextResponse.json({ error: "not available" }, { status: 404 });
  await cartAdd(productId);
  return NextResponse.json({ ok: true });
}
