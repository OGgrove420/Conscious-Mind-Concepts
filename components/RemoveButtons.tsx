"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function RemoveButtons({ ids }: { ids: number[] }) {
  const [busy, setBusy] = useState<number | null>(null);
  const router = useRouter();
  return (
    <div style={{ marginTop: 12 }}>
      {ids.map((id) => (
        <button
          key={id}
          className="link-btn"
          disabled={busy === id}
          onClick={async () => {
            setBusy(id);
            const res = await fetch("/api/cart/remove", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ productId: id }),
            });
            if (res.ok) {
              const { title } = await res.json();
              router.push(`/cart?removed=${encodeURIComponent(title ?? "Item")}`);
              router.refresh();
            } else {
              setBusy(null);
            }
          }}
        >
          {busy === id ? "Removing…" : `Remove item ${ids.indexOf(id) + 1}`}
        </button>
      ))}
    </div>
  );
}
