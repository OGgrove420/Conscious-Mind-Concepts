import { NextRequest, NextResponse } from "next/server";
import { sb } from "@/lib/db";

const VERB: Record<string, string> = {
  video: "Stream",
  image: "View",
  audio: "Listen",
};

/**
 * expiring media link — same trust chain as the PDF download: token row
 * checked against expiry + entitlement, then the bytes are piped through
 * this response from the private bucket (Range requests pass through so
 * video seeking works and the storage URL never reaches the buyer).
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { data: link } = await sb().from("media_links").select("*").eq("token", token).maybeSingle();
  if (!link) return new NextResponse("This link does not exist.", { status: 404 });
  if (new Date(link.expires_at as string) < new Date()) {
    return new NextResponse("This link has expired. Get a fresh one from your library or order page.", { status: 403 });
  }
  if ((link.max_downloads as number) > 0 && (link.used as number) >= (link.max_downloads as number)) {
    return new NextResponse("This link has been used up.", { status: 403 });
  }

  const { data: media } = await sb().from("media").select("*").eq("id", link.media_id as number).maybeSingle();
  if (!media) return new NextResponse("File missing.", { status: 404 });
  if ((link.max_downloads as number) > 0) {
    await sb().from("media_links").update({ used: (link.used as number) + 1 }).eq("id", link.id as number);
  } else {
    await sb().from("media_links").update({ used: (link.used as number) + 1 }).eq("id", link.id as number);
  }

  const { createClient } = await import("@supabase/supabase-js");
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_KEY || "";
  const admin = createClient(url, key, { auth: { persistSession: false } });
  const { data: signed } = await admin.storage.from("media-files").createSignedUrl(media.stored_name as string, 60);
  if (!signed) return new NextResponse("Could not read the file.", { status: 500 });

  // pipe through (Range preserved for video seeking)
  const range = req.headers.get("range");
  const upstream = await fetch(signed.signedUrl, {
    headers: range ? { Range: range } : {},
  });
  const headers = new Headers();
  for (const h of ["content-type", "content-length", "content-range", "accept-ranges"]) {
    const v = upstream.headers.get(h);
    if (v) headers.set(h, v);
  }
  headers.set("Cache-Control", "no-store");
  headers.set("X-Content-Type-Options", "nosniff");
  if (!headers.get("content-type")) headers.set("content-type", (media.mime as string) || "application/octet-stream");
  headers.set("Accept-Ranges", "bytes");
  return new NextResponse(upstream.body, { status: upstream.status, headers });
}
