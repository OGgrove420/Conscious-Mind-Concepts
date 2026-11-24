/**
 * Automated digital delivery — port of fulfil_order(), bundle_children(),
 * issue_download_links() and the fulfilment email composer.
 * Idempotent: entitlements once per order (unique key), delivery once per
 * order (fulfilled_at gate), safe to call repeatedly.
 */
import crypto from "crypto";
import { sb } from "./db";
import { getSettings, settingBool } from "./settings";
import { sendFulfilmentEmail } from "./mail";
import { storeUrl } from "./env";

export interface OrderRow {
  id: number;
  ref: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  customer_id: number | null;
  total_cents: number;
  ozow_status_message: string | null;
  status: string;
  fulfilled_at: string | null;
}

/** Published product ids inside a bundle (bundle_skus CSV). Unpublished children skipped. */
export async function bundleChildren(productId: number): Promise<number[]> {
  const { data } = await sb().from("products").select("bundle_skus,is_bundle").eq("id", productId).maybeSingle();
  if (!data || !data.is_bundle || !(data.bundle_skus || "").trim()) return [];
  const skus = (data.bundle_skus as string).split(",").map((s) => s.trim()).filter(Boolean);
  if (!skus.length) return [];
  const { data: kids } = await sb().from("products").select("id,sku").in("sku", skus).eq("status", "published");
  if (!kids) return [];
  // dedupe, keep SKU order, then stable numeric order
  const bySku = new Map<string, number>();
  for (const k of kids) bySku.set(k.sku as string, k.id as number);
  const ids = [...new Set(skus.map((s) => bySku.get(s)).filter((v): v is number => v !== undefined))];
  return ids.sort((a, b) => a - b);
}

async function entitlementTitle(orderId: number, productId: number): Promise<string> {
  const { data: item } = await sb().from("order_items").select("title_snapshot")
    .eq("order_id", orderId).eq("product_id", productId).limit(1).maybeSingle();
  if (item?.title_snapshot) return item.title_snapshot as string;
  const { data: p } = await sb().from("products").select("title").eq("id", productId).maybeSingle();
  return (p?.title as string) || "Your product";
}

/**
 * fulfil_order(): only PAID orders ever fulfil; fulfilled_at is the gate.
 * 1. entitlements (bundles expand to published children)
 * 2. link customer account by email
 * 3. confirmation email with fresh expiring download links
 */
export async function fulfilOrder(orderId: number): Promise<void> {
  const sbe = sb();
  const { data: order } = await sbe.from("orders").select("*").eq("id", orderId).maybeSingle();
  if (!order || order.status !== "PAID") return;

  // lock: fulfilled_at is the idempotency gate for delivery itself
  const lock = await sbe.from("orders").update({ fulfilled_at: new Date().toISOString() })
    .eq("id", orderId).is("fulfilled_at", null).select("id");
  if (!lock.data || lock.data.length === 0) return; // already fulfilled

  const { data: items } = await sbe.from("order_items").select("*").eq("order_id", orderId);
  const cfg = await getSettings(["download_limit", "link_expiry_hours"]);
  const downloadLimit = Math.max(1, parseInt(cfg.download_limit || "5", 10) || 5);

  // 1. entitlements
  const created: Array<{ token: string; title: string; entitlementId: number }> = [];
  for (const item of items ?? []) {
    const pid = item.product_id as number | null;
    if (!pid) continue;
    const children = await bundleChildren(pid);
    const targets = [pid, ...children];
    for (const target of targets) {
      const token = crypto.randomBytes(24).toString("hex");
      const existing = await sbe.from("entitlements").select("id")
        .eq("order_id", orderId).eq("product_id", target).maybeSingle();
      if (existing.data) continue; // idempotent
      const ins = await sbe.from("entitlements").insert({
        order_id: orderId,
        product_id: target,
        email: order.email as string,
        token,
        download_limit: downloadLimit,
      }).select("id").single();
      if (ins.error) continue;
      created.push({
        token,
        title: await entitlementTitle(orderId, target),
        entitlementId: ins.data.id as number,
      });
    }
  }

  // 2. link customer account if the email matches one
  if (!order.customer_id) {
    const { data: cust } = await sbe.from("customers").select("id").eq("email", order.email as string).maybeSingle();
    if (cust) await sbe.from("orders").update({ customer_id: cust.id as number }).eq("id", orderId);
  }

  // 3. confirmation email with expiring secure download links
  await sendFulfilmentEmail(order as unknown as OrderRow, created);
}

/** Fresh expiring download links (72h default) for entitlement rows. */
export async function issueDownloadLinks(
  entitlements: Array<{ id: number; product_title?: string }>,
  hours = 72
): Promise<Array<{ title: string; url: string; expires: string }>> {
  const links = [];
  for (const ent of entitlements) {
    const token = crypto.randomBytes(24).toString("hex");
    const expiresAt = new Date(Date.now() + hours * 3600 * 1000).toISOString();
    await sb().from("entitlement_links").insert({
      entitlement_id: ent.id,
      token,
      expires_at: expiresAt,
      max_downloads: 3,
    });
    links.push({
      title: ent.product_title ?? "Your product",
      url: storeUrl(`/download/${token}`),
      expires: `${hours}h`,
    });
  }
  return links;
}

export { settingBool };
