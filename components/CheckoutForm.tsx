"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zarCents } from "@/lib/format";
import { mainUrl } from "@/lib/env";

interface Props {
  items: Array<{ title: string; unit: number }>;
  subtotal: number;
  discount: number;
  code: string;
  total: number;
  blocked: boolean;
}

export default function CheckoutForm({ items, subtotal, discount, code, total, blocked }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [codeInput, setCodeInput] = useState(code);
  const [wantAccount, setWantAccount] = useState(false);
  const router = useRouter();

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(fd.entries())),
    });
    const body = await res.json().catch(() => ({}));
    if (res.ok && body.redirect) {
      router.push(body.redirect);
    } else {
      setError(body.error || "Checkout failed — please check your details and try again.");
      setBusy(false);
    }
  }

  function applyCode(e: React.FormEvent) {
    e.preventDefault();
    if (codeInput.trim()) router.push(`/checkout?code=${encodeURIComponent(codeInput.trim())}`);
  }

  return (
    <form onSubmit={submit}>
      <div className="checkout-grid">
        <div className="panel">
          <h2>Your details</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
            <div className="field">
              <label htmlFor="f-first">First name *</label>
              <input id="f-first" name="first_name" required />
            </div>
            <div className="field">
              <label htmlFor="f-last">Surname *</label>
              <input id="f-last" name="last_name" required />
            </div>
          </div>
          <div className="field">
            <label htmlFor="f-email">Email address *</label>
            <input id="f-email" type="email" name="email" required />
            <p style={{ fontSize: "12.5px", margin: "6px 0 0" }}>
              Your download links are sent to this address.
            </p>
          </div>
          <div className="field">
            <label htmlFor="f-phone">Contact number (optional)</label>
            <input id="f-phone" name="phone" />
          </div>
          <div className="field" style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid #E2E8F0" }}>
            <label style={{ fontWeight: 500, display: "flex", gap: 10, alignItems: "center" }}>
              <input
                type="checkbox"
                name="create_account"
                value="1"
                style={{ width: "auto" }}
                checked={wantAccount}
                onChange={(e) => setWantAccount(e.target.checked)}
              />
              Create an account (optional — saves your purchases in a library)
            </label>
            {wantAccount && (
              <div style={{ marginTop: 12 }}>
                <label htmlFor="f-pw">Choose a password (min 8 characters)</label>
                <input id="f-pw" type="password" name="password" minLength={8} />
              </div>
            )}
            <p style={{ fontSize: "12.5px", margin: "8px 0 0" }}>
              No account needed — guest checkout works fine and your links arrive by email.
            </p>
          </div>
          <p style={{ fontSize: "12.5px", color: "#52607A" }}>
            By continuing you agree to the{" "}
            <a href={mainUrl("/terms.html")} style={{ color: "#2563EB" }}>
              Terms &amp; Conditions
            </a>.
          </p>
          {error ? <div className="form-error">{error}</div> : null}
        </div>
        <div className="cart-summary">
          <h2 style={{ fontSize: 20 }}>Order summary</h2>
          {items.map((it) => (
            <div className="row" key={it.title}>
              <span>{it.title}</span>
              <span>{zarCents(it.unit)}</span>
            </div>
          ))}
          <div className="row">
            <span>Subtotal</span>
            <span>{zarCents(subtotal)}</span>
          </div>
          {discount > 0 ? (
            <div className="row">
              <span>Discount ({code})</span>
              <span style={{ color: "#067647" }}>-{zarCents(discount)}</span>
            </div>
          ) : (
            <form onSubmit={applyCode} style={{ display: "flex", gap: 8, margin: "10px 0" }}>
              <input
                name="code"
                placeholder="Discount code"
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value)}
                style={{ flex: 1 }}
              />
              <button className="btn btn-ghost btn-sm" type="submit">Apply</button>
            </form>
          )}
          <div className="row total">
            <span>Total</span>
            <span>{zarCents(total)}</span>
          </div>
          <button
            className="btn btn-primary"
            type="submit"
            disabled={busy || blocked}
            style={{ width: "100%", marginTop: 10 }}
          >
            {busy
              ? "Starting…"
              : total === 0
                ? "Get it free"
                : `Pay with Ozow — ${zarCents(total)}`}
          </button>
          <p style={{ fontSize: "12.5px", color: "#52607A", marginTop: 12 }}>
            Secure instant EFT. You will be redirected to Ozow&apos;s payment page. Cards and
            instant EFT supported.
          </p>
        </div>
      </div>
    </form>
  );
}
