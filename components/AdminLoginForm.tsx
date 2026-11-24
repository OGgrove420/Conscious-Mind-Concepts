"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginForm() {
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
        const res = await fetch("/api/admin/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(Object.fromEntries(fd.entries())),
        });
        const body = await res.json().catch(() => ({}));
        if (res.ok) {
          router.push("/admin");
          router.refresh();
        } else {
          setError(body.error || "Sign in failed.");
          setBusy(false);
        }
      }}
      className="panel"
    >
      <div className="field">
        <label htmlFor="a-email">Email</label>
        <input id="a-email" name="email" type="email" required autoComplete="username" />
      </div>
      <div className="field">
        <label htmlFor="a-pass">Password</label>
        <input id="a-pass" name="password" type="password" required autoComplete="current-password" />
      </div>
      {error ? <div className="form-error">{error}</div> : null}
      <button className="btn btn-primary" type="submit" disabled={busy}>
        {busy ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
