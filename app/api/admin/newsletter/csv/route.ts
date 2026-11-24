import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/session";
import { sb } from "@/lib/db";

const MARKER = "Newsletter freebie — no payment required";

export async function GET() {
  if (!(await getAdmin())) return NextResponse.json({ error: "unauthorised" }, { status: 401 });

  const { data: subs } = await sb().from("newsletter").select("email,created_at").order("id");
  const { data: delivered } = await sb().from("orders").select("email").eq("ozow_status_message", MARKER);
  const deliveredEmails = new Set((delivered ?? []).map((d) => String(d.email).toLowerCase()));

  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const lines = ["email,joined,freebie_sent"];
  for (const s of subs ?? []) {
    const sent = deliveredEmails.has(String(s.email).toLowerCase());
    lines.push(`${esc(String(s.email))},${esc(String(s.created_at))},${sent ? "yes" : "pending"}`);
  }
  return new NextResponse(lines.join("\n"), {
    headers: { "Content-Type": "text/csv", "Content-Disposition": 'attachment; filename="cmc-newsletter-subscribers.csv"' },
  });
}
