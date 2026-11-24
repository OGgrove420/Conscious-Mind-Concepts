"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const LINKS: Array<[string, string]> = [
  ["Dashboard", "/admin"],
  ["Orders", "/admin/orders"],
  ["Products", "/admin/products"],
  ["Media Library", "/admin/media"],
  ["Newsletter", "/admin/newsletter"],
  ["Settings", "/admin/settings"],
];

export default function AdminNav({ email }: { email: string }) {
  const path = usePathname();
  const router = useRouter();
  return (
    <div className="admin-top">
      <nav className="admin-nav">
        {LINKS.map(([label, href]) => (
          <Link key={href} href={href} className={path === href ? "active" : ""}>
            {label}
          </Link>
        ))}
      </nav>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <span className="soft" style={{ fontSize: 13 }}>{email}</span>
        <button
          className="btn btn-ghost btn-sm"
          onClick={async () => {
            await fetch("/api/admin/logout", { method: "POST" });
            router.push("/admin/login");
            router.refresh();
          }}
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
