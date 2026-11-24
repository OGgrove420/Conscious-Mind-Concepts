import Link from "next/link";
import { cartDetails } from "@/lib/cart";
import { zarCents } from "@/lib/format";
import RemoveButtons from "@/components/RemoveButtons";

export const dynamic = "force-dynamic";

export default async function CartPage({
  searchParams,
}: {
  searchParams: Promise<{ removed?: string }>;
}) {
  const { removed } = await searchParams;
  const cart = await cartDetails();
  return (
    <section className="wrap section">
      <div className="section-head">
        <span className="eyebrow">Step 1 of 2</span>
        <h1>Your cart</h1>
      </div>
      {removed ? <div className="form-note">{removed} removed from your cart.</div> : null}
      {cart.items.length === 0 ? (
        <>
          <p>Your cart is empty.</p>
          <Link className="btn btn-primary" href="/">Browse the store</Link>
        </>
      ) : (
        <>
          {cart.missingFiles.length > 0 && (
            <div className="form-error">
              Not ready yet (final file still uploading): {cart.missingFiles.join(", ")}. Remove
              them or wait — checkout stays blocked until every item is available.
            </div>
          )}
          <div className="cart-summary">
            {cart.items.map((it) => (
              <div className="row" key={it.product.id}>
                <span>{it.product.title}</span>
                <span>{zarCents(it.unit)}</span>
              </div>
            ))}
            <div className="row total">
              <span>Subtotal</span>
              <span>{zarCents(cart.subtotal)}</span>
            </div>
            <div style={{ marginTop: 14, display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Link
                className="btn btn-primary"
                href="/checkout"
                aria-disabled={cart.missingFiles.length > 0}
              >
                Continue to checkout
              </Link>
              <Link className="btn btn-ghost" href="/">Keep browsing</Link>
            </div>
          </div>
          <RemoveButtons ids={cart.items.map((it) => it.product.id)} />
        </>
      )}
    </section>
  );
}
