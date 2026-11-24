/**
 * Ozow gateway integration — exact port of includes/ozow.php.
 *
 * Flow (PayHost / PayRedirect):
 *   1. Server builds the post: SiteCode, CountryCode=ZA, CurrencyCode=ZAR,
 *      Amount, TransactionReference, BankReference, Customer, URLs, IsTest,
 *      then HashCheck.
 *   2. HashCheck = SHA512 of the LOWERCASED concatenation of the post
 *      variables (in order, excluding HashCheck) + the private key.
 *   3. The customer's browser POSTs the form to https://pay.ozow.com.
 *   4. Ozow sends a browser redirect and a server-to-server notification.
 *      The notification is the only proof of payment.
 *   5. Notification fields are verified: hash, amount, reference, status —
 *      then double-checked against Ozow's own API (anti-spoof).
 *   6. Only after every check passes does the order flip to PAID.
 */
import crypto from "crypto";
import { OZOW_API_BASE, storeUrl } from "./env";

export type OzowPairs = Record<string, string>;

/** Lowercase-concat SHA512 — identical semantics to ozow_hash() in PHP. */
export function ozowHash(pairs: OzowPairs, privateKey: string): string {
  const concat = Object.entries(pairs)
    .map(([k, v]) => `${k}=${v}`)
    .join("&")
    .toLowerCase() + privateKey;
  return crypto.createHash("sha512").update(concat, "utf8").digest("hex");
}

/** Verify a redirect/notification Hash against posted fields. */
export function ozowHashValid(posted: Record<string, string>, hashField: string, privateKey: string): boolean {
  const received = posted[hashField] ?? "";
  if (!received || !/^[a-f0-9]{128}$/i.test(received)) return false;
  const pairs: Record<string, string> = {};
  for (const [k, v] of Object.entries(posted)) {
    if (k === hashField || k === "csrf") continue; // csrf never part of gateway payloads
    pairs[k] = v;
  }
  const expected = ozowHash(pairs, privateKey);
  const got = received.toLowerCase();
  if (expected.length !== got.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(got));
}

export interface OrderLike {
  ref: string;
  total_cents: number;
  first_name: string;
  last_name: string;
  email?: string | null;
}

/** Build everything the auto-submitting handoff form needs. Field order matters. */
export function ozowCheckoutFields(
  order: OrderLike,
  opts: { siteCode: string; privateKey: string; isTest: boolean }
): OzowPairs {
  const pairs: OzowPairs = {
    SiteCode: opts.siteCode,
    CountryCode: "ZA",
    CurrencyCode: "ZAR",
    Amount: (order.total_cents / 100).toFixed(2),
    TransactionReference: order.ref,
    BankReference: order.ref.replace(/[^A-Za-z0-9]/g, "").slice(0, 20),
    Customer: `${order.first_name} ${order.last_name}`.trim().slice(0, 100),
    CancelUrl: storeUrl("/payment/cancel"),
    ErrorUrl: storeUrl("/payment/error"),
    SuccessUrl: storeUrl("/payment/success"),
    NotifyUrl: storeUrl("/api/ozow/notify"),
    IsTest: opts.isTest ? "true" : "false",
  };
  if (order.email) pairs.Optional1 = order.email.slice(0, 50);
  pairs.HashCheck = ozowHash(pairs, opts.privateKey);
  return pairs;
}

export type ApiCheck =
  | { ok: true; status: string; id: string }
  | { ok: false; reason: "CONFIG" | "API_UNREACHABLE" | "API_BAD_RESPONSE" | "NOT_FOUND" };

async function ozowApiGet(path: string, params: Record<string, string>, apiKey: string): Promise<{ ok: boolean; body: string }> {
  if (!apiKey) return { ok: false, body: "" };
  const url = `${OZOW_API_BASE}${path}?` + new URLSearchParams(params).toString();
  try {
    const res = await fetch(url, {
      headers: { ApiKey: apiKey, Accept: "application/json" },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return { ok: false, body: "" };
    return { ok: true, body: await res.text() };
  } catch {
    return { ok: false, body: "" };
  }
}

/** Server-to-server status check — the anti-spoof layer. */
export async function ozowApiGetTransaction(siteCode: string, transactionId: string, apiKey: string): Promise<ApiCheck> {
  if (!apiKey) return { ok: false, reason: "CONFIG" };
  const { ok, body } = await ozowApiGet(
    "/GetTransaction",
    { siteCode, transactionId },
    apiKey
  );
  if (!ok) return { ok: false, reason: "API_UNREACHABLE" };
  let data: unknown;
  try { data = JSON.parse(body); } catch { return { ok: false, reason: "API_BAD_RESPONSE" }; }
  const d = data as Record<string, unknown> | null;
  if (!d || typeof d !== "object") return { ok: false, reason: "API_BAD_RESPONSE" };
  const status = String(d.Status ?? "");
  const id = String(d.TransactionId ?? "");
  if (!status) return { ok: false, reason: "API_BAD_RESPONSE" };
  return { ok: true, status, id };
}

export async function ozowApiGetTransactionByReference(siteCode: string, ref: string, apiKey: string): Promise<ApiCheck> {
  if (!apiKey) return { ok: false, reason: "CONFIG" };
  const { ok, body } = await ozowApiGet(
    "/GetTransactionByReference",
    { siteCode, transactionReference: ref },
    apiKey
  );
  if (!ok) return { ok: false, reason: "API_UNREACHABLE" };
  let data: unknown;
  try { data = JSON.parse(body); } catch { return { ok: false, reason: "API_BAD_RESPONSE" }; }
  // by-reference can return an array of transactions; take the matching ref.
  if (Array.isArray(data)) {
    for (const tx of data as Array<Record<string, unknown>>) {
      if (String(tx.TransactionReference ?? "") === ref) {
        return { ok: true, status: String(tx.Status ?? ""), id: String(tx.TransactionId ?? "") };
      }
    }
    return { ok: false, reason: "NOT_FOUND" };
  }
  const d = data as Record<string, unknown> | null;
  if (d && typeof d === "object" && "Status" in d) {
    return { ok: true, status: String(d.Status ?? ""), id: String(d.TransactionId ?? "") };
  }
  return { ok: false, reason: "API_BAD_RESPONSE" };
}
