import { sb } from "@/lib/db";
import { fmtDateTime } from "@/lib/format";
import DeliverPendingButton from "@/components/DeliverPendingButton";
import NewsletterCsvButton from "@/components/NewsletterCsvButton";

export const dynamic = "force-dynamic";

const MARKER = "Newsletter freebie — no payment required";

export default async function AdminNewsletterPage() {
  const { data: subs } = await sb().from("newsletter").select("*").order("id", { ascending: false });
  const { data: delivered } = await sb().from("orders")
    .select("email").eq("ozow_status_message", MARKER);
  const deliveredEmails = new Set((delivered ?? []).map((d) => String(d.email).toLowerCase()));
  const { data: freebies } = await sb().from("products")
    .select("sku,title,file_path").eq("status", "published").eq("price_cents", 0);
  const readyFreebies = (freebies ?? []).filter((f) => f.file_path);

  return (
    <>
      <div className="section-head">
        <span className="eyebrow">Admin</span>
        <h1>Newsletter</h1>
      </div>

      <div className="panel">
        <h2>Freebie status</h2>
        {readyFreebies.length > 0 ? (
          <p>Deliverable right now: {readyFreebies.map((f) => f.sku).join(", ")}.</p>
        ) : (
          <p className="form-note">
            No freebie PDF is uploaded yet — signups join the list but nothing is
            sent until a free download file exists. Upload a PDF on a published
            R0 product&apos;s row (Products page), then use the button below.
          </p>
        )}
        <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
          <DeliverPendingButton />
          <NewsletterCsvButton />
        </div>
      </div>

      <div className="panel" style={{ marginTop: 20 }}>
        <h2>Subscribers ({subs?.length ?? 0})</h2>
        {subs && subs.length > 0 ? (
          <table className="tbl">
            <thead>
              <tr><th>Email</th><th>Joined</th><th>Freebie</th></tr>
            </thead>
            <tbody>
              {subs.map((s) => (
                <tr key={String(s.id)}>
                  <td>{String(s.email)}</td>
                  <td style={{ fontSize: 12 }}>{fmtDateTime(s.created_at as string)}</td>
                  <td>
                    <span className={`status-pill ${deliveredEmails.has(String(s.email).toLowerCase()) ? "st-PAID" : "st-PENDING"}`}>
                      {deliveredEmails.has(String(s.email).toLowerCase()) ? "sent" : "pending"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="soft">No signups yet.</p>
        )}
      </div>
    </>
  );
}
