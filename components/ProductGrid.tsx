import { sb } from "@/lib/db";
import { zarCents, effectivePrice } from "@/lib/format";
import Link from "next/link";

export interface CardProduct {
  id: number;
  sku: string;
  slug: string;
  title: string;
  subtitle: string | null;
  price_cents: number;
  sale_price_cents: number | null;
  status: string;
  format: string;
  cover_color: string;
}

/** shared card renderer — parity with views/product_cards.php */
export function ProductCard({ p }: { p: CardProduct }) {
  const price = effectivePrice(p);
  const onSale = price !== p.price_cents;
  const comingSoon = p.status !== "published";
  const cover = (
    <>
      <div className={`pc-cover cover-${p.cover_color}`}>
        <span className="pc-sku">{p.sku}</span>
        <span className="pc-fmt">{p.format}</span>
      </div>
      <h3>{p.title}</h3>
      {p.subtitle ? <p className="pc-sub">{p.subtitle}</p> : null}
      <div className="pc-price">
        {onSale ? <s>{zarCents(p.price_cents)}</s> : null}
        <b>{zarCents(price)}</b>
      </div>
      {comingSoon ? (
        <span className="pc-badge">Coming Soon</span>
      ) : (
        <span className="pc-cta">View product →</span>
      )}
    </>
  );
  return comingSoon ? (
    <div className="card product-card coming-soon">{cover}</div>
  ) : (
    <Link className="card product-card" href={`/product/${p.slug}`}>
      {cover}
    </Link>
  );
}

export function ProductGrid({ products }: { products: CardProduct[] }) {
  return (
    <div className="product-grid">
      {products.map((p) => (
        <ProductCard key={p.id} p={p} />
      ))}
    </div>
  );
}

export async function getPublishedProducts(limit?: number) {
  let q = sb()
    .from("products")
    .select("id,sku,slug,title,subtitle,price_cents,sale_price_cents,status,format,cover_color,featured,bestseller_rank,is_new,sale_price_cents")
    .eq("status", "published")
    .order("sort_order")
    .order("id");
  if (limit) q = q.limit(limit);
  return q;
}

export async function getComingSoonProducts() {
  return sb()
    .from("products")
    .select("id,sku,slug,title,subtitle,price_cents,sale_price_cents,status,format,cover_color")
    .eq("status", "coming_soon")
    .order("sort_order")
    .order("id");
}

export { sb };
