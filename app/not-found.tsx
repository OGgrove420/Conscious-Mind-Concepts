import Link from "next/link";

export default function NotFound() {
  return (
    <section className="wrap section" style={{ maxWidth: 560 }}>
      <div className="section-head">
        <span className="eyebrow">404</span>
        <h1>Page not found</h1>
      </div>
      <p className="soft">That page does not exist (or the product is no longer listed).</p>
      <Link className="btn btn-primary" href="/">Back to the store</Link>
    </section>
  );
}
