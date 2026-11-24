"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** PDF upload straight to the private product-files bucket via /api/admin/upload. */
export default function UploadPdf({ productId }: { productId: number }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const router = useRouter();

  return (
    <span style={{ display: "inline-flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
      <input
        type="file"
        accept="application/pdf"
        style={{ fontSize: 12, maxWidth: 180 }}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          setBusy(true);
          setMsg("");
          const fd = new FormData();
          fd.append("file", file);
          fd.append("productId", String(productId));
          const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
          const body = await res.json().catch(() => ({}));
          setMsg(res.ok ? "uploaded" : body.error || "upload failed");
          setBusy(false);
          router.refresh();
        }}
        disabled={busy}
      />
      {busy ? <span style={{ fontSize: 12 }}>uploading…</span> : null}
      {msg ? <span style={{ fontSize: 12, color: "#067647" }}>{msg}</span> : null}
    </span>
  );
}
