import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { handleGatewayResult } from "@/lib/gateway";
import { getSettings } from "@/lib/settings";

/**
 * Ozow browser redirect landing (user POSTed back from pay.ozow.com).
 * Same gate as the notify — a redirect is NEVER proof of payment on its own;
 * it goes through hash + amount + status-API verification like any notify.
 * Parity of the redirect branch in payment_result.php.
 */
export async function POST(req: Request) {
  const posted: Record<string, string> = {};
  try {
    const form = await req.formData();
    for (const [k, v] of form.entries()) posted[k] = String(v);
  } catch {
    /* fall through */
  }

  const settings = await getSettings(["ozow_test_mode"]);
  const hdrs = await headers();
  const ip = (hdrs.get("x-forwarded-for") ?? "").split(",")[0].trim();

  const result = await handleGatewayResult({
    posted,
    source: "redirect",
    txIdField: "TransactionId",
    hashField: "Hash",
    privateKey: process.env.OZOW_PRIVATE_KEY ?? "",
    apiKey: process.env.OZOW_API_KEY ?? "",
    testMode: settings.ozow_test_mode === "1",
    ip,
  });

  // land the user on the same page Ozow's Success/Cancel/Error URL would
  const status = result.order_status;
  const target =
    status === "PAID"
      ? `/payment/success?ref=${encodeURIComponent(result.ref)}`
      : status === "CANCELLED"
        ? `/payment/cancel?ref=${encodeURIComponent(result.ref)}`
        : `/payment/error?ref=${encodeURIComponent(result.ref)}`;
  return NextResponse.redirect(new URL(target, req.url), 303);
}
