/** Settings table access — parity with setting()/setting_save(). */
import { sb } from "./db";

export const SETTING_DEFAULTS: Record<string, string> = {
  ozow_site_code: "",
  ozow_test_mode: "1",
  allow_guest_lookup: "1",
  download_limit: "5",
  link_expiry_hours: "72",
  cta_title: "Master your mindset, master your life.",
  cta_text: "Practical digital workbooks, toolkits and guides by Conscious Mind Concepts. Instant download after payment.",
  cta_button: "Browse the store",
};

export async function getSetting(key: string, fallback = ""): Promise<string> {
  const { data } = await sb().from("settings").select("value").eq("key", key).maybeSingle();
  return (data?.value as string) ?? SETTING_DEFAULTS[key] ?? fallback;
}

export async function getSettings(keys: string[]): Promise<Record<string, string>> {
  const { data } = await sb().from("settings").select("key,value").in("key", keys);
  const out: Record<string, string> = {};
  for (const k of keys) out[k] = SETTING_DEFAULTS[k] ?? "";
  for (const row of data ?? []) out[row.key as string] = row.value as string;
  return out;
}

export async function saveSetting(key: string, value: string): Promise<void> {
  await sb().from("settings").upsert({ key, value }, { onConflict: "key" });
}

export function settingBool(v: string | undefined): boolean {
  return v === "1" || v === "true";
}
