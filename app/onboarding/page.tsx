'use client';

import { useState } from "react";

export default function OnboardingPage() {
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/onboarding", {
      method: "POST",
      body: form,
    });
    if (res.ok) {
      window.location.href = "/dashboard";
    } else {
      const msg = await res.text();
      alert(msg || "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white">
      <form onSubmit={handleSubmit} className="w-full max-w-lg space-y-4 p-8 rounded-2xl bg-white/5 border border-white/10">
        <h1 className="text-2xl font-semibold">Let’s set up Shield Agent</h1>
        <p className="text-sm text-white/70">This takes ~30 seconds.</p>

        <div>
          <label className="block text-sm mb-1">Company name</label>
          <input name="companyName" required placeholder="Acme Inc." className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/15" />
        </div>

        <div>
          <label className="block text-sm mb-1">Timezone</label>
          <select name="timezone" required className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/15">
            <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
            <option value="UTC">UTC</option>
            <option value="America/Los_Angeles">America/Los_Angeles (PT)</option>
            <option value="America/New_York">America/New_York (ET)</option>
            <option value="Europe/London">Europe/London (UK)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm mb-1">Slack Webhook URL (optional)</label>
          <input name="slackWebhookUrl" placeholder="https://hooks.slack.com/services/…" className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/15" />
          <p className="text-xs text-white/50 mt-1">Used for alerts & daily digest.</p>
        </div>

        <button disabled={loading} className="w-full py-3 rounded-xl bg-white text-black font-medium hover:opacity-90 transition">
          {loading ? "Saving…" : "Finish onboarding"}
        </button>

        <button
          type="button"
          onClick={async () => {
            setLoading(true);
            const fd = new FormData();
            fd.set("skip", "1");
            await fetch("/api/onboarding", { method: "POST", body: fd });
            window.location.href = "/dashboard";
          }}
          className="w-full py-3 rounded-xl border border-white/20 text-white/90 hover:bg-white/10 transition"
        >
          Skip for now
        </button>
      </form>
    </div>
  );
}
