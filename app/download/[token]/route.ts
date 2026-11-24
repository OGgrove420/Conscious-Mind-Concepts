import { NextResponse } from "next/server";
import { sb } from "@/lib/db";

/**
 * expiring single-use download endpoint. A token row is the ONLY way a file
 * leaves storage — the buckets are private. Checks: token exists, not
 * expired, under max_downloads, entitlement not revoked, product has a file.
 * Streams from Supabase storage via a short-lived signed URL; the buyer never
 * sees the storage URL itself (the bytes are piped through this response).
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const { data: link } = await sb().from("entitlement_links").select("*").eq("token", token).maybeSingle();

  const deny = (msg: string, code = 403) =>
    new NextResponse(msg, { status: code, headers: { "Content-Type": "text/plain" } });

  if (!link) return deny("This download link does not exist.", 404);
  if (new Date(link.expires_at as string) < new Date()) return deny("This download link has expired. Get a fresh one from your library or order page.");
  if ((link.used as number) >= (link.max_downloads as number)) {
    return deny("This link has been used up. Get a fresh one from your library or order page.");
  }

  const { data: ent } = await sb().from("entitlements").select("*, products(file_path,slug,title,format)")
    .eq("id", link.entitlement_id as number).maybeSingle();
  if (!ent) return deny("This purchase no longer exists.", 404);
  if (ent.revoked) return deny("This download has been revoked. Contact us for help.");
  const filePath = (ent.products as { file_path?: string } | null)?.file_path ?? "";
  if (!filePath) return deny("The file for this product is not available yet. Contact us and we will make it right.");

  // burn one use before streaming (single-use even if the stream fails)
  await sb().from("entitlement_links").update({ used: (link.used as number) + 1 }).eq("id", link.id as number);
  await sb().from("entitlements").update({ downloads_used: (ent.downloads_used as number) + 1 }).eq("id", ent.id as number);
  const hdrs = req.headers;
  await sb().from("download_events").insert({
    entitlement_id: ent.id as number,
    ip: (hdrs.get("x-forwarded-for") ?? "").split(",")[0].trim(),
    user_agent: (hdrs.get("user-agent") ?? "").slice(0, 200),
  });

  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_KEY || "";
  const { createClient } = await import("@supabase/supabase-js");
  const admin = createClient(url, key, { auth: { persistSession: false } });
  const { data: blob, error } = await admin.storage.from("product-files").download(filePath);
  if (error || !blob) return deny("Could not read the file. Contact us and we will reset your link.", 500);

  const safe = String((ent.products as { slug?: string }).slug ?? "download");
  return new NextResponse(blob as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${safe}.pdf"`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
