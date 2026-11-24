/**
 * THE payment gate — exact port of includes/fulfil.php handle_gateway_result().
 * Every path (notification POST, redirect POST) goes through here:
 *   - transaction recorded (idempotent via unique key)
 *   - hash verified before this point by the caller
 *   - amount verified against the order row
 *   - status verified against Ozow's own API (anti-spoof)
 *   - PAID flips exactly once; fulfilment runs exactly once
 */
import { sb } from "./db";
import { getSetting } from "./settings";
import { ozowApiGetTransaction } from "./ozow";

const GATEWAY_TO_ORDER_STATUS: Record<string, string> = {
  complete: "PAID",
  cancelled: "CANCELLED",
  error: "FAILED",
};

export interface GatewayInput {
  posted: Record<string, string>;
  source: "notify" | "redirect";
  txIdField: string; // notification: TransactionId, redirect: TransactionId
  hashField: string; // notification: Hash, redirect: Hash
  privateKey: string;
  apiKey: string;
  testMode: boolean;
  ip: string;
}

export interface GatewayResult {
  ok: boolean;
  reason?: string;
  ref: string;
  duplicate?: boolean;
  order_status: string;
}

function cents(amount: string): number {
  return Math.round(parseFloat(amount) * 100);
}

export async function handleGatewayResult(input: GatewayInput): Promise<GatewayResult> {
  const { posted, hashField, privateKey } = input;
  const ref = (posted["TransactionReference"] ?? "").trim().toUpperCase();
  const txId = (input.posted[input.txIdField] ?? "").trim();
  const gwStatus = (posted["Status"] ?? "").trim();
  const amount = posted["Amount"] ?? "";
  const fail = (reason: string, orderStatus = "PROCESSING"): GatewayResult => ({
    ok: false, reason, ref, order_status: orderStatus,
  });

  if (!ref || !txId || !gwStatus) return fail("missing fields");

  // 1. hash check -----------------------------------------------------------
  if (!privateKey) return fail("hash mismatch");
  const { ozowHashValid } = await import("./ozow");
  if (!ozowHashValid(posted, hashField, privateKey)) return fail("hash mismatch");

  // 2. order lookup ---------------------------------------------------------
  const sbe = sb();
  const { data: order } = await sbe.from("orders").select("*").eq("ref", ref).maybeSingle();
  if (!order) return fail("unknown order ref");

  // 3. idempotency: record the hit, dedupe repeats ---------------------------
  const ins = await sbe.from("payments").insert({
    order_id: order.id,
    gateway: "ozow",
    transaction_id: txId,
    amount_cents: cents(amount),
    status: gwStatus,
    source: input.source,
    raw: JSON.stringify(posted),
    ip: input.ip,
  });
  if (ins.error) {
    const msg = ins.error.message || "";
    if (/duplicate|unique/i.test(msg)) {
      const { data: again } = await sbe.from("orders").select("status").eq("id", order.id).maybeSingle();
      return { ok: true, ref, duplicate: true, order_status: String(again?.status ?? order.status) };
    }
    throw ins.error;
  }

  // 4. amount check (money never comes from the payload alone) --------------
  const expected = order.total_cents as number;
  const received = cents(amount);
  if (received !== expected) {
    await sbe.from("orders").update({
      status: "PROCESSING",
      ozow_status_message: `amount mismatch: expected ${expected} got ${received}`,
    }).eq("id", order.id);
    return fail("amount mismatch");
  }

  // 5. status check against Ozow's API (server-to-server anti-spoof) --------
  const siteCode = await getSetting("ozow_site_code", "");
  const api = await ozowApiGetTransaction(siteCode, txId, input.apiKey);
  if (!api.ok && api.reason === "API_UNREACHABLE") {
    // Ozow unreachable: don't guess. Keep PROCESSING; notify can be replayed.
    await sbe.from("orders").update({
      status: "PROCESSING",
      ozow_status_message: "status API unreachable at notify time",
    }).eq("id", order.id);
    return fail("status API unreachable", "PROCESSING");
  }
  if (!api.ok) return fail(`status API refused (${api.reason})`);
  if (api.status.toLowerCase() !== gwStatus.toLowerCase()) {
    await sbe.from("orders").update({
      status: "PROCESSING",
      ozow_status_message: `status mismatch: gateway says ${gwStatus}, API says ${api.status}`,
    }).eq("id", order.id);
    return fail("status mismatch between payload and API");
  }
  if (api.status.toLowerCase() !== "complete") {
    // failed / cancelled / unknown — record truthfully, never deliver
    const map = GATEWAY_TO_ORDER_STATUS[api.status.toLowerCase()] ?? "PROCESSING";
    await sbe.from("orders").update({
      status: map,
      ozow_status_message: `gateway status: ${api.status}`,
    }).eq("id", order.id);
    return { ok: true, ref, order_status: map };
  }

  // 6. verified successful payment ------------------------------------------
  const { ozowStatusMessage, ...rest } = posted as Record<string, string> & { ozowStatusMessage?: string };
  const upd = await sbe.from("orders").update({
    status: "PAID",
    ozow_transaction_id: txId,
    ozow_status_message: String(posted["StatusMessage"] ?? ""),
    paid_at: new Date().toISOString(),
    test_mode: input.testMode,
  }).eq("id", order.id).neq("status", "PAID").select("id");
  if (!upd.data || upd.data.length === 0) {
    return { ok: true, ref, duplicate: true, order_status: "PAID" };
  }
  const { fulfilOrder } = await import("./fulfil");
  await fulfilOrder(order.id as number);
  return { ok: true, ref, order_status: "PAID" };
}
