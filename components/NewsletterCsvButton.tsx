"use client";

import { useState } from "react";

export default function NewsletterCsvButton() {
  const [busy, setBusy] = useState(false);
  return (
    <button
      className="btn btn-ghost"
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        const res = await fetch("/api/admin/newsletter/csv");
        const text = await res.text();
        const blob = new Blob([text], { type: "text/csv" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "cmc-newsletter-subscribers.csv";
        a.click();
        URL.revokeObjectURL(a.href);
        setBusy(false);
      }}
    >
      {busy ? "Preparing…" : "Download CSV"}
    </button>
  );
}
