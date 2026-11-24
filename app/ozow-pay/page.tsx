import Link from "next/link";
import { sb } from "@/lib/db";
import { ozowCheckoutFields } from "@/lib/ozow";
import { getSettings } from "@/lib/settings";
import { zarCents } from "@/lib/format";

export const dynamic = "force-dynamic";

/**
 * ozow handoff — renders an auto-submitting form the browser POSTs to Ozow.
 * Fields are computed server-side and signed here; the customer only forwards
 * them. Exact port of public/ozow_pay.php.
 */
export default async function OzowPayPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const { ref: rawRef } = await searchParams;
  const ref = (rawRef ?? "").trim();
  const { data: order } = await sb().from("orders").select("*").eq("ref", ref).maybeSingle();

  if (!order || order.status !== "PENDING") {
    return (
      <section className="wrap section">
        <h1 style={{ fontSize: 22 }}>Taking you to your order…</h1>
        <p className="soft">
          This payment page has already been used or does not exist.{" "}
          <Link href={`/order/${ref}`}>Check your order status</Link>.
        </p>
        <meta httpEquiv="refresh" content={`2;url=/order/${ref}`} />
      </section>
    );
  }

  const settings = await getSettings(["ozow_site_code", "ozow_test_mode"]);
  const fields = ozowCheckoutFields(
    {
      ref: order.ref as string,
      total_cents: order.total_cents as number,
      first_name: (order.first_name as string) ?? "",
      last_name: (order.last_name as string) ?? "",
      email: order.email as string,
    },
    {
      siteCode: settings.ozow_site_code ?? "",
      privateKey: process.env.OZOW_PRIVATE_KEY ?? "",
      isTest: settings.ozow_test_mode === "1",
    }
  );

  return (
    <section className="ozow-form-note">
      <div className="wrap">
        <div className="spinner" />
        <h1 style={{ fontSize: 22 }}>Taking you to Ozow&apos;s secure payment page…</h1>
        <p style={{ color: "var(--ink-soft)" }}>
          Order reference <b>{order.ref}</b> · amount <b>{zarCents(order.total_cents as number)}</b>
        </p>
        <noscript>
          <form method="post" action="https://pay.ozow.com">
            {Object.entries(fields).map(([k, v]) => (
              <input key={k} type="hidden" name={k} value={v} />
            ))}
            <button className="btn btn-primary" type="submit">Continue to payment</button>
          </form>
        </noscript>
        <form id="ozowForm" method="post" action="https://pay.ozow.com">
          {Object.entries(fields).map(([k, v]) => (
            <input key={k} type="hidden" name={k} value={v} />
          ))}
        </form>
        <p style={{ marginTop: 26 }}>
          <Link className="btn btn-ghost on-light btn-sm" href={`/order/${order.ref}`}>
            Payment not loading? Check your order status
          </Link>
        </p>
      </div>
      <script dangerouslySetInnerHTML={{ __html: "document.getElementById('ozowForm').submit();" }} />
    </section>
  );
}
