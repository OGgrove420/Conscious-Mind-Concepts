import { sb } from "@/lib/db";
import { getCustomer } from "@/lib/session";
import Link from "next/link";

export const dynamic = "force-dynamic";

/** account library — entitlements for the signed-in customer. */
export default async function AccountPage() {
  const cust = await getCustomer();
  if (!cust) {
    return (
      <section className="wrap section">
        <div className="section-head">
          <span className="eyebrow">My library</span>
          <h1>Sign in to see your purchases</h1>
        </div>
        <p className="soft">Your purchases live here. Sign in, or use order lookup with your reference and email.</p>
        <div style={{ display: "flex", gap: 12 }}>
          <Link className="btn btn-primary" href="/login">Sign in</Link>
          <Link className="btn btn-ghost" href="/order">Order lookup</Link>
        </div>
      </section>
    );
  }

  const { data: ents } = await sb()
    .from("entitlements")
    .select("*, products(title,slug,format,cover_color)")
    .eq("email", cust.email)
    .order("id", { ascending: false });

  return (
    <section className="wrap section">
      <div className="section-head">
        <span className="eyebrow">{cust.email}</span>
        <h1>My library</h1>
      </div>
      {!ents || ents.length === 0 ? (
        <p className="soft">Nothing here yet — your purchases appear after checkout.</p>
      ) : (
        <div className="product-grid">
          {ents.map((e) => (
            <div className="card product-card" key={e.id}>
              <div className={`pc-cover cover-${(e.products as { cover_color?: string })?.cover_color ?? "blue"}`}>
                <span className="pc-fmt">{(e.products as { format?: string })?.format ?? "PDF"}</span>
              </div>
              <h3>{(e.products as { title?: string })?.title ?? "Your product"}</h3>
              <p className="soft" style={{ fontSize: 13 }}>
                {e.downloads_used as number} / {e.download_limit as number} downloads used
              </p>
              <Link className="btn btn-ghost btn-sm" href={`/api/download/link?ent=${e.id}`}>
                Get fresh secure link
              </Link>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
