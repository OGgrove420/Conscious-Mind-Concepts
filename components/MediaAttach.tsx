"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  mediaId: number;
  products: Array<{ id: number; sku: string; title: string }>;
  attached: number[];
}

export default function MediaAttach({ mediaId, products, attached }: Props) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<number[]>(attached);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  return (
    <span>
      <button className="link-btn" type="button" onClick={() => setOpen(!open)}>
        {attached.length ? `${attached.length} product(s)` : "Attach…"}
      </button>
      {open && (
        <div style={{ position: "absolute", zIndex: 30, background: "#fff", border: "1px solid #D0D5DD", borderRadius: 10, padding: 14, marginTop: 6, boxShadow: "0 8px 24px rgba(0,0,0,.12)", maxWidth: 320 }}>
          {products.map((p) => (
            <label key={p.id} style={{ display: "block", fontSize: 13, padding: "3px 0" }}>
              <input
                type="checkbox"
                checked={selected.includes(p.id)}
                onChange={(e) =>
                  setSelected(e.target.checked ? [...selected, p.id] : selected.filter((id) => id !== p.id))
                }
              />{" "}
              {p.sku} — {p.title}
            </label>
          ))}
          <button
            className="btn btn-primary btn-sm"
            type="button"
            disabled={busy}
            style={{ marginTop: 8 }}
            onClick={async () => {
              setBusy(true);
              await fetch("/api/admin/media/attach", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ mediaId, productIds: selected }),
              });
              setBusy(false);
              setOpen(false);
              router.refresh();
            }}
          >
            {busy ? "Saving…" : "Save attachments"}
          </button>
        </div>
      )}
    </span>
  );
}
