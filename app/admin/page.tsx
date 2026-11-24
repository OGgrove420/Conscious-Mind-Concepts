import Link from "next/link";
import { sb } from "@/lib/db";
import { zarCents, fmtDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

const PILL: Record<string, string> = {
  PAID: "st-PAID",
  PENDING: "st-PENDING",
  PROCESSING: "st-PENDING",
  FAILED: "st-CANCELLED",
  CANCELLED: "st-CANCELLED",
  REFUNDED: "st-CANCELLED",
};

export default async function AdminDashboard() {
  const [{ count: paid }, { count: pending }, { data: revenueRows }, { data: recent }, { data: noFile }] =
    await Promise.all([
      sb().from("orders").select("id", { count: "exact", head: true }).eq("status", "PAID"),
      sb().from("orders").select("id", { count: "exact", head: true }).in("status", ["PENDING", "PROCESSING"]),
      sb().from("orders").select("total_cents").eq("status", "PAID"),
      sb().from("orders").select("*").order("id", { ascending: false }).limit(8),
      sb().from("products").select("sku,title").eq("status", "published").eq("file_path", ""),
    ]);

  const revenue = (revenueRows ?? []).reduce((s, r) => s + (r.total_cents as number), 0);

  return (
    <>
      <div className="section-head">
        <span className="eyebrow">Admin</span>
        <h1>Dashboard</h1>
      </div>
      <div className="stat-grid">
        <div className="panel stat">
          <span className="stat-label">Paid orders</span>
          <span className="stat-value">{paid ?? 0}</span>
        </div>
        <div className="panel stat">
          <span className="stat-label">Revenue (PAID)</span>
          <span className="stat-value">{zarCents(revenue)}</span>
        </div>
        <div className="panel stat">
          <span className="stat-label">Awaiting payment</span>
          <span className="stat-value">{pending ?? 0}</span>
        </div>
      </div>

      {noFile && noFile.length > 0 && (
        <div className="panel form-error" style={{ marginTop: 20 }}>
          Published but missing their file ({noFile.length}):{" "}
          {noFile.map((p) => p.sku).join(", ")}. Buyers cannot download until
          you upload each PDF on its product page.
        </div>
      )}

      <div className="panel" style={{ marginTop: 20 }}>
        <h2>Recent orders</h2>
        {recent && recent.length > 0 ? (
          <table className="tbl">
            <thead>
              <tr><th>Ref</th><th>Customer</th><th>Total</th><th>Status</th><th>Placed</th><th></th></tr>
            </thead>
            <tbody>
              {recent.map((o) => (
                <tr key={String(o.id)}>
                  <td>{String(o.ref)}</td>
                  <td>{String(o.email)}</td>
                  <td>{zarCents(o.total_cents as number)}</td>
                  <td><span className={`status-pill ${PILL[String(o.status)] ?? ""}`}>{String(o.status)}</span></td>
                  <td>{fmtDateTime(o.created_at as string)}</td>
                  <td><Link href={`/admin/orders?ref=${o.ref}`}>Open</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="soft">No orders yet.</p>
        )}
      </div>
    </>
  );
}
