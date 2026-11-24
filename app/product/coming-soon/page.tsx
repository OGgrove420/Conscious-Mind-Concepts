import Link from "next/link";

export const metadata = { title: "Coming soon — CMC Growth Store" };

export default function ComingSoonPage() {
  return (
    <section className="wrap section" style={{ maxWidth: 640 }}>
      <div className="section-head">
        <span className="eyebrow">On the way</span>
        <h1>This product is coming soon</h1>
      </div>
      <p className="soft">
        It is in the workshop — it appears here the moment it is published. Join
        the newsletter on the home page and you will hear about it first.
      </p>
      <Link className="btn btn-primary" href="/">Back to the store</Link>
    </section>
  );
}
