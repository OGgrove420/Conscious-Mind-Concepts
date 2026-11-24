/**
 * Cart — PHP built it in the session; on Vercel a cookie is the session.
 * Cookie cmc_cart holds product ids (JSON). The server re-prices everything
 * from the DB at every read: the browser never sends an amount.
 */
import { cookies } from "next/headers";

const COOKIE = "cmc_cart";

export async function cartGet(): Promise<number[]> {
  const store = await cookies();
  const raw = store.get(COOKIE)?.value;
  if (!raw) return [];
  try {
    const parsed = JSON.parse(decodeURIComponent(raw));
    return Array.isArray(parsed) ? parsed.map(Number).filter(Number.isFinite) : [];
  } catch {
    return [];
  }
}

export async function cartSet(ids: number[]): Promise<void> {
  const store = await cookies();
  store.set(COOKIE, encodeURIComponent(JSON.stringify(ids)), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function cartAdd(productId: number): Promise<void> {
  const ids = await cartGet();
  if (!ids.includes(productId)) ids.push(productId);
  await cartSet(ids);
}

export async function cartRemove(productId: number): Promise<void> {
  await cartSet((await cartGet()).filter((id) => id !== productId));
}

export async function cartClear(): Promise<void> {
  const store = await cookies();
  store.set(COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
}

export interface CartLine {
  product: { id: number; sku: string; slug: string; title: string; price_cents: number; sale_price_cents: number | null; file_path: string; status: string; format: string; cover_color: string };
  unit: number;
}

/**
 * cart_details() parity: fetch products for the cookie ids, price server-side.
 * Products without an uploaded file are flagged — checkout refuses them.
 */
export async function cartDetails(): Promise<{ items: CartLine[]; subtotal: number; missingFiles: string[] }> {
  const ids = await cartGet();
  if (!ids.length) return { items: [], subtotal: 0, missingFiles: [] };
  const { data } = await sbSelect(ids);
  const items: CartLine[] = [];
  const missingFiles: string[] = [];
  for (const id of ids) {
    const p = (data ?? []).find((row) => row.id === id);
    if (!p) continue;
    if (p.status !== "published" || !p.file_path) missingFiles.push(p.title as string);
    items.push({
      product: p as CartLine["product"],
      unit: p.sale_price_cents ?? p.price_cents,
    });
  }
  const subtotal = items.reduce((sum, it) => sum + it.unit, 0);
  return { items, subtotal, missingFiles };
}

async function sbSelect(ids: number[]) {
  const { sb } = await import("@/lib/db");
  return sb()
    .from("products")
    .select("id,sku,slug,title,price_cents,sale_price_cents,file_path,status,format,cover_color")
    .in("id", ids);
}

/**
 * discount_apply() parity — validate the code against the DB and compute the
 * discount from the subtotal. No client input reaches the amount.
 */
export async function discountApply(
  code: string,
  subtotal: number
): Promise<{ ok: boolean; discount: number; reason?: string }> {
  const clean = code.trim().toUpperCase();
  if (!clean || subtotal <= 0) return { ok: false, discount: 0, reason: "invalid" };
  const { sb } = await import("@/lib/db");
  const { data: dc } = await sb().from("discount_codes").select("*").eq("code", clean).maybeSingle();
  if (!dc || !dc.active) return { ok: false, discount: 0, reason: "not found" };
  const now = new Date();
  if (dc.starts_at && new Date(dc.starts_at) > now) return { ok: false, discount: 0, reason: "not started" };
  if (dc.ends_at && new Date(dc.ends_at) < now) return { ok: false, discount: 0, reason: "expired" };
  if (dc.max_uses !== null && (dc.used ?? 0) >= dc.max_uses) return { ok: false, discount: 0, reason: "used up" };
  if (subtotal < (dc.min_subtotal_cents ?? 0)) return { ok: false, discount: 0, reason: "minimum not met" };
  let discount =
    dc.type === "percent"
      ? Math.round((subtotal * Math.min(100, Math.max(0, dc.value))) / 100)
      : Math.min(subtotal, dc.value);
  return { ok: true, discount };
}

/** order_ref_make() parity: CMC-YYYYMMDD-XXXXXX */
export function orderRefMake(): string {
  const day = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  let ref = "";
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  for (let i = 0; i < 6; i++) ref += chars[Math.floor(Math.random() * chars.length)];
  return `CMC-${day}-${ref}`;
}
