import Link from "next/link";
import { sb } from "@/lib/db";
import { ProductGrid } from "@/components/ProductGrid";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const [{ data: published }, { data: comingSoon }] = await Promise.all([
    sb().from("products").select("id,sku,slug,title,subtitle,price_cents,sale_price_cents,status,format,cover_color").eq("status", "published").order("sort_order").order("id"),
    sb().from("products").select("id,sku,slug,title,subtitle,price_cents,sale_price_cents,status,format,cover_color").eq("status", "coming_soon").order("sort_order").order("id"),
  ]);
  return (
    <section className="wrap section">
      <div className="section-head">
        <span className="eyebrow">All products</span>
        <h1>The store</h1>
      </div>
      {published && published.length > 0 ? (
        <ProductGrid products={published} />
      ) : (
        <p className="soft">Nothing published yet — check back soon.</p>
      )}
      {comingSoon && comingSoon.length > 0 && (
        <>
          <div className="section-head" style={{ marginTop: 40 }}>
            <span className="eyebrow">On the way</span>
            <h2>Coming soon</h2>
          </div>
          <ProductGrid products={comingSoon} />
        </>
      )}
      <p style={{ marginTop: 30 }}>
        <Link className="btn btn-ghost" href="/">← Back to the store front</Link>
      </p>
    </section>
  );
}
