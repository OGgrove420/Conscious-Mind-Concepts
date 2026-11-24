import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { handleGatewayResult } from "@/lib/gateway";
import { getSettings } from "@/lib/settings";

/**
 * Ozow notification endpoint (server-to-server). The ONLY place an order
 * becomes PAID and products are released. Responds 200 to anything (so Ozow
 * doesn't retry forever) but only acts on fully-verified results.
 * Exact port of public/notify.php.
 */
export async function POST(req: Request) {
  const raw = await req.text();
  const posted: Record<string, string> = {};
  for (const [k, v] of new URLSearchParams(raw).entries()) posted[k] = v;

  const settings = await getSettings(["ozow_test_mode"]);
  const hdrs = await headers();
  const ip = (hdrs.get("x-forwarded-for") ?? "").split(",")[0].trim();

  const result = await handleGatewayResult({
    posted,
    source: "notify",
    txIdField: "TransactionId",
    hashField: "Hash",
    privateKey: process.env.OZOW_PRIVATE_KEY ?? "",
    apiKey: process.env.OZOW_API_KEY ?? "",
    testMode: settings.ozow_test_mode === "1",
    ip,
  });

  // Always 200 — unverified junk gets rejected in the body, not the status.
  return new NextResponse(result.ok ? "OK" : "REJECTED", {
    status: 200,
    headers: { "Content-Type": "text/plain" },
  });
}
