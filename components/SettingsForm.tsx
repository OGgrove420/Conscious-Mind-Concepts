"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  settings: Record<string, string>;
}

export default function SettingsForm({ settings }: Props) {
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        const fd = new FormData(e.currentTarget);
        await fetch("/api/admin/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(Object.fromEntries(fd.entries())),
        });
        setBusy(false);
        setSaved(true);
        router.refresh();
      }}
      className="panel"
    >
      <input type="hidden" name="do" value="save" />
      <h2>Ozow payment gateway</h2>
      <div className="field" style={{ maxWidth: 320 }}>
        <label>Site code (from Ozow merchant admin)</label>
        <input name="ozow_site_code" defaultValue={settings.ozow_site_code ?? ""} />
      </div>
      <div style={{ display: "flex", gap: 22, flexWrap: "wrap", marginBottom: 14 }}>
        <label style={{ fontWeight: 500, display: "flex", gap: 8, alignItems: "center" }}>
          <input type="checkbox" name="ozow_test_mode" value="1" defaultChecked={settings.ozow_test_mode === "1"} style={{ width: "auto" }} />
          Test mode (IsTest=true)
        </label>
        <label style={{ fontWeight: 500, display: "flex", gap: 8, alignItems: "center" }}>
          <input type="checkbox" name="allow_guest_lookup" value="1" defaultChecked={settings.allow_guest_lookup === "1"} style={{ width: "auto" }} />
          Allow guest order lookup by reference + email
        </label>
      </div>
      <p className="soft" style={{ fontSize: 13 }}>
        Private key and API key are NOT stored here — they live only in the
        Vercel environment variables (OZOW_PRIVATE_KEY, OZOW_API_KEY). Never put
        them in this form or in git.
      </p>

      <h2 style={{ marginTop: 20 }}>Downloads</h2>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, maxWidth: 420 }}>
        <div className="field">
          <label>Downloads allowed per product purchase</label>
          <input type="number" name="download_limit" min={1} defaultValue={settings.download_limit ?? "5"} />
        </div>
        <div className="field">
          <label>Link expiry (hours)</label>
          <input type="number" name="link_expiry_hours" min={1} defaultValue={settings.link_expiry_hours ?? "72"} />
        </div>
      </div>

      <h2 style={{ marginTop: 20 }}>Home page panel</h2>
      <div className="field">
        <label>Title</label>
        <input name="cta_title" defaultValue={settings.cta_title ?? ""} />
      </div>
      <div className="field">
        <label>Text</label>
        <textarea name="cta_text" rows={2} defaultValue={settings.cta_text ?? ""} />
      </div>
      <div className="field" style={{ maxWidth: 320 }}>
        <label>Button label</label>
        <input name="cta_button" defaultValue={settings.cta_button ?? ""} />
      </div>

      {saved ? <div className="form-note">Settings saved.</div> : null}
      <button className="btn btn-primary" type="submit" disabled={busy}>
        {busy ? "Saving…" : "Save settings"}
      </button>
    </form>
  );
}
