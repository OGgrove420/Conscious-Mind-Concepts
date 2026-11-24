"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** publish toggle — publishing stays blocked until a file exists (by design). */
export default function PublishButton({ productId, hasFile }: { productId: number; hasFile: boolean }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const router = useRouter();

  return (
    <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
      <button
        className="btn btn-gold btn-sm"
        type="button"
        disabled={busy || !hasFile}
        title={hasFile ? "Publish" : "Upload the PDF first — publishing stays blocked without a file"}
        onClick={async () => {
          setBusy(true);
          setErr("");
          const res = await fetch("/api/admin/publish", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ productId, status: "published" }),
          });
          const body = await res.json().catch(() => ({}));
          if (!res.ok) setErr(body.error || "failed");
          setBusy(false);
          router.refresh();
        }}
      >
        {busy ? "…" : "Publish"}
      </button>
      {err ? <span style={{ fontSize: 12, color: "#B42318" }}>{err}</span> : null}
    </span>
  );
}
