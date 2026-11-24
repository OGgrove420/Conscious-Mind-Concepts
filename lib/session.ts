/**
 * Signed-cookie sessions for admin and customer logins.
 * Replaces PHP sessions: the cookie carries a small signed payload
 * {role, id, email}; the signature is HMAC-SHA256 with SESSION_SECRET.
 * Cookie name kept as CMCSTORESESS for parity.
 */
import crypto from "crypto";
import { cookies } from "next/headers";

const COOKIE = "CMCSTORESESS";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export type Session =
  | { role: "admin"; id: number; email: string; name: string }
  | { role: "customer"; id: number; email: string };

function secret(): string {
  return process.env.SESSION_SECRET || "";
}

function sign(data: string): string {
  return crypto.createHmac("sha256", secret()).update(data).digest("base64url");
}

function encode(sess: Session): string {
  const payload = Buffer.from(JSON.stringify(sess), "utf8").toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function decode(raw: string | undefined): Session | null {
  if (!raw || !secret()) return null;
  const [payload, sig] = raw.split(".");
  if (!payload || !sig) return null;
  const expected = sign(payload);
  if (expected.length !== sig.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (parsed?.role === "admin" || parsed?.role === "customer") return parsed as Session;
    return null;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  return decode(store.get(COOKIE)?.value);
}

export async function getAdmin(): Promise<{ id: number; email: string; name: string } | null> {
  const s = await getSession();
  return s && s.role === "admin" ? s : null;
}

export async function getCustomer(): Promise<{ id: number; email: string } | null> {
  const s = await getSession();
  return s && s.role === "customer" ? { id: s.id, email: s.email } : null;
}

/** Only valid inside server actions / route handlers. */
export async function startSession(sess: Session): Promise<void> {
  const store = await cookies();
  store.set(COOKIE, encode(sess), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function endSession(): Promise<void> {
  const store = await cookies();
  store.set(COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
}
