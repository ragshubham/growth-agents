'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Topbar from '@/components/Topbar';
import { Slack, Megaphone, Globe, BarChart3, ShoppingBag, CheckCircle2, Circle } from 'lucide-react';

type SettingsResp = {
  ok: boolean;
  companyId?: string | null;
  companyName?: string;
  timezone?: string;
  slackWebhookUrl?: string;
  sheetCsvUrl?: string;
  error?: string;
};

export default function IntegrationsPage() {
  const [data, setData] = useState<SettingsResp | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/settings', { cache: 'no-store' });
        const j = await r.json();
        setData(j);
      } catch {
        setData({ ok: false, error: 'Failed to load settings' });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const slackConnected = !!data?.slackWebhookUrl;
  const csvConfigured = !!data?.sheetCsvUrl; // Phase 1 source for Google/Meta

  return (
    <main className="min-h-screen bg-gradient-to-b from-neutral-50 to-white">
      <Topbar email={undefined} />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight">Integrations</h1>
          <p className="text-sm text-neutral-600">
            Connect your tools. Slack works today. Google &amp; Meta use the CSV source in Settings (OAuth coming soon).
          </p>
        </header>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <IntegrationCard
            icon={<Slack className="h-5 w-5" />}
            name="Slack"
            desc="Send alerts to your team instantly."
            status={slackConnected ? 'Connected' : 'Not connected'}
            statusType={slackConnected ? 'ok' : 'off'}
            action={
              <Link href="/settings" className="inline-flex items-center justify-center rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white shadow hover:brightness-110">
                {slackConnected ? 'Configure' : 'Connect'}
              </Link>
            }
          />

          <IntegrationCard
            icon={<Globe className="h-5 w-5" />}
            name="Google Ads"
            desc="Budget pacing, CPC & conversions."
            status={csvConfigured ? 'Using CSV source' : 'Not connected'}
            statusType={csvConfigured ? 'warn' : 'off'}
            action={
              <Link href="/settings" className="inline-flex items-center justify-center rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white shadow hover:brightness-110">
                {csvConfigured ? 'Configure source' : 'Use CSV source'}
              </Link>
            }
            note="OAuth coming soon"
          />

          <IntegrationCard
            icon={<Megaphone className="h-5 w-5" />}
            name="Meta Ads"
            desc="Creative fatigue & ROAS drops."
            status={csvConfigured ? 'Using CSV source' : 'Not connected'}
            statusType={csvConfigured ? 'warn' : 'off'}
            action={
              <Link href="/settings" className="inline-flex items-center justify-center rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white shadow hover:brightness-110">
                {csvConfigured ? 'Configure source' : 'Use CSV source'}
              </Link>
            }
            note="OAuth coming soon"
          />

          <IntegrationCard
            icon={<BarChart3 className="h-5 w-5" />}
            name="GA4"
            desc="Site analytics for true north KPIs."
            status="Coming soon"
            statusType="soon"
            disabled
          />

          <IntegrationCard
            icon={<ShoppingBag className="h-5 w-5" />}
            name="Shopify"
            desc="Revenue + orders for blended ROAS."
            status="Coming soon"
            statusType="soon"
            disabled
          />
        </section>

        {!loading && !data?.ok && (
          <p className="text-sm text-red-600">Failed to load settings. Make sure you’re signed in.</p>
        )}
      </div>
    </main>
  );
}

/* ---------------- UI bits ---------------- */

function IntegrationCard({
  icon,
  name,
  desc,
  status,
  statusType,
  action,
  note,
  disabled,
}: {
  icon: React.ReactNode;
  name: string;
  desc: string;
  status: string;
  statusType: 'ok' | 'warn' | 'off' | 'soon';
  action?: React.ReactNode;
  note?: string;
  disabled?: boolean;
}) {
  const pill = {
    ok: { icon: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />, textClass: 'text-emerald-700' },
    warn: { icon: <Circle className="h-3.5 w-3.5 text-amber-500" />, textClass: 'text-amber-700' },
    off: { icon: <Circle className="h-3.5 w-3.5 text-neutral-400" />, textClass: 'text-neutral-600' },
    soon: { icon: <Circle className="h-3.5 w-3.5 text-neutral-400" />, textClass: 'text-neutral-600' },
  }[statusType];

  return (
    <div className={`rounded-2xl border border-neutral-200 bg-white/70 p-5 shadow-sm backdrop-blur ${disabled ? 'opacity-70' : ''}`}>
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="text-sm font-medium">{name}</h3>
      </div>
      <p className="mt-2 text-sm text-neutral-600">{desc}</p>

      <div className="mt-3 inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px]">
        {pill.icon}
        <span className={pill.textClass}>{status}</span>
      </div>

      {note && <div className="mt-2 text-[11px] text-neutral-500">{note}</div>}

      <div className="mt-4">{!disabled && action}</div>
    </div>
  );
}
