import { NextResponse } from "next/server";
import { sb } from "@/lib/db";
import { getAdmin } from "@/lib/session";
import { slugify } from "@/lib/format";

/**
 * media upload — content-sniffed (magic bytes, never just the name), size
 * capped per kind, stored in the PRIVATE media-files bucket. Admin-only.
 * .php/.exe and friends can never upload: anything not matching an allowed
 * magic signature is rejected outright.
 */
const LIMITS: Record<string, number> = {
  pdf: 80 * 1024 * 1024,
  video: 512 * 1024 * 1024,
  audio: 100 * 1024 * 1024,
  image: 20 * 1024 * 1024,
  zip: 300 * 1024 * 1024,
  doc: 80 * 1024 * 1024,
  ebook: 80 * 1024 * 1024,
};

interface Sniff {
  kind: string;
  mime: string;
  ext: string;
}

/** magic-byte sniffing — returns null for anything unrecognized/disallowed */
function sniff(buf: Buffer, filename: string): Sniff | null {
  const ext = (filename.split(".").pop() ?? "").toLowerCase();

  // documents that are really zip containers
  const zipExts = ["zip", "docx", "pptx", "xlsx", "epub"];
  if (buf.length > 4 && buf[0] === 0x50 && buf[1] === 0x4b && (buf[2] === 0x03 || buf[2] === 0x05 || buf[2] === 0x07)) {
    if (zipExts.includes(ext)) {
      if (ext === "zip") return { kind: "zip", mime: "application/zip", ext };
      if (ext === "epub") return { kind: "ebook", mime: "application/epub+zip", ext };
      return { kind: "doc", mime: "application/octet-stream", ext };
    }
    return null;
  }
  if (buf.length > 4 && buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46) {
    return { kind: "pdf", mime: "application/pdf", ext: "pdf" };
  }
  if (buf.length > 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    return { kind: "image", mime: "image/png", ext: "png" };
  }
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return { kind: "image", mime: "image/jpeg", ext: "jpg" };
  }
  if (buf.length > 6 && buf.slice(0, 3).toString("latin1") === "GIF") {
    return { kind: "image", mime: "image/gif", ext: "gif" };
  }
  if (buf.length > 12 && buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3) {
    const isWebm = ext === "webm";
    return { kind: "video", mime: isWebm ? "video/webm" : "video/x-matroska", ext: isWebm ? "webm" : ext };
  }
  if (buf.length > 12 && buf.slice(4, 8).toString("latin1") === "ftyp") {
    const brand = buf.slice(8, 12).toString("latin1");
    const mime = brand.startsWith("qt") ? "video/quicktime" : "video/mp4";
    const extOut = brand.startsWith("qt") ? "mov" : "mp4";
    return { kind: "video", mime, ext: extOut };
  }
  if (buf.length > 4 && buf.slice(0, 3).toString("latin1") === "ID3") {
    return { kind: "audio", mime: "audio/mpeg", ext: "mp3" };
  }
  if (buf.length > 4 && buf[0] === 0xff && (buf[1] === 0xfb || buf[1] === 0xf3 || buf[1] === 0xf2)) {
    return { kind: "audio", mime: "audio/mpeg", ext: "mp3" };
  }
  if (buf.length > 12 && buf.slice(0, 4).toString("latin1") === "RIFF" && buf.slice(8, 12).toString("latin1") === "WAVE") {
    return { kind: "audio", mime: "audio/wav", ext: "wav" };
  }
  if (buf.length > 4 && buf.slice(0, 4).toString("latin1") === "OggS") {
    return { kind: "audio", mime: "audio/ogg", ext: "ogg" };
  }
  if (ext === "m4a" && buf.length > 12 && buf.slice(4, 8).toString("latin1") === "ftyp") {
    return { kind: "audio", mime: "audio/mp4", ext: "m4a" };
  }
  return null;
}

export async function POST(req: Request) {
  if (!(await getAdmin())) return NextResponse.json({ error: "unauthorised" }, { status: 401 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "file required" }, { status: 400 });

  const buf = Buffer.from(await file.arrayBuffer());
  const sniffed = sniff(buf, file.name);
  if (!sniffed) {
    return NextResponse.json(
      { error: "Blocked: unrecognized or disallowed content (sniffed from the bytes, not the name)." },
      { status: 400 }
    );
  }
  const limit = LIMITS[sniffed.kind] ?? 20 * 1024 * 1024;
  if (buf.length > limit) {
    return NextResponse.json(
      { error: `Too large for ${sniffed.kind} (max ${Math.round(limit / 1024 / 1024)} MB).` },
      { status: 400 }
    );
  }

  const title = file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").slice(0, 120) || "Media";
  const storedName = `${slugify(title) || "media"}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${sniffed.ext}`;

  const { createClient } = await import("@supabase/supabase-js");
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_KEY || "";
  const admin = createClient(url, key, { auth: { persistSession: false } });
  const { error: upErr } = await admin.storage.from("media-files").upload(storedName, buf, {
    contentType: sniffed.mime,
    upsert: false,
  });
  if (upErr) return NextResponse.json({ error: `storage upload failed: ${upErr.message}` }, { status: 500 });

  await sb().from("media").insert({
    title,
    kind: sniffed.kind,
    mime: sniffed.mime,
    ext: sniffed.ext,
    size_bytes: buf.length,
    stored_name: storedName,
    original_name: file.name.slice(0, 200),
  });

  return NextResponse.json({ ok: true });
}
