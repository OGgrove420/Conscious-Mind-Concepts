import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/session";
import { saveSetting } from "@/lib/settings";

/** settings save — admin only. Parity with admin/settings.php do=save. */
export async function POST(req: Request) {
  if (!(await getAdmin())) return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as Record<string, string>;

  await saveSetting("ozow_site_code", (body.ozow_site_code ?? "").trim());
  await saveSetting("ozow_test_mode", body.ozow_test_mode === "1" ? "1" : "0");
  await saveSetting("allow_guest_lookup", body.allow_guest_lookup === "1" ? "1" : "0");
  await saveSetting("download_limit", String(Math.max(1, parseInt(body.download_limit ?? "5", 10) || 5)));
  await saveSetting("link_expiry_hours", String(Math.max(1, parseInt(body.link_expiry_hours ?? "72", 10) || 72)));
  if (body.cta_title !== undefined) await saveSetting("cta_title", body.cta_title);
  if (body.cta_text !== undefined) await saveSetting("cta_text", body.cta_text);
  if (body.cta_button !== undefined) await saveSetting("cta_button", body.cta_button);

  return NextResponse.json({ ok: true });
}
