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

/** customer sign in */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Record<string, string>;
  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";
  const hdrs = await headers();
  const ip = (hdrs.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  const context = `customer:${email}`;

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }
  if (await rateLimited(context, ip)) {
    return NextResponse.json({ error: "Too many attempts. Wait 15 minutes and try again." }, { status: 429 });
  }

  const { data: cust } = await sb().from("customers").select("*").eq("email", email).maybeSingle();
  if (!cust || !cust.password_hash || !verifyPassword(password, cust.password_hash as string)) {
    await recordAttempt(context, ip, false);
    return NextResponse.json({ error: "Wrong email or password." }, { status: 401 });
  }

  await recordAttempt(context, ip, true);
  await startSession({ role: "customer", id: cust.id as number, email: cust.email as string });
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  await endSession();
  return NextResponse.json({ ok: true });
}
