import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { newsletterDeliver, newsletterFreebieProducts } from "@/lib/newsletter";
import { sb } from "@/lib/db";

/**
 * newsletter signup — joins the list and, when a freebie file exists,
 * instantly delivers it (same pipeline as a paid order). Parity of
 * public/newsletter.php + includes/newsletter.php.
 */
export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const email = String(form?.get("email") ?? "").trim();
  const hdrs = await headers();
  const ip = (hdrs.get("x-forwarded-for") ?? "").split(",")[0].trim();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.redirect(new URL("/?newsletter=invalid", req.url), 303);
  }

  await sb().from("newsletter").upsert({ email }, { onConflict: "email" });
  const res = await newsletterDeliver(email, ip);
  // valid signup always lands on a friendly page; delivery state is in the query
  return NextResponse.redirect(new URL(`/?newsletter=${res.status}`, req.url), 303);
}

/** admin/debug: what would be delivered right now */
export async function GET() {
  const { data } = await newsletterFreebieProducts();
  return NextResponse.json({ freebies: data ?? [] });
}
