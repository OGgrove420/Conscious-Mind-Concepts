import { sb } from "@/lib/db";
import { zarCents, effectivePrice, slugify } from "@/lib/format";
import { fmtDateTime } from "@/lib/format";
import PublishButton from "@/components/PublishButton";
import UploadPdf from "@/components/UploadPdf";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  const { data: products } = await sb()
    .from("products")
    .select("*, categories(name)")
    .order("sort_order")
    .order("id");

  return (
    <>
      <div className="section-head">
        <span className="eyebrow">Admin</span>
        <h1>Products</h1>
      </div>
      <div className="panel">
        {products && products.length > 0 ? (
          <table className="tbl">
            <thead>
              <tr><th>SKU</th><th>Title</th><th>Price</th><th>Status</th><th>File</th><th>Created</th></tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={String(p.id)}>
                  <td>{String(p.sku)}</td>
                  <td>
                    {String(p.title)}
                    <div style={{ fontSize: 12, color: "#52607A" }}>
                      {p.categories ? (p.categories as { name: string }).name : "—"} · /product/{slugify(String(p.title))}
                    </div>
                  </td>
                  <td>
                    {p.sale_price_cents !== null ? (
                      <>
                        <s>{zarCents(p.price_cents as number)}</s> {zarCents(effectivePrice(p))}
                      </>
                    ) : (
                      zarCents(p.price_cents as number)
                    )}
                  </td>
                  <td>
                    <span className={`status-pill ${p.status === "published" ? "st-PAID" : p.status === "draft" ? "st-CANCELLED" : "st-PENDING"}`}>
                      {String(p.status)}
                    </span>
                  </td>
                  <td>
                    {p.file_path ? "uploaded" : <UploadPdf productId={p.id as number} />}
                    {p.status !== "published" && !p.file_path ? null : null}
                    {p.status !== "published" ? (
                      <PublishButton productId={p.id as number} hasFile={Boolean(p.file_path)} />
                    ) : null}
                  </td>
                  <td style={{ fontSize: 12 }}>{fmtDateTime(p.created_at as string)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="soft">No products yet — seed them from Settings.</p>
        )}
      </div>
    </>
  );
}
