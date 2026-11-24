import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { sb } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { startSession, endSession } from "@/lib/session";

const MAX_ATTEMPTS = 5;
const WINDOW_MIN = 15;

async function rateLimited(context: string, ip: string): Promise<boolean> {
  const since = new Date(Date.now() - WINDOW_MIN * 60000).toISOString();
  const { count } = await sb().from("login_attempts")
    .select("id", { count: "exact", head: true })
    .eq("context", context)
    .eq("ip", ip)
    .eq("ok", false)
    .gte("created_at", since);
  return (count ?? 0) >= MAX_ATTEMPTS;
}

async function recordAttempt(context: string, ip: string, ok: boolean): Promise<void> {
  await sb().from("login_attempts").insert({ context, ip, ok });
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Record<string, string>;
  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";
  const hdrs = await headers();
  const ip = (hdrs.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  const context = `admin:${email}`;

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }
  if (await rateLimited(context, ip)) {
    return NextResponse.json({ error: "Too many attempts. Wait 15 minutes and try again." }, { status: 429 });
  }

  const { data: admin } = await sb().from("admin_users").select("*").eq("email", email).maybeSingle();
  if (!admin || !verifyPassword(password, admin.password_hash as string)) {
    await recordAttempt(context, ip, false);
    return NextResponse.json({ error: "Wrong email or password." }, { status: 401 });
  }

  await recordAttempt(context, ip, true);
  await sb().from("admin_users").update({ last_login: new Date().toISOString() }).eq("id", admin.id as number);
  await startSession({
    role: "admin",
    id: admin.id as number,
    email: admin.email as string,
    name: (admin.name as string) ?? "",
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  await endSession();
  return NextResponse.json({ ok: true });
}
