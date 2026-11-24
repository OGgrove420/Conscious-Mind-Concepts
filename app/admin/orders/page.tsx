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

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; ref?: string }>;
}) {
  const { status, ref } = await searchParams;
  let q = sb().from("orders").select("*").order("id", { ascending: false }).limit(100);
  if (status) q = q.eq("status", status);
  if (ref) q = q.eq("ref", ref.trim().toUpperCase());
  const { data: orders } = await q;

  return (
    <>
      <div className="section-head">
        <span className="eyebrow">Admin</span>
        <h1>Orders</h1>
      </div>
      <form method="get" className="admin-filter" action="/admin/orders">
        <select name="status" defaultValue={status ?? ""}>
          <option value="">All statuses</option>
          {["PENDING", "PROCESSING", "PAID", "FAILED", "CANCELLED", "REFUNDED"].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <input name="ref" placeholder="Reference…" defaultValue={ref ?? ""} />
        <button className="btn btn-ghost btn-sm" type="submit">Filter</button>
      </form>
      <div className="panel" style={{ marginTop: 16 }}>
        {orders && orders.length > 0 ? (
          <table className="tbl">
            <thead>
              <tr><th>Ref</th><th>Customer</th><th>Total</th><th>Status</th><th>Test</th><th>Note</th><th>Placed</th></tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={String(o.id)}>
                  <td>{String(o.ref)}</td>
                  <td>{String(o.email)}</td>
                  <td>{zarCents(o.total_cents as number)}</td>
                  <td><span className={`status-pill ${PILL[String(o.status)] ?? ""}`}>{String(o.status)}</span></td>
                  <td>{o.test_mode ? "test" : ""}</td>
                  <td className="soft" style={{ fontSize: 12 }}>{String(o.ozow_status_message ?? "")}</td>
                  <td>{fmtDateTime(o.created_at as string)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="soft">No orders match.</p>
        )}
      </div>
    </>
  );
}
