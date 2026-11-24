"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SetupAdminForm() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const router = useRouter();

  if (done) {
    return (
      <div className="panel form-note">
        Admin created. <a href="/admin/login" style={{ color: "#2563EB" }}>Sign in →</a>
      </div>
    );
  }

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        const fd = new FormData(e.currentTarget);
        const res = await fetch("/api/admin/setup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(Object.fromEntries(fd.entries())),
        });
        const body = await res.json().catch(() => ({}));
        if (res.ok) {
          setDone(true);
          router.refresh();
        } else {
          setError(body.error || "Setup failed.");
          setBusy(false);
        }
      }}
      className="panel"
    >
      <div className="field">
        <label htmlFor="s-name">Your name</label>
        <input id="s-name" name="name" required />
      </div>
      <div className="field">
        <label htmlFor="s-email">Admin email</label>
        <input id="s-email" name="email" type="email" required autoComplete="username" />
      </div>
      <div className="field">
        <label htmlFor="s-pass">Password (min 12 characters)</label>
        <input id="s-pass" name="password" type="password" minLength={12} required autoComplete="new-password" />
      </div>
      {error ? <div className="form-error">{error}</div> : null}
      <button className="btn btn-primary" type="submit" disabled={busy}>
        {busy ? "Creating…" : "Create admin"}
      </button>
    </form>
  );
}
