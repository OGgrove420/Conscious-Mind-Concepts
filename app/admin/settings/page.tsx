import { sb } from "@/lib/db";
import { zarCents } from "@/lib/format";
import SeedButtons from "@/components/SeedButtons";
import { missingSecrets } from "@/lib/env";
import { getSettings } from "@/lib/settings";
import SettingsForm from "@/components/SettingsForm";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const settings = await getSettings([
    "ozow_site_code",
    "ozow_test_mode",
    "allow_guest_lookup",
    "download_limit",
    "link_expiry_hours",
    "cta_title",
    "cta_text",
    "cta_button",
  ]);
  const missing = missingSecrets();
  const hasSiteCode = Boolean(settings.ozow_site_code);

  const checks: Array<[string, boolean]> = [
    ["SUPABASE_URL set", Boolean(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)],
    ["SUPABASE_SERVICE_KEY set", Boolean(process.env.SUPABASE_SERVICE_KEY)],
    ["SESSION_SECRET set", Boolean(process.env.SESSION_SECRET)],
    ["OZOW_PRIVATE_KEY in env", Boolean(process.env.OZOW_PRIVATE_KEY)],
    ["OZOW_API_KEY in env", Boolean(process.env.OZOW_API_KEY)],
    ["Ozow site code set", hasSiteCode],
    ["SMTP configured (emails send)", Boolean(process.env.SMTP_HOST && process.env.SMTP_USER)],
  ];

  return (
    <>
      <div className="section-head">
        <span className="eyebrow">Admin</span>
        <h1>Settings</h1>
      </div>
      <SettingsForm settings={settings} />

      <div className="panel" style={{ marginTop: 24 }}>
        <h2>Flagship products</h2>
        <p className="soft" style={{ fontSize: 13.5 }}>
          One click creates the five launch products (Mindset Reset R99 launch
          price included) as Coming Soon. They stay unpublishable until their
          real PDF is uploaded.
        </p>
        <SeedButtons />
      </div>

      <div className="panel" style={{ marginTop: 24 }}>
        <h2>Environment check</h2>
        <table className="tbl">
          <tbody>
            {checks.map(([label, ok]) => (
              <tr key={label}>
                <td>{label}</td>
                <td>
                  <span className={`status-pill ${ok ? "st-PAID" : "st-CANCELLED"}`}>
                    {ok ? "OK" : "missing"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {missing.length > 0 && (
          <p className="form-error" style={{ marginTop: 12 }}>
            Missing env vars: {missing.join(", ")}. Payment and fulfilment stay
            blocked until they are added on Vercel.
          </p>
        )}
      </div>
    </>
  );
}

