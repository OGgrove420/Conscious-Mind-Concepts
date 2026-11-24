import Link from "next/link";
import { notFound } from "next/navigation";
import { sb } from "@/lib/db";
import { zarCents, effectivePrice } from "@/lib/format";
import AddToCart from "@/components/AddToCart";
import { ProductGrid } from "@/components/ProductGrid";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

export default async function ProductPage({ params }: Params) {
  const { slug } = await params;
  const { data: p } = await sb()
    .from("products")
    .select("*, categories(name,slug)")
    .eq("slug", slug)
    .not("status", "eq", "draft")
    .maybeSingle();
  if (!p) notFound();

  const price = effectivePrice(p);
  const onSale = price !== p.price_cents;
  const published = p.status === "published";
  const isFree = price === 0;

  let bundleKids: Array<{ id: number; sku: string; slug: string; title: string; subtitle: string | null; price_cents: number; sale_price_cents: number | null; status: string; format: string; cover_color: string }> = [];
  if (p.is_bundle && p.bundle_skus) {
    const skus = String(p.bundle_skus).split(",").map((s) => s.trim()).filter(Boolean);
    if (skus.length) {
      const { data } = await sb().from("products").select("id,sku,slug,title,subtitle,price_cents,sale_price_cents,status,format,cover_color").in("sku", skus).neq("status", "draft");
      bundleKids = data ?? [];
    }
  }

  const list = (label: string, text: string) =>
    text
      ? { label, items: text.split("\n").map((s) => s.trim()).filter(Boolean) }
      : null;
  const sections = [
    list("What is inside", p.includes || ""),
    list("Outcomes", p.outcomes || ""),
    list("Benefits", p.benefits || ""),
    list("Who it is for", p.audience || ""),
  ].filter(Boolean) as Array<{ label: string; items: string[] }>;

  return (
    <section className="wrap section">
      <p className="crumbs">
        <Link href="/">Store</Link> / {p.categories ? <Link href={`/category/${(p.categories as { slug: string }).slug}`}>{(p.categories as { name: string }).name}</Link> : "Products"} / {p.title}
      </p>
      <div className="product-layout">
        <div className={`pc-cover cover-lg cover-${p.cover_color}`}>
          <span className="pc-sku">{p.sku}</span>
          <span className="pc-fmt">{p.format}{p.pages ? ` · ${p.pages} pages` : ""}</span>
        </div>
        <div>
          {p.categories ? (
            <span className="eyebrow">{(p.categories as { name: string }).name}</span>
          ) : null}
          <h1 style={{ fontSize: "clamp(1.8rem,3vw,2.4rem)" }}>{p.title}</h1>
          {p.subtitle ? <p className="pc-sub-lg">{p.subtitle}</p> : null}
          <div className="pc-price-lg">
            {onSale ? <s>{zarCents(p.price_cents)}</s> : null}
            <b>{zarCents(price)}</b>
            {isFree && published ? <span className="pc-badge">Free</span> : null}
          </div>
          <p style={{ whiteSpace: "pre-line" }}>{p.description}</p>

          {published ? (
            p.file_path ? (
              <AddToCart productId={p.id} isFree={isFree} />
            ) : (
              <div className="form-note">
                {isFree
                  ? "The file for this free download is being uploaded — check back shortly."
                  : "Checkout opens as soon as the final file is uploaded."}
              </div>
            )
          ) : (
            <div className="pc-badge" style={{ fontSize: 14 }}>Coming Soon — not yet on sale</div>
          )}

          <p className="soft" style={{ fontSize: 13 }}>
            Secure instant EFT via Ozow · instant download links by email after payment.
          </p>
        </div>
      </div>

      {sections.map((s) => (
        <div key={s.label} style={{ marginTop: 30 }}>
          <h2 style={{ fontSize: 20 }}>{s.label}</h2>
          <ul className="check-list">
            {s.items.map((it) => (
              <li key={it}>{it}</li>
            ))}
          </ul>
        </div>
      ))}

      {bundleKids.length > 0 && (
        <div style={{ marginTop: 30 }}>
          <h2 style={{ fontSize: 20 }}>What is inside this bundle</h2>
          <ProductGrid products={bundleKids} />
        </div>
      )}
    </section>
  );
}
