import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { cartDetails, discountApply, cartClear, orderRefMake } from "@/lib/cart";
import { sb } from "@/lib/db";
import { getSetting } from "@/lib/settings";
import { getCustomer } from "@/lib/session";
import { fulfilOrder } from "@/lib/fulfil";
import { hashPassword } from "@/lib/password";

/**
 * checkout — creates the order server-side, then hands the browser the Ozow
 * redirect URL. Amounts are recalculated here from the DB; nothing arrives
 * from the browser. Exact port of public/checkout.php.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Record<string, string>;
  const cart = await cartDetails();
  if (!cart.items.length) return NextResponse.json({ error: "Your cart is empty." }, { status: 400 });
  if (cart.missingFiles.length) {
    return NextResponse.json(
      { error: `Still uploading: ${cart.missingFiles.join(", ")}.` },
      { status: 400 }
    );
  }

  // discount from cookie-style code param, revalidated server-side
  const code = (body.code ?? "").trim().toUpperCase();
  let discount = 0;
  let codeUsed = "";
  if (code && cart.subtotal > 0) {
    const res = await discountApply(code, cart.subtotal);
    if (res.ok) {
      discount = res.discount;
      codeUsed = code;
    }
  }
  const total = cart.subtotal - discount;

  const first = (body.first_name ?? "").trim();
  const last = (body.last_name ?? "").trim();
  const email = (body.email ?? "").trim().toLowerCase();
  const phone = (body.phone ?? "").trim();
  const wantAccount = body.create_account === "1" || body.create_account === "true";
  const password = body.password ?? "";

  if (!first || !last) return NextResponse.json({ error: "Please enter your first name and surname." }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Please enter a valid email address — your downloads are emailed here." }, { status: 400 });
  }
  if (wantAccount && password.length < 8) {
    return NextResponse.json({ error: 'Choose a password of at least 8 characters, or untick "create an account".' }, { status: 400 });
  }

  const cust = await getCustomer();
  let customerId = cust?.id ?? null;
  const { data: existing } = await sb().from("customers").select("id").eq("email", email).maybeSingle();

  if (wantAccount && !cust) {
    if (existing) {
      customerId = existing.id as number; // attach, don't error
    } else {
      const ins = await sb().from("customers").insert({
        email,
        password_hash: hashPassword(password),
        first_name: first,
        last_name: last,
        phone,
      }).select("id").single();
      if (ins.error) return NextResponse.json({ error: "Could not create the account." }, { status: 500 });
      customerId = ins.data.id as number;
      const { startSession } = await import("@/lib/session");
      await startSession({ role: "customer", id: customerId, email });
    }
  } else if (!customerId && existing) {
    customerId = existing.id as number;
  }

  const hdrs = await headers();
  const ip = (hdrs.get("x-forwarded-for") ?? "").split(",")[0].trim() || (hdrs.get("x-real-ip") ?? "");
  const ref = orderRefMake();
  const testMode = (await getSetting("ozow_test_mode", "1")) === "1";

  const insOrder = await sb().from("orders").insert({
    ref,
    customer_id: customerId,
    email,
    first_name: first,
    last_name: last,
    phone,
    subtotal_cents: cart.subtotal,
    discount_cents: discount,
    total_cents: total,
    discount_code: codeUsed,
    status: "PENDING",
    test_mode: testMode,
    ip,
  }).select("id").single();
  if (insOrder.error || !insOrder.data) {
    return NextResponse.json({ error: "Could not create the order." }, { status: 500 });
  }
  const orderId = insOrder.data.id as number;

  await sb().from("order_items").insert(
    cart.items.map((it) => ({
      order_id: orderId,
      product_id: it.product.id,
      title_snapshot: it.product.title,
      sku_snapshot: it.product.sku,
      unit_cents: it.unit,
      qty: 1,
    }))
  );

  // bump code usage
  if (codeUsed) {
    const { data: dc } = await sb().from("discount_codes").select("used").eq("code", codeUsed).maybeSingle();
    if (dc) await sb().from("discount_codes").update({ used: (dc.used ?? 0) + 1 }).eq("code", codeUsed);
  }

  await cartClear();

  // R0 order (free products only): complete it in-store. No gateway
  // transaction is invented — the audit trail records exactly what happened.
  if (total === 0) {
    await sb().from("orders").update({
      status: "PAID",
      ozow_status_message: "Free product — no payment required",
      paid_at: new Date().toISOString(),
      test_mode: false,
    }).eq("id", orderId).eq("status", "PENDING");
    await fulfilOrder(orderId);
    return NextResponse.json({ redirect: `/payment/success?ref=${ref}` });
  }

  return NextResponse.json({ redirect: `/ozow-pay?ref=${ref}` });
}
