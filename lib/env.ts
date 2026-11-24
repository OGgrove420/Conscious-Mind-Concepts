/**
 * Environment + store identity. Secrets NEVER live in code — they come from
 * Vercel env vars (and .env.local for local dev). Mirror of the PHP config.php
 * defaults so behaviour stays identical.
 */

function env(key: string, fallback = ""): string {
  const v = process.env[key];
  return v === undefined || v === "" ? fallback : v;
}

export const APP_DEBUG = env("APP_DEBUG", "0") === "1";

export const STORE_NAME = env("STORE_NAME", "CMC Growth Store");
export const STORE_COMPANY = env("STORE_COMPANY", "Conscious Mind Concepts (Pty) Ltd");
export const SITE_URL = rtrim(env("SITE_URL", "https://conscious-mind-concepts.vercel.app"));
export const MAIN_SITE_URL = rtrim(env("MAIN_SITE_URL", "https://conscious-mind-concepts.vercel.app"));
export const STORE_EMAIL_FROM = env("STORE_EMAIL_FROM", "store@consciousmindconcepts.co.za");
export const STORE_EMAIL_NAME = env("STORE_EMAIL_NAME", "CMC Growth Store");
export const STORE_SUPPORT_PHONE = env("STORE_SUPPORT_PHONE", "073 011 3925");
export const STORE_WHATSAPP = env("STORE_WHATSAPP", "27620604002");
export const STORE_CURRENCY = "ZAR";

export const OZOW_API_BASE = env("OZOW_API_BASE", "https://api.ozow.com");
export const OZOW_PAY_URL = env("OZOW_PAY_URL", "https://pay.ozow.com");

/** cmc_url() parity — build an absolute store URL from a store path. */
export function storeUrl(path = ""): string {
  return SITE_URL + path;
}

export function mainUrl(path = ""): string {
  return MAIN_SITE_URL + path;
}

/** Secrets the app refuses to run payment/fulfilment paths without. */
export function missingSecrets(): string[] {
  const need: Array<[string, string]> = [
    ["SUPABASE_URL", env("SUPABASE_URL") || env("NEXT_PUBLIC_SUPABASE_URL")],
    ["SUPABASE_SERVICE_KEY", env("SUPABASE_SERVICE_KEY")],
    ["SESSION_SECRET", env("SESSION_SECRET")],
    ["OZOW_PRIVATE_KEY", env("OZOW_PRIVATE_KEY")],
    ["OZOW_API_KEY", env("OZOW_API_KEY")],
  ];
  return need.filter(([, v]) => !v).map(([k]) => k);
}

function rtrim(s: string): string {
  return s.endsWith("/") ? s.slice(0, -1) : s;
}
