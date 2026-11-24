import Link from "next/link";
import { sb } from "@/lib/db";

export const dynamic = "force-dynamic";

const COPY = {
  success: {
    title: "Payment received — thank you",
    body: "Your payment was successful. Your secure download links were emailed to you just now, and they are always available in your library.",
  },
  cancel: {
    title: "Payment cancelled",
    body: "You cancelled the payment — nothing was charged. Your order is saved; you can resume it any time.",
  },
  error: {
    title: "Payment problem",
    body: "Ozow reported a problem with this payment. Nothing was charged. Please try again or contact us and we will help.",
  },
} as const;

export default async function PaymentResultPage({
  params,
  searchParams,
}: {
  params: Promise<{ result: string }>;
  searchParams: Promise<{ ref?: string }>;
}) {
  const { result } = await params;
  const { ref: rawRef } = await searchParams;
  const ref = (rawRef ?? "").trim().toUpperCase();
  const copy = COPY[result as keyof typeof COPY] ?? COPY.error;

  const { data: order } = ref
    ? await sb().from("orders").select("status,total_cents").eq("ref", ref).maybeSingle()
    : { data: null };

  // the redirect page never claims payment on its own — status comes from the DB
  const dbStatus = order?.status ? String(order.status) : null;
  const paid = dbStatus === "PAID";

  return (
    <section className="wrap section" style={{ maxWidth: 640 }}>
      <div className="section-head">
        <span className="eyebrow">Order {ref || "—"}</span>
        <h1>{paid ? COPY.success.title : copy.title}</h1>
      </div>
      <p>{paid ? COPY.success.body : copy.body}</p>
      {ref && dbStatus && !paid && dbStatus !== "PENDING" ? (
        <p className="soft">Order status on our side: {dbStatus}.</p>
      ) : null}
      <div style={{ display: "flex", gap: 12, marginTop: 18 }}>
        <Link className="btn btn-primary" href="/account">Open my library</Link>
        <Link className="btn btn-ghost" href={`/order?ref=${encodeURIComponent(ref)}`}>
          Check order status
        </Link>
      </div>
    </section>
  );
}
