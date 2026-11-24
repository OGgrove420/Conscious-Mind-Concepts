import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { sb } from "@/lib/db";
import { hashPassword } from "@/lib/password";

/**
 * first-run admin creation — allowed ONLY while admin_users is empty.
 * Afterwards this returns 409 forever (the setup page locks too).
 */
export async function POST(req: Request) {
  const { count } = await sb().from("admin_users").select("id", { count: "exact", head: true });
  if ((count ?? 0) > 0) {
    return NextResponse.json({ error: "Setup is locked — an admin already exists." }, { status: 409 });
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, string>;
  const name = (body.name ?? "").trim();
  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";

  if (!name || !email) return NextResponse.json({ error: "Name and email are required." }, { status: 400 });
  if (password.length < 12) {
    return NextResponse.json({ error: "Use a password of at least 12 characters." }, { status: 400 });
  }

  const ins = await sb().from("admin_users").insert({
    email,
    password_hash: hashPassword(password),
    name,
    role: "admin",
  });
  if (ins.error) {
    return NextResponse.json({ error: "Could not create the admin." }, { status: 500 });
  }
  void headers;
  return NextResponse.json({ ok: true });
}
