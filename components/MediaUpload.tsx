"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function MediaUpload() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const router = useRouter();

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const formEl = e.currentTarget;
        const input = formEl.querySelector('input[type="file"]') as HTMLInputElement;
        const files = input.files;
        if (!files || files.length === 0) return;
        setBusy(true);
        setMsg("");
        let ok = 0;
        const errors: string[] = [];
        for (const file of Array.from(files)) {
          const fd = new FormData();
          fd.append("file", file);
          const res = await fetch("/api/admin/media/upload", { method: "POST", body: fd });
          const body = await res.json().catch(() => ({}));
          if (res.ok) ok++;
          else errors.push(`${file.name}: ${body.error || "failed"}`);
        }
        setMsg(`${ok} uploaded${errors.length ? ` — ${errors.join("; ")}` : ""}`);
        setBusy(false);
        formEl.reset();
        router.refresh();
      }}
    >
      <input type="file" multiple style={{ fontSize: 13 }} />
      <button className="btn btn-primary" type="submit" disabled={busy} style={{ marginLeft: 12 }}>
        {busy ? "Uploading…" : "Upload"}
      </button>
      {msg ? <div className="form-note" style={{ marginTop: 10 }}>{msg}</div> : null}
    </form>
  );
}
