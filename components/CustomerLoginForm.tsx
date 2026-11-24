"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CustomerLoginForm() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        const fd = new FormData(e.currentTarget);
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(Object.fromEntries(fd.entries())),
        });
        const body = await res.json().catch(() => ({}));
        if (res.ok) {
          router.push("/account");
          router.refresh();
        } else {
          setError(body.error || "Sign in failed.");
          setBusy(false);
        }
      }}
      className="panel"
    >
      <div className="field">
        <label htmlFor="c-email">Email</label>
        <input id="c-email" name="email" type="email" required autoComplete="username" />
      </div>
      <div className="field">
        <label htmlFor="c-pass">Password</label>
        <input id="c-pass" name="password" type="password" required autoComplete="current-password" />
      </div>
      {error ? <div className="form-error">{error}</div> : null}
      <button className="btn btn-primary" type="submit" disabled={busy}>
        {busy ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
