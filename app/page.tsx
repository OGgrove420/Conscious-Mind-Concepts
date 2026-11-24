import Link from "next/link";
import { sb } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { ProductGrid } from "@/components/ProductGrid";
import { STORE_NAME } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  if (!process.env.SUPABASE_SERVICE_KEY) {
    return (
      <section className="wrap" style={{ padding: "60px 0" }}>
        <div className="section-head">
          <span className="eyebrow">Setup</span>
          <h1>{STORE_NAME}</h1>
        </div>
        <p className="setup-note">
          Supabase environment variables are not set yet. Once SUPABASE_URL and
          SUPABASE_SERVICE_KEY are added on Vercel, the catalogue, cart,
          checkout and admin come alive here.
        </p>
        <div className="cta-panel">
          <h2>Knowledge That Empowers. Tools That Transform.</h2>
          <p>
            Practical digital workbooks, toolkits and guides by Conscious Mind
            Concepts. Instant download after payment.
          </p>
        </div>
      </section>
    );
  }

  const [{ data: published }, { data: comingSoon }, { data: faqs }, settings] = await Promise.all([
    sb().from("products").select("id,sku,slug,title,subtitle,price_cents,sale_price_cents,status,format,cover_color,featured,bestseller_rank,is_new").eq("status", "published").order("sort_order").order("id"),
    sb().from("products").select("id,sku,slug,title,subtitle,price_cents,sale_price_cents,status,format,cover_color").eq("status", "coming_soon").order("sort_order").order("id"),
    sb().from("faqs").select("question,answer").eq("active", true).order("sort_order"),
    getSettings(["cta_title", "cta_text", "cta_button"]),
  ]);

  const hero = published?.find((p) => p.featured) ?? null;
  const rest = (published ?? []).filter((p) => p !== hero);

  return (
    <>
      <section className="hero">
        <div className="wrap hero-grid">
          <div className="hero-copy">
            <span className="eyebrow">Conscious Mind Concepts</span>
            <h1>Knowledge That Empowers. Tools That Transform.</h1>
            <p>
              Practical digital workbooks, toolkits and guides — master your
              mindset, master your life. Instant download after payment.
            </p>
            <div className="hero-cta">
              <Link className="btn btn-primary btn-lg" href="#products">
                {settings.cta_button || "Browse the store"}
              </Link>
              <Link className="btn btn-ghost btn-lg" href="/order">
                Find my order
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section id="products" className="wrap section">
        <div className="section-head">
          <span className="eyebrow">Available now</span>
          <h2>The store</h2>
        </div>
        {rest.length ? (
          <ProductGrid products={rest} />
        ) : (
          <p className="soft">Products appear here once they are published in the admin dashboard.</p>
        )}
      </section>

      {comingSoon && comingSoon.length > 0 && (
        <section className="wrap section">
          <div className="section-head">
            <span className="eyebrow">On the way</span>
            <h2>Coming soon</h2>
          </div>
          <ProductGrid products={comingSoon} />
        </section>
      )}

      <section className="wrap section">
        <div className="section-head">
          <span className="eyebrow">Newsletter</span>
          <h2>Free resources, straight to your inbox</h2>
        </div>
        <NewsletterForm />
        <p className="soft" style={{ marginTop: 10 }}>
          Free downloads attach to the newsletter automatically once their PDFs are uploaded in admin.
        </p>
      </section>

      <section className="wrap section">
        <div className="section-head">
          <span className="eyebrow">Questions</span>
          <h2>Frequently asked</h2>
        </div>
        <div className="faq-list">
          {(faqs ?? []).map((f) => (
            <details key={f.question} className="faq-item">
              <summary>{f.question}</summary>
              <p>{f.answer}</p>
            </details>
          ))}
        </div>
      </section>
    </>
  );
}

function NewsletterForm() {
  return (
    <form action="/api/newsletter" method="post" className="newsletter-form">
      <input type="email" name="email" required placeholder="you@example.com" aria-label="Email address" />
      <button className="btn btn-primary" type="submit">Sign up free</button>
    </form>
  );
}
