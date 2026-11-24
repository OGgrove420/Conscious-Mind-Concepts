import { cartDetails, discountApply } from "@/lib/cart";
import { zarCents } from "@/lib/format";
import CheckoutForm from "@/components/CheckoutForm";

export const dynamic = "force-dynamic";

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;
  const cart = await cartDetails();
  if (cart.items.length === 0) {
    return (
      <section className="wrap section">
        <div className="section-head">
          <span className="eyebrow">Step 2 of 2</span>
          <h1>Checkout</h1>
        </div>
        <p>Your cart is empty.</p>
        <a className="btn btn-primary" href="/">Browse the store</a>
      </section>
    );
  }

  let discount = 0;
  let codeUsed = (code ?? "").trim().toUpperCase();
  if (codeUsed && cart.subtotal > 0) {
    const res = await discountApply(codeUsed, cart.subtotal);
    if (res.ok) discount = res.discount;
    else codeUsed = "";
  }
  const total = cart.subtotal - discount;

  return (
    <section className="wrap section">
      <div className="section-head">
        <span className="eyebrow">Step 2 of 2</span>
        <h1>Checkout</h1>
      </div>
      {cart.missingFiles.length > 0 && (
        <div className="form-error">
          Not ready yet (final file still uploading): {cart.missingFiles.join(", ")}.
        </div>
      )}
      <CheckoutForm
        items={cart.items.map((it) => ({ title: it.product.title, unit: it.unit }))}
        subtotal={cart.subtotal}
        discount={discount}
        code={codeUsed}
        total={total}
        blocked={cart.missingFiles.length > 0}
      />
    </section>
  );
}

