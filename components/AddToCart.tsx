"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AddToCart({ productId, isFree }: { productId: number; isFree: boolean }) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  return (
    <button
      className="btn btn-primary btn-lg"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        const res = await fetch("/api/cart/add", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId }),
        });
        if (res.ok) {
          router.push(isFree ? "/checkout" : "/cart");
          router.refresh();
        } else {
          setBusy(false);
          alert("Could not add to cart — please try again.");
        }
      }}
    >
      {isFree ? "Get it free" : "Add to cart"}
    </button>
  );
}
