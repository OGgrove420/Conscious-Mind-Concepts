"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** seed buttons — flagship 5 as coming_soon, 2 freebies published at R0. */
export default function SeedButtons() {
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState("");
  const router = useRouter();

  async function seed(which: "products" | "free") {
    setBusy(which);
    const res = await fetch("/api/admin/seed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ which }),
    });
    const body = await res.json().catch(() => ({}));
    setMsg(body.message || body.error || "Done.");
    setBusy("");
    router.refresh();
  }

  return (
    <div>
      <button className="btn btn-gold" type="button" disabled={busy !== ""} onClick={() => seed("products")}>
        {busy === "products" ? "Seeding…" : "Seed flagship products"}
      </button>
      <button
        className="btn btn-primary"
        type="button"
        disabled={busy !== ""}
        onClick={() => seed("free")}
        style={{ marginLeft: 10 }}
      >
        {busy === "free" ? "Seeding…" : "Seed the 2 free downloads (R0)"}
      </button>
      <p className="soft" style={{ fontSize: 12.5, marginTop: 10 }}>
        Freebies are created published at R0 — upload their PDFs on the product
        pages; until then buyers see &quot;file not available yet&quot;.
      </p>
      {msg ? <div className="form-note" style={{ marginTop: 8 }}>{msg}</div> : null}
    </div>
  );
}
