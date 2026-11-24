import Link from "next/link";
import { sb } from "@/lib/db";
import { zarCents, fmtDateTime } from "@/lib/format";
import { getCustomer } from "@/lib/session";

export const dynamic = "force-dynamic";

const TONE: Record<string, string> = {
  PAID: "#067647",
  PENDING: "#B45309",
  PROCESSING: "#B45309",
  FAILED: "#B42318",
  CANCELLED: "#667085",
  REFUNDED: "#667085",
};

/** honest status line — copy mirrors the PHP order_status page */
function statusLine(status: string, ozowMsg: string | null): string {
  if (status === "PAID") {
    if (ozowMsg === "Free product — no payment required" || ozowMsg === "Newsletter freebie — no payment required") {
      return "Confirmed — your downloads are ready below and were emailed to you.";
    }
    return "Payment confirmed — your downloads are ready below and were emailed to you.";
  }
  if (status === "PENDING") return "Waiting for payment. If you have just paid, refresh in a few seconds — Ozow confirms instantly.";
  if (status === "PROCESSING") return "Still processing. Ozow has not confirmed this payment yet — check again shortly or contact us if it stays stuck.";
  if (status === "CANCELLED") return "Payment was cancelled. Nothing was charged — you can start a new checkout any time.";
  if (status === "FAILED") return "The payment did not go through. Nothing was charged — you can start a new checkout any time.";
  return "Contact us if this status looks wrong.";
}

export default async function OrderStatusPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string; email?: string }>;
}) {
  const { ref, email } = await searchParams;
  const cleanRef = (ref ?? "").trim().toUpperCase();
  const cleanEmail = (email ?? "").trim().toLowerCase();

  const order = cleanRef
    ? (await sb().from("orders").select("*").eq("ref", cleanRef).maybeSingle()).data
    : null;

  // guest lookup allowed only when enabled AND the email matches the order
  let authorised = false;
  if (order) {
    const cust = await getCustomer();
    if (cust && order.customer_id === cust.id) authorised = true;
    else if (cleanEmail && String(order.email).toLowerCase() === cleanEmail) {
      const { data: setting } = await sb().from("settings").select("value").eq("key", "allow_guest_lookup").maybeSingle();
      if ((setting?.value ?? "1") === "1") authorised = true;
    }
  }

  return (
    <section className="wrap section">
      <div className="section-head">
        <span className="eyebrow">Order status</span>
        <h1>Check your order</h1>
      </div>

      {!cleanRef ? (
        <form method="get" action="/order" className="panel" style={{ maxWidth: 480 }}>
          <div className="field">
            <label htmlFor="ref">Order reference</label>
            <input id="ref" name="ref" placeholder="CMC-20260101-ABC123" required />
          </div>
          <div className="field">
            <label htmlFor="email">Email used at checkout</label>
            <input id="email" type="email" name="email" required />
          </div>
          <button className="btn btn-primary" type="submit">Find my order</button>
        </form>
      ) : !order ? (
        <p className="form-error">No order found with reference {cleanRef}. Check the reference and try again.</p>
      ) : !authorised ? (
        <p className="soft">For security, confirm the email used at checkout to view this order.</p>
      ) : (
        <div className="panel">
          <div className="row">
            <span>Order</span>
            <span>{order.ref}</span>
          </div>
          <div className="row">
            <span>Status</span>
            <span style={{ color: TONE[String(order.status)] ?? "#0F172A", fontWeight: 600 }}>{String(order.status)}</span>
          </div>
          <div className="row">
            <span>Total</span>
            <span>{zarCents(order.total_cents as number)}</span>
          </div>
          <div className="row">
            <span>Placed</span>
            <span>{fmtDateTime(order.created_at as string)}</span>
          </div>
          <p style={{ marginTop: 12 }}>{statusLine(String(order.status), order.ozow_status_message as string)}</p>
          {order.status === "PENDING" && (order.total_cents as number) > 0 ? (
            <Link className="btn btn-primary" href={`/ozow-pay?ref=${order.ref}`}>
              Resume payment
            </Link>
          ) : null}
          {order.status === "PAID" ? (
            <p className="soft" style={{ marginTop: 10 }}>
              Fresh download links: open <Link href="/account">your library</Link> (account) or
              request them by email from this page once logged-out lookup reaches the download step.
            </p>
          ) : null}
        </div>
      )}
    </section>
  );
}
