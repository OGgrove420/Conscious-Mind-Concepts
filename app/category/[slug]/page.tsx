import { sb } from "@/lib/db";
import { ProductGrid } from "@/components/ProductGrid";

export const dynamic = "force-dynamic";

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { data: cat } = await sb().from("categories").select("*").eq("slug", slug).eq("active", true).maybeSingle();

  const { data: products } = await sb()
    .from("products")
    .select("id,sku,slug,title,subtitle,price_cents,sale_price_cents,status,format,cover_color")
    .eq("category_id", cat?.id ?? -1)
    .neq("status", "draft")
    .order("sort_order")
    .order("id");

  return (
    <section className="wrap section">
      <div className="section-head">
        <span className="eyebrow">Category</span>
        <h1>{cat?.name ?? "Not found"}</h1>
      </div>
      {cat?.description ? <p className="soft">{cat.description}</p> : null}
      {products && products.length > 0 ? (
        <ProductGrid products={products} />
      ) : (
        <p className="soft">Nothing in this category yet.</p>
      )}
    </section>
  );
}
