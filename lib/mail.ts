/**
 * Mail helper. SMTP credentials are not provisioned on this machine yet, so
 * sendMail() logs every message to mail_log with status 'failed' + reason and
 * fulfilment keeps working — the downloads still exist in the buyer's library.
 * As soon as SMTP_* env vars exist on Vercel, the same call sends for real.
 * No gateway transaction or entitlement is ever invented around mail.
 */
import { sb } from "./db";
import { STORE_EMAIL_FROM, STORE_EMAIL_NAME, STORE_SUPPORT_PHONE, storeUrl, MAIN_SITE_URL, STORE_WHATSAPP } from "./env";

export interface MailInput {
  to: string;
  subject: string;
  html: string;
  kind: string;
}

export async function sendMail(input: MailInput): Promise<{ sent: boolean; error?: string }> {
  const host = process.env.SMTP_HOST || "";
  const user = process.env.SMTP_USER || "";
  const pass = process.env.SMTP_PASS || "";
  if (!host || !user || !pass) {
    await logMail(input, "failed", "SMTP not configured (SMTP_HOST/SMTP_USER/SMTP_PASS missing)");
    return { sent: false, error: "SMTP not configured" };
  }
  try {
    const nodemailer = await import("nodemailer");
    const transport = nodemailer.createTransport({
      host,
      port: parseInt(process.env.SMTP_PORT || "587", 10),
      secure: process.env.SMTP_SECURE === "1",
      auth: { user, pass },
    });
    await transport.sendMail({
      from: `"${STORE_EMAIL_NAME}" <${STORE_EMAIL_FROM}>`,
      to: input.to,
      subject: input.subject,
      html: input.html,
    });
    await logMail(input, "sent", "");
    return { sent: true };
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e);
    await logMail(input, "failed", err);
    return { sent: false, error: err };
  }
}

async function logMail(input: MailInput, status: string, error: string): Promise<void> {
  if (!process.env.SUPABASE_SERVICE_KEY) return;
  await sb().from("mail_log").insert({
    to_email: input.to,
    subject: input.subject,
    body: input.html,
    status,
    error,
    kind: input.kind,
  });
}

export interface FulfilEmailEnt {
  title: string;
  entitlementId: number;
}

/** The fulfilment email — same copy and structure as send_fulfilment_email(). */
export async function sendFulfilmentEmail(
  order: { ref: string; email: string; first_name?: string | null; last_name?: string | null; total_cents: number; ozow_status_message?: string | null; customer_id?: number | null },
  created: FulfilEmailEnt[],
  mediaLinks: Array<{ title: string; url: string; expires: string; kind: string; verb: string }> = []
): Promise<void> {
  if (!created.length) return;
  const { issueDownloadLinks } = await import("./fulfil");
  const { getSetting } = await import("./settings");
  const expiry = parseInt(await getSetting("link_expiry_hours", "72"), 10) || 72;

  const { data: entRows } = await sb().from("entitlements")
    .select("id, products(title)").eq("order_id", order.ref ? order.ref : "").abortSignal(AbortSignal.timeout(1));
  void entRows;

  // entitlement rows fresh from db so links bind to ids
  const fresh = await sb().from("entitlements").select("id, products(title)").in(
    "id",
    created.map((c) => c.entitlementId)
  );
  const rows = (fresh.data ?? []).map((r: Record<string, unknown>) => ({
    id: r.id as number,
    product_title: ((r.products as { title?: string } | null)?.title) || "Your product",
  }));
  const links = await issueDownloadLinks(rows, expiry);

  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  const rowsHtml = links
    .map(
      (l) => `<tr><td style="padding:10px 0;border-bottom:1px solid #E2E8F0;">
<b>${esc(l.title)}</b><br>
<a href="${esc(l.url)}" style="color:#2563EB;">Download now</a>
<span style="color:#8996AC;font-size:12px;">(link valid ${esc(l.expires)})</span>
</td></tr>`
    )
    .join("");

  const mediaBlock = mediaLinks.length
    ? `<p style="color:#52607A;"><b>Your videos &amp; extra files:</b></p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${mediaLinks
        .map(
          (m) => `<tr><td style="padding:10px 0;border-bottom:1px solid #E2E8F0;">
<b>${esc(m.title)}</b> <span style="color:#8996AC;font-size:12px;">(${esc(m.kind.toUpperCase())})</span><br>
<a href="${esc(m.url)}" style="color:#2563EB;">${esc(m.verb)} now</a>
<span style="color:#8996AC;font-size:12px;">(valid ${esc(m.expires)})</span>
</td></tr>`
        )
        .join("")}</table>`
    : "";

  const name = `${order.first_name ?? ""} ${order.last_name ?? ""}`.trim();
  const greeting = name ? `Hi ${esc(name)},` : "Hi there,";
  const marker = "Newsletter freebie — no payment required";
  const opener =
    order.ozow_status_message === marker
      ? "Welcome to the CMC newsletter — here are your free downloads. Your order reference is"
      : order.total_cents === 0
        ? "Your free download is ready — enjoy. Your order reference is"
        : "Your payment was successful — thank you for investing in your growth. Your order reference is";

  const allowGuest = (await getSetting("allow_guest_lookup", "1")) === "1";
  const html = `${greeting}
    <p style="color:#52607A;">${opener}
    <b>${esc(order.ref)}</b>.</p>
    <p style="color:#52607A;"><b>Your downloads:</b></p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rowsHtml}</table>
    ${mediaBlock}
    <p style="color:#52607A;">Download links expire for security. You can always get fresh ones from
    <a href="${esc(storeUrl("/account"))}" style="color:#2563EB;">your library</a>${
      allowGuest ? " or by looking up your order with your email and reference" : ""
    }.</p>
    <p style="color:#52607A;">Questions? Reply to this email or WhatsApp us on ${STORE_SUPPORT_PHONE}.</p>
    <p style="color:#0F172A;"><b>Master your mindset, master your life.</b></p>`;

  await sendMail({
    to: order.email,
    subject: `Your CMC download is ready — order ${order.ref}`,
    html,
    kind: "fulfilment",
  });
}

export { MAIN_SITE_URL, STORE_WHATSAPP };
