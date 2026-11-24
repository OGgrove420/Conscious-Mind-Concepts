import { NextResponse } from "next/server";
import { sb } from "@/lib/db";
import { getCustomer } from "@/lib/session";

/**
 * fresh link for an entitlement — issues a new expiring token row and
 * redirects to the download endpoint. Auth: the entitlement's email must
 * match the signed-in customer (guest flow uses emailed links instead).
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const entId = Number(searchParams.get("ent") ?? "0");
  const cust = await getCustomer();
  if (!cust) return NextResponse.redirect(new URL("/login", req.url));
  if (!entId) return NextResponse.redirect(new URL("/account", req.url));

  const { data: ent } = await sb().from("entitlements").select("id,email")
    .eq("id", entId).eq("email", cust.email).maybeSingle();
  if (!ent) return NextResponse.redirect(new URL("/account", req.url));

  const crypto = await import("crypto");
  const token = crypto.randomBytes(24).toString("hex");
  const hours = 72;
  await sb().from("entitlement_links").insert({
    entitlement_id: ent.id as number,
    token,
    expires_at: new Date(Date.now() + hours * 3600 * 1000).toISOString(),
    max_downloads: 3,
  });
  return NextResponse.redirect(new URL(`/download/${token}`, req.url));
}
