'use client';

import { useEffect, useState } from 'react';
import Topbar from '@/components/Topbar';

type SettingsResp = {
  ok?: boolean;
  companyName?: string;
  timezone?: string;
  slackWebhookUrl?: string;
  sheetCsvUrl?: string;
  error?: string;
};

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [form, setForm] = useState({
    companyName: '',
    timezone: 'Asia/Kolkata',
    slackWebhookUrl: '',
    sheetCsvUrl: '',
  });

  // --- helpers ---
  function isSlackWebhook(url?: string) {
    if (!url) return false;
    try {
      const u = new URL(url);
      if (u.hostname !== 'hooks.slack.com') return false;
      const parts = u.pathname.split('/').filter(Boolean); // ['services','T...','B...','...']
      return parts[0] === 'services' && parts.length === 4;
    } catch {
      return false;
    }
  }
  const slackConnected = isSlackWebhook(form.slackWebhookUrl);

  // --- load settings ---
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/settings', { cache: 'no-store' });
        const data: SettingsResp = await res.json();
        if (data) {
          setForm({
            companyName: data.companyName || '',
            timezone: data.timezone || 'Asia/Kolkata',
            slackWebhookUrl: data.slackWebhookUrl || '',
            sheetCsvUrl: data.sheetCsvUrl || '',
          });
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // --- save settings ---
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const j = await res.json().catch(() => ({}));
      setMsg(j?.ok ? 'Saved ✓' : j?.error || 'Save failed');
    } catch (e: any) {
      setMsg(e?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-neutral-50 to-white">
        <Topbar email={undefined} />
        <div className="flex justify-center py-20 text-sm text-neutral-500">Loading settings…</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-neutral-50 to-white">
      <Topbar email={undefined} />

      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-10 space-y-6">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
          <p className="text-sm text-neutral-600">Manage your company profile and integrations.</p>
        </header>

        <form onSubmit={save} className="space-y-6">
          {/* Company */}
          <section className="rounded-2xl border border-neutral-200 bg-white/70 p-5 shadow-sm backdrop-blur space-y-3">
            <h2 className="text-sm font-medium">Company</h2>
            <div>
              <label className="block text-xs mb-1 text-neutral-600">Company name</label>
              <input
                value={form.companyName}
                onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs mb-1 text-neutral-600">Timezone</label>
              <select
                value={form.timezone}
                onChange={(e) => setForm({ ...form, timezone: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-sm"
              >
                <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                <option value="UTC">UTC</option>
                <option value="America/Los_Angeles">America/Los_Angeles (PT)</option>
                <option value="America/New_York">America/New_York (ET)</option>
                <option value="Europe/London">Europe/London (UK)</option>
              </select>
            </div>
          </section>

          {/* Slack */}
          <section className="rounded-2xl border border-neutral-200 bg-white/70 p-5 shadow-sm backdrop-blur space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium">Slack</h2>

              {/* Status pill */}
              <span className="inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px]">
                <span
                  className={`inline-block h-2 w-2 rounded-full ${
                    slackConnected ? 'bg-emerald-500' : 'bg-neutral-400'
                  }`}
                />
                <span className={slackConnected ? 'text-emerald-700' : 'text-neutral-600'}>
                  {slackConnected ? 'Connected' : 'Not connected'}
                </span>
              </span>
            </div>

            <p className="text-xs text-neutral-600">
              Paste an incoming webhook URL to receive digests/alerts in your Slack.
            </p>

            <input
              value={form.slackWebhookUrl}
              onChange={(e) => setForm({ ...form, slackWebhookUrl: e.target.value })}
              placeholder="https://hooks.slack.com/services/T000/B000/XXXX"
              className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-sm"
            />

            {/* gentle validation hint */}
            {!slackConnected && form.slackWebhookUrl.trim() && (
              <p className="text-[11px] text-amber-700">
                This doesn’t look like a Slack webhook. Expected format:
                <code> https://hooks.slack.com/services/T.../B.../...</code>
              </p>
            )}

            {/* Send test button (only when connected) */}
            {slackConnected && <SendSlackTest />}
          </section>

          {/* Data source (Phase 1 CSV) */}
          <section className="rounded-2xl border border-neutral-200 bg-white/70 p-5 shadow-sm backdrop-blur space-y-3">
            <h2 className="text-sm font-medium">Data source (Phase 1)</h2>
            <p className="text-xs text-neutral-600">
              Use a per-company CSV until ad OAuth is ready. Must have headers{' '}
              <code>id,text,severity,updatedAt</code>.
            </p>
            <input
              value={form.sheetCsvUrl}
              onChange={(e) => setForm({ ...form, sheetCsvUrl: e.target.value })}
              placeholder="https://…"
              className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-sm"
            />
          </section>

          {/* Save button */}
          <div className="flex items-center gap-3">
            <button
              disabled={saving}
              className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white shadow hover:brightness-110 disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
            {msg && <span className="text-sm text-neutral-600">{msg}</span>}
          </div>
        </form>
      </div>
    </main>
  );
}

/* ---------- small client helper to send test to Slack ---------- */
function SendSlackTest() {
  const [sending, setSending] = useState(false);
  const [note, setNote] = useState<string>('');

  async function send() {
    setSending(true);
    setNote('');
    try {
      const r = await fetch('/api/slack/test', { method: 'POST' });
      const j = await r.json().catch(() => ({}));
      if (j?.ok) setNote('Sent ✓ Check your Slack channel.');
      else setNote(j?.error || 'Failed to send test.');
    } catch (e: any) {
      setNote(e?.message || 'Failed to send test.');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={send}
        disabled={sending}
        className="rounded-xl bg-black px-3 py-2 text-sm font-semibold text-white shadow hover:brightness-110 disabled:opacity-60"
      >
        {sending ? 'Sending…' : 'Send test to Slack'}
      </button>
      {note && <span className="text-sm text-neutral-600">{note}</span>}
    </div>
  );
}
