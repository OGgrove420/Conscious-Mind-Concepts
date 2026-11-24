/**
 * Newsletter freebie auto-delivery — exact port of includes/newsletter.php (v1.3).
 * A signup instantly creates a free (R0) order for every published R0 product
 * whose file is uploaded, fulfils it through the normal pipeline and emails the
 * same expiring secure links a buyer gets. No gateway transaction is ever
 * invented; the audit trail says exactly what happened.
 */
import { sb } from "./db";
import { fulfilOrder } from "./fulfil";

export const NEWSLETTER_MARKER = "Newsletter freebie — no payment required";

export type NewsletterStatus = "delivered" | "already" | "nothing_ready" | "invalid";

/** Published R0 products with a file uploaded — the deliverable freebie set. */
export async function newsletterFreebieProducts() {
  return sb().from("products")
    .select("id,sku,slug,title")
    .eq("status", "published")
    .eq("price_cents", 0)
    .neq("file_path", "")
    .order("sort_order").order("id");
}

async function newsletterDelivered(email: string): Promise<boolean> {
  const { count } = await sb().from("orders")
    .select("id", { count: "exact", head: true })
    .eq("email", email.toLowerCase().trim())
    .eq("ozow_status_message", NEWSLETTER_MARKER);
  return (count ?? 0) > 0;
}

/**
 * Deliver the freebies to one email. Idempotent: a repeat signup is a no-op,
 * nothing is sent while no freebie file exists.
 */
export async function newsletterDeliver(rawEmail: string, ip = ""): Promise<{ status: NewsletterStatus; ref?: string; items?: number }> {
  const email = rawEmail.toLowerCase().trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { status: "invalid" };
  if (await newsletterDelivered(email)) return { status: "already" };

  const { data: products } = await newsletterFreebieProducts();
  if (!products || products.length === 0) return { status: "nothing_ready" };

  const ref = "CMC-" + new Date().toISOString().slice(0, 10).replace(/-/g, "") + "-" + Math.random().toString(36).slice(2, 8).toUpperCase();
  const ins = await sb().from("orders").insert({
    ref,
    email,
    subtotal_cents: 0,
    discount_cents: 0,
    total_cents: 0,
    status: "PAID",
    ozow_status_message: NEWSLETTER_MARKER,
    paid_at: new Date().toISOString(),
    test_mode: false,
    ip,
  }).select("id").single();
  if (ins.error) throw ins.error;
  const orderId = ins.data.id as number;

  await sb().from("order_items").insert(
    products.map((p) => ({
      order_id: orderId,
      product_id: p.id as number,
      title_snapshot: p.title as string,
      sku_snapshot: p.sku as string,
      unit_cents: 0,
      qty: 1,
    }))
  );

  await fulfilOrder(orderId);
  return { status: "delivered", ref, items: products.length };
}

/** Subscribers for the admin page: email, joined, freebie delivered? */
export async function newsletterSubscribers() {
  const { data } = await sb().from("newsletter").select("*").order("id", { ascending: false });
  return data ?? [];
}

/** Deliver to every subscriber that has not received the freebies yet. */
export async function newsletterPendingDeliver(): Promise<number> {
  const { data } = await sb().from("newsletter").select("email").order("id");
  let made = 0;
  for (const row of data ?? []) {
    const res = await newsletterDeliver(row.email as string);
    if (res.status === "delivered") made++;
  }
  return made;
}
