"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeliverPendingButton() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const router = useRouter();
  return (
    <span style={{ display: "inline-flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
      <button
        className="btn btn-primary"
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          const res = await fetch("/api/admin/newsletter/deliver", { method: "POST" });
          const body = await res.json().catch(() => ({}));
          setMsg(res.ok ? `Delivered to ${body.made} subscriber(s).` : body.error || "failed");
          setBusy(false);
          router.refresh();
        }}
      >
        {busy ? "Delivering…" : "Deliver pending freebies"}
      </button>
      {msg ? <span style={{ fontSize: 13 }}>{msg}</span> : null}
    </span>
  );
}
