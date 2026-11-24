import { sb } from "@/lib/db";
import { fmtDateTime } from "@/lib/format";
import MediaUpload from "@/components/MediaUpload";
import MediaAttach from "@/components/MediaAttach";

export const dynamic = "force-dynamic";

const KIND_LABEL: Record<string, string> = {
  pdf: "PDF", video: "Video", audio: "Audio", image: "Image",
  zip: "ZIP", doc: "Doc", ebook: "Ebook",
};

export default async function AdminMediaPage() {
  const [{ data: media }, { data: products }, { data: attachments }] = await Promise.all([
    sb().from("media").select("*").order("id", { ascending: false }),
    sb().from("products").select("id,sku,title").order("sort_order"),
    sb().from("product_media").select("product_id,media_id"),
  ]);

  const byMedia = new Map<number, number[]>();
  for (const a of attachments ?? []) {
    const list = byMedia.get(a.media_id as number) ?? [];
    list.push(a.product_id as number);
    byMedia.set(a.media_id as number, list);
  }

  return (
    <>
      <div className="section-head">
        <span className="eyebrow">Admin</span>
        <h1>Media Library</h1>
      </div>

      <div className="panel">
        <h2>Upload</h2>
        <p className="soft" style={{ fontSize: 13 }}>
          PDF 80 MB · video MP4/WebM/MOV 512 MB · audio 100 MB · images 20 MB ·
          ZIP 300 MB · DOCX/PPTX/XLSX/EPUB 80 MB. Files live in a private
          bucket; buyers only ever receive expiring links.
        </p>
        <MediaUpload />
      </div>

      <div className="panel" style={{ marginTop: 20 }}>
        <h2>Library ({media?.length ?? 0})</h2>
        {media && media.length > 0 ? (
          <table className="tbl">
            <thead>
              <tr><th>Title</th><th>Kind</th><th>Size</th><th>Attached to</th><th>Uploaded</th></tr>
            </thead>
            <tbody>
              {media.map((m) => (
                <tr key={String(m.id)}>
                  <td>
                    {String(m.title)}
                    <div style={{ fontSize: 12, color: "#52607A" }}>{String(m.original_name ?? "")}</div>
                  </td>
                  <td>{KIND_LABEL[String(m.kind)] ?? String(m.kind)}</td>
                  <td style={{ fontSize: 12 }}>{Math.round((m.size_bytes as number) / 1024)} KB</td>
                  <td><MediaAttach mediaId={m.id as number} products={products ?? []} attached={byMedia.get(m.id as number) ?? []} /></td>
                  <td style={{ fontSize: 12 }}>{fmtDateTime(m.created_at as string)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="soft">Nothing uploaded yet.</p>
        )}
      </div>
    </>
  );
}
