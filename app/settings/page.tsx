'use client';

import { useEffect, useState } from 'react';
import Topbar from '@/components/Topbar';

type SettingsResp = {
  ok?: boolean;
  companyName?: string;
  timezone?: string;
  slackWebhookUrl?: string;
  sheetCsvUrl?: string;
  summaryWebhookUrl?: string;
  brandWebhookUrls?: Record<string, string>;
  currencyCode?: string;
  error?: string;
};

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const [form, setForm] = useState({
    companyName: '',
    timezone: 'Asia/Kolkata',
    slackWebhookUrl: '',
    sheetCsvUrl: '',
    summaryWebhookUrl: '',
    brandWebhookUrlsText: '',
    currencyCode: 'USD',
  });

  // helpers
  function isSlackWebhook(url?: string) {
    if (!url) return false;
    try {
      const u = new URL(url);
      if (u.hostname !== 'hooks.slack.com') return false;
      const parts = u.pathname.split('/').filter(Boolean);
      return parts[0] === 'services' && parts.length === 4;
    } catch { return false; }
  }
  const slackConnected = isSlackWebhook(form.slackWebhookUrl);
  const summaryConnected = isSlackWebhook(form.summaryWebhookUrl);
  const canSave = form.companyName.trim().length > 0 && form.timezone.trim().length > 0;

  function mapToTextareaLines(map?: Record<string, string>) {
    if (!map) return '';
    const entries = Object.entries(map).filter(([k, v]) => k && v);
    if (!entries.length) return '';
    return entries.map(([k, v]) => `${k}=${v}`).join('\n');
  }

  async function loadSettings() {
    const res = await fetch('/api/settings', { cache: 'no-store' });
    const data: SettingsResp = await res.json();
    setForm({
      companyName: data.companyName || '',
      timezone: data.timezone || 'Asia/Kolkata',
      slackWebhookUrl: data.slackWebhookUrl || '',
      sheetCsvUrl: data.sheetCsvUrl || '',
      summaryWebhookUrl: data.summaryWebhookUrl || '',
      brandWebhookUrlsText: mapToTextareaLines(data.brandWebhookUrls),
      currencyCode: (data.currencyCode || 'USD').toUpperCase(),
    });
  }

  // load
  useEffect(() => {
    (async () => {
      try {
        await loadSettings();
      } catch {
        setMsg({ text: 'Failed to load settings', ok: false });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // save
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!canSave) return setMsg({ text: 'Company name and timezone are required.', ok: false });
    if (form.slackWebhookUrl.trim() && !slackConnected) return setMsg({ text: 'Global Slack webhook does not look valid.', ok: false });
    if (form.summaryWebhookUrl.trim() && !summaryConnected) return setMsg({ text: 'Summary Slack webhook does not look valid.', ok: false });

    setSaving(true);
    setMsg(null);
    try {
      const payload = {
        companyName: form.companyName,
        timezone: form.timezone,
        slackWebhookUrl: form.slackWebhookUrl,
        sheetCsvUrl: form.sheetCsvUrl,
        summaryWebhookUrl: form.summaryWebhookUrl,
        brandWebhookUrlsText: form.brandWebhookUrlsText,
        currencyCode: form.currencyCode.toUpperCase(),
      };
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const j: any = await res.json().catch(() => ({}));
      if (!res.ok || !j?.ok) {
        setMsg({ text: j?.error || 'Save failed', ok: false });
      } else {
        setMsg({ text: 'Saved ✓', ok: true });
        // re-load to reflect normalized/uppercased server values
        await loadSettings();
      }
    } catch (e: any) {
      setMsg({ text: e?.message || 'Save failed', ok: false });
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
                placeholder="Acme Inc."
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

            {/* Currency */}
            <div>
              <label className="block text-xs mb-1 text-neutral-600">Currency</label>
              <select
                value={form.currencyCode}
                onChange={(e) => setForm({ ...form, currencyCode: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-sm"
              >
                {['USD','INR','EUR','GBP','AUD','CAD','SGD','AED'].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <p className="mt-1 text-[11px] text-neutral-500">Used for budgets, projections, and spend.</p>
            </div>
          </section>

          {/* Slack (Global) */}
          <section className="rounded-2xl border border-neutral-200 bg-white/70 p-5 shadow-sm backdrop-blur space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium">Slack (Global)</h2>
              <span className="inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px]">
                <span className={`inline-block h-2 w-2 rounded-full ${slackConnected ? 'bg-emerald-500' : 'bg-neutral-400'}`} />
                <span className={slackConnected ? 'text-emerald-700' : 'text-neutral-600'}>
                  {slackConnected ? 'Connected' : 'Not connected'}
                </span>
              </span>
            </div>

            <p className="text-xs text-neutral-600">
              Paste an incoming webhook to receive digests/alerts in your Slack (company-wide).
            </p>

            <input
              value={form.slackWebhookUrl}
              onChange={(e) => setForm({ ...form, slackWebhookUrl: e.target.value })}
              placeholder="https://hooks.slack.com/services/T000/B000/XXXX"
              className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-sm"
            />

            {!slackConnected && form.slackWebhookUrl.trim() && (
              <p className="text-[11px] text-amber-700">
                This doesn’t look like a Slack webhook. Expected format:
                <code> https://hooks.slack.com/services/T.../B.../...</code>
              </p>
            )}
          </section>

          {/* Slack Routing + Tester */}
          <section className="rounded-2xl border border-neutral-200 bg-white/70 p-5 shadow-sm backdrop-blur space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-sm font-medium">Slack Routing</h2>
              <span className="inline-flex w-max items-center gap-1 self-start rounded-full border px-2 py-1 text-[11px] sm:self-auto">
                <span className={`inline-block h-2 w-2 rounded-full ${summaryConnected ? 'bg-emerald-500' : 'bg-neutral-400'}`} />
                <span className={summaryConnected ? 'text-emerald-700' : 'text-neutral-600'}>
                  {summaryConnected ? 'Summary set' : 'Summary not set'}
                </span>
              </span>
            </div>

            <div className="space-y-2">
              <label className="block text-xs text-neutral-600">Summary webhook (daily/weekly)</label>
              <input
                value={form.summaryWebhookUrl}
                onChange={(e) => setForm({ ...form, summaryWebhookUrl: e.target.value })}
                placeholder="https://hooks.slack.com/services/T000/B000/XXXX"
                className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-sm"
              />
              {!summaryConnected && form.summaryWebhookUrl.trim() && (
                <p className="text-[11px] text-amber-700">
                  This doesn’t look like a Slack webhook. Expected format:
                  <code> https://hooks.slack.com/services/T.../B.../...</code>
                </p>
              )}
              <p className="text-[11px] text-neutral-600">
                If set, the daily/weekly summary always posts here (overrides global).
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-xs text-neutral-600">Brand webhooks (one per line)</label>
              <textarea
                rows={6}
                value={form.brandWebhookUrlsText}
                onChange={(e) => setForm({ ...form, brandWebhookUrlsText: e.target.value })}
                placeholder={`BrandA=https://hooks.slack.com/services/AAA/BBB/CCC\nBrandB=https://hooks.slack.com/services/DDD/EEE/FFF`}
                className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-sm font-mono"
              />
              <p className="text-[11px] text-neutral-600">
                Format: <span className="font-mono">Brand=SlackWebhookURL</span> (one per line). Commas or pipes also work.
              </p>
            </div>

            <div className="h-px w-full bg-neutral-200/70"></div>
            <SlackTestUnified
              hasGlobal={Boolean(form.slackWebhookUrl && form.slackWebhookUrl.trim())}
              hasSummary={Boolean(form.summaryWebhookUrl && form.summaryWebhookUrl.trim())}
              brands={parseBrands(form.brandWebhookUrlsText)}
            />
          </section>

          {/* Email */}
          <section className="rounded-2xl border border-neutral-200 bg-white/70 p-5 shadow-sm backdrop-blur space-y-3">
            <h2 className="text-sm font-medium">Email</h2>
            <p className="text-xs text-neutral-600">Send yourself a sample digest email to confirm email is working.</p>
            <SendEmailTest />
          </section>

          {/* Data source */}
          <section className="rounded-2xl border border-neutral-200 bg-white/70 p-5 shadow-sm backdrop-blur space-y-3">
            <h2 className="text-sm font-medium">Data source (Phase 1)</h2>
            <p className="text-xs text-neutral-600">
              Use a per-company CSV until ad OAuth is ready. Must have headers <code>id,text,severity,updatedAt</code>.
            </p>
            <input
              value={form.sheetCsvUrl}
              onChange={(e) => setForm({ ...form, sheetCsvUrl: e.target.value })}
              placeholder="https://…"
              className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-sm"
            />
          </section>

          {/* Save */}
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={saving || !canSave}
              className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white shadow hover:brightness-110 disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
            {msg && (
              <span className={`text-sm ${msg.ok ? 'text-emerald-700' : 'text-rose-700'}`}>
                {msg.text}
              </span>
            )}
          </div>
        </form>
      </div>
    </main>
  );
}

/* ---------- helpers + testers ---------- */

function parseBrands(text: string): string[] {
  return (text || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const [brand] = line.split(/=|,|\|/).map((s) => s.trim());
      return brand || '';
    })
    .filter(Boolean);
}

function SlackTestUnified({
  hasGlobal,
  hasSummary,
  brands,
}: {
  hasGlobal: boolean;
  hasSummary: boolean;
  brands: string[];
}) {
  const [target, setTarget] = useState<'global' | 'summary' | 'brand'>(() => {
    if (hasGlobal) return 'global';
    if (hasSummary) return 'summary';
    return brands.length ? 'brand' : 'global';
  });
  const [brand, setBrand] = useState<string>(brands[0] || '');
  const [sending, setSending] = useState(false);
  const [note, setNote] = useState<string>('');

  useEffect(() => {
    if (brands.length && !brands.includes(brand)) setBrand(brands[0]);
    if (!brands.length && target === 'brand') setTarget(hasSummary ? 'summary' : 'global');
  }, [brands, brand, target, hasSummary]);

  async function send() {
    setSending(true);
    setNote('');
    try {
      const r = await fetch('/api/slack/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(target === 'brand' ? { target, brand } : { target }),
      });
      const j = await r.json().catch(() => ({} as any));
      if ((j as any)?.ok) setNote('Sent ✓ Check your Slack channel.');
      else setNote((j as any)?.error || 'Failed to send test.');
    } catch (e: any) {
      setNote(e?.message || 'Failed to send test.');
    } finally {
      setSending(false);
    }
  }

  const nothingConfigured = !hasGlobal && !hasSummary && brands.length === 0;

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      {/* Left: selectors */}
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-xs text-neutral-600">Send test to</label>
        <select
          className="rounded-lg border border-neutral-300 bg-white px-2 py-1 text-sm"
          value={target}
          onChange={(e) => setTarget(e.target.value as any)}
        >
          <option value="global" disabled={!hasGlobal}>
            Global {hasGlobal ? '' : '(not set)'}
          </option>
          <option value="summary" disabled={!hasSummary}>
            Summary {hasSummary ? '' : '(not set)'}
          </option>
          <option value="brand" disabled={!brands.length}>
            Brand {brands.length ? '' : '(none)'}
          </option>
        </select>

        {target === 'brand' && (
          <select
            className="rounded-lg border border-neutral-300 bg-white px-2 py-1 text-sm"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
          >
            {brands.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Right: action + note */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={send}
          disabled={sending || nothingConfigured}
          className="rounded-xl bg-black px-3 py-2 text-sm font-semibold text-white shadow hover:brightness-110 disabled:opacity-60"
        >
          {sending ? 'Sending…' : 'Send test to Slack'}
        </button>
        {note && <span className="text-sm text-neutral-600">{note}</span>}
      </div>
    </div>
  );
}

function SendEmailTest() {
  const [sending, setSending] = useState(false);
  const [note, setNote] = useState<string>('');

  async function send() {
    setSending(true);
    setNote('');
    try {
      const r = await fetch('/api/email/test', { method: 'POST' });
      const j = await r.json().catch(() => ({}));
      if (j?.ok) setNote('Sent ✓ Check your inbox.');
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
        {sending ? 'Sending…' : 'Send test email'}
      </button>
      {note && <span className="text-sm text-neutral-600">{note}</span>}
    </div>
  );
}
