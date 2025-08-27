'use client';

import { useEffect, useState } from "react";

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ companyName: "", timezone: "Asia/Kolkata", slackWebhookUrl: "" });

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/settings");
      const data = await res.json();
      setForm({
        companyName: data.companyName || "",
        timezone: data.timezone || "Asia/Kolkata",
        slackWebhookUrl: data.slackWebhookUrl || "",
      });
      setLoading(false);
    })();
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (!res.ok) return alert(await res.text());
    alert("Saved ✅");
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-white">Loading…</div>;

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white">
      <form onSubmit={save} className="w-full max-w-lg space-y-4 p-8 rounded-2xl bg-white/5 border border-white/10">
        <h1 className="text-2xl font-semibold">Settings</h1>

        <div>
          <label className="block text-sm mb-1">Company name</label>
          <input value={form.companyName} onChange={e=>setForm({...form, companyName:e.target.value})}
                 className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/15" />
        </div>

        <div>
          <label className="block text-sm mb-1">Timezone</label>
          <select value={form.timezone} onChange={e=>setForm({...form, timezone:e.target.value})}
                  className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/15">
            <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
            <option value="UTC">UTC</option>
            <option value="America/Los_Angeles">America/Los_Angeles (PT)</option>
            <option value="America/New_York">America/New_York (ET)</option>
            <option value="Europe/London">Europe/London (UK)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm mb-1">Slack Webhook URL</label>
          <input value={form.slackWebhookUrl} onChange={e=>setForm({...form, slackWebhookUrl:e.target.value})}
                 placeholder="https://hooks.slack.com/services/…" className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/15" />
        </div>

        <button disabled={saving} className="w-full py-3 rounded-xl bg-white text-black font-medium hover:opacity-90 transition">
          {saving ? "Saving…" : "Save changes"}
        </button>
      </form>
    </div>
  );
}
