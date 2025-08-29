// app/dashboard/page.tsx
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';

import Topbar from '@/components/Topbar';
import RunJobsCard from '@/components/RunJobsCard';
import TrackingMonitorCard from '@/components/TrackingMonitorCard';
import SpendGuardrailCard from '@/components/SpendGuardrailCard';
import RecommendationsCard from '@/components/RecommendationsCard';

import {
  Bell,
  Clock as ClockIcon,
  Activity,
  Database,
  Mail,
  Server,
  Shield,
  AlertTriangle,
  CheckCircle,
  Flame,
  Target,
} from 'lucide-react';

// 👇 NEW: read active brand (from brandId cookie)
import { getActiveBrand } from '@/lib/brand';

/* ----------------------------- Types ----------------------------- */

type HealthResp = { db?: string; resend?: string; cron?: string };

type SettingsResp = {
  ok?: boolean;
  companyName?: string;
  timezone?: string;
  slackWebhookUrl?: string;
  summaryWebhookUrl?: string;
  brandWebhookUrls?: Record<string, string>;
  sheetCsvUrl?: string;
  currencyCode?: string; // <-- used as fallback
  error?: string;
};

type AlertItem = {
  id: string;
  text: string;
  severity: 'OK' | 'WARN' | 'CRIT';
  brand?: string;
  updatedAt?: string;
};

type AlertsResp = {
  ok: boolean;
  count: number;
  sample: AlertItem[];
};

type DigestPreviewResp =
  | {
      ok: true;
      summary?: { ok?: number; warn?: number; crit?: number };
      items?: Array<{ brand?: string; kind?: 'OK' | 'WARN' | 'CRIT'; title?: string; detail?: string }>;
      note?: string;
    }
  | { ok: false; error?: string };

/* ----------------------- Server Component ------------------------ */

export default async function DashboardPage() {
  // Auth & onboarding gate
  const session = await auth();
  if (!session?.user?.email) redirect('/signin');

  const user = await prisma.user.findUnique({
    where: { email: session.user.email! },
    select: { companyId: true },
  });
  if (!user?.companyId) redirect('/onboarding');

  // 👇 NEW: find the active brand for this user (from cookie, fallback to first)
  const brand = await getActiveBrand();

  // Fetch (relative URLs -> cookies forwarded automatically)
  const [settings, alerts, digestPreview, health] = await Promise.all([
    getJSON<SettingsResp>('/api/settings').catch(() => ({ ok: false } as SettingsResp)),
    getJSON<AlertsResp>('/api/alerts').catch(() => ({ ok: false, count: 0, sample: [] } as AlertsResp)),
    getJSON<DigestPreviewResp>('/api/digest?mock=1').catch(() => ({ ok: false } as DigestPreviewResp)),
    getJSON<HealthResp>('/api/health').catch(() => ({} as HealthResp)),
  ]);

  // Currency precedence: Brand → Settings → USD
  const currency = (brand?.currencyCode || settings?.currencyCode || 'USD').toUpperCase();

  // Coverage / routing
  const brands = Object.keys(settings?.brandWebhookUrls || {});
  const coverage = {
    global: Boolean(settings?.slackWebhookUrl),
    summary: Boolean(settings?.summaryWebhookUrl),
    brands: brands.length > 0,
  };
  const routingOK = coverage.global && coverage.summary && coverage.brands;

  // Alerts summary
  const totalAlerts = clampInt(alerts?.count, 0);
  const critAlerts = (alerts?.sample || []).filter((a) => a.severity === 'CRIT').length;

  // Digest summary (best-effort)
  const sOk = digestPreview?.ok ? digestPreview.summary?.ok ?? 0 : 0;
  const sWarn = digestPreview?.ok ? digestPreview.summary?.warn ?? 0 : 0;
  const sCrit = digestPreview?.ok ? digestPreview.summary?.crit ?? 0 : critAlerts;
  const digestItems = sOk + sWarn + sCrit;

  // “No-crit streak” estimate (hours)
  const streakHours = estimateNoCritStreakHours(alerts?.sample || []);
  const streaks = {
    critFreeDays: streakHours >= 24 ? Math.floor(streakHours / 24) : 0,
    onBudgetDays: 0,
    checkinDays: 0,
  };

  /* ------------------------------ UI ------------------------------ */

  return (
    <main className="min-h-screen bg-gradient-to-b from-neutral-50 to-white">
      <Topbar email={session.user.email} />

      {/* HERO: Status + KPIs with breathing room */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="relative overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-neutral-200">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_80%_at_100%_0%,rgba(0,0,0,0.06),transparent_60%)]" />
          <div className="relative z-10 p-6 sm:p-7">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <StatusDot ok={routingOK && critAlerts === 0} />
                <h1 className="text-[16px] font-semibold tracking-tight">
                  {routingOK && critAlerts === 0 ? 'All systems go' : 'Action required'}
                </h1>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-neutral-500">
                <Shield className="h-3.5 w-3.5" />
                {new Date().toLocaleString()}
              </div>
            </div>

            {/* KPIs */}
            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <KPI
                label="Critical alerts (CRIT)"
                value={formatInt(critAlerts)}
                tone={critAlerts > 0 ? 'danger' : 'good'}
                sub={critAlerts > 0 ? 'Investigate now' : 'None detected'}
                icon={critAlerts > 0 ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
              />
              <KPI
                label="Routing coverage"
                value={`${Math.round(
                  ((Number(coverage.global) + Number(coverage.summary) + Number(coverage.brands)) / 3) * 100
                )}%`}
                sub={routingOK ? 'Global • Summary • Brands' : 'Connect Global, Summary & Brand webhooks'}
                tone={routingOK ? 'good' : 'warn'}
              />
              <KPI
                label="Digest items (today)"
                value={formatInt(digestItems)}
                sub={`${sOk} OK • ${sWarn} WARN • ${sCrit} CRIT`}
              />
            </div>

            {/* Streak band */}
            <div className="mt-6 rounded-xl border border-neutral-200 bg-white/70 p-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <StreakBand
                  icon={<Flame className="h-3.5 w-3.5 text-emerald-600" />}
                  label="CRIT-free"
                  days={streaks.critFreeDays}
                  tone={streaks.critFreeDays > 0 ? 'good' : 'neutral'}
                />
                <StreakBand
                  icon={<Target className="h-3.5 w-3.5 text-sky-600" />}
                  label="On-budget"
                  days={streaks.onBudgetDays}
                  tone={streaks.onBudgetDays > 0 ? 'good' : 'neutral'}
                />
                <StreakBand
                  icon={<ClockIcon className="h-3.5 w-3.5 text-violet-600" />}
                  label="Daily check-in"
                  days={streaks.checkinDays}
                  tone={streaks.checkinDays > 0 ? 'good' : 'neutral'}
                />
              </div>
            </div>

            {!routingOK && (
              <p className="mt-4 text-[12px] text-neutral-600">
                Next: connect <u>Global Slack</u>, <u>Summary channel</u> and at least <u>one Brand webhook</u> in
                Settings → Slack Routing.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* PRIMARY: Tracking + Spend */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 grid grid-cols-1 gap-6 lg:grid-cols-2 items-stretch pb-2">
        <TrackingMonitorCard />
        {/* Pass currency resolved from Brand (fallback to Settings) */}
        <SpendGuardrailCard currencyCode={currency} />
      </section>

      {/* RECOMMENDATIONS */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        {/* Pass currency resolved from Brand (fallback to Settings) */}
        <RecommendationsCard currencyCode={currency} />
      </section>

      {/* SECONDARY: Recent Alerts + Digest Preview */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card title="Recent alerts" right={<Bell className="h-4 w-4 text-rose-500" />}>
          <AlertsList alerts={alerts?.sample || []} />
        </Card>
        <Card title="Digest preview" right={<ClockIcon className="h-4 w-4 text-sky-500" />}>
          {digestPreview?.ok && (digestPreview.items?.length || 0) > 0 ? (
            <ul className="mt-2 space-y-2">
              {digestPreview.items!.slice(0, 6).map((it, i) => (
                <li key={i} className="rounded-xl border border-neutral-200 bg-white/60 px-3 py-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="text-sm">
                      <span className="font-medium">{it.brand || 'General'}</span>{' '}
                      <span className="text-neutral-700">— {it.title || it.kind}</span>
                      {it.detail ? <div className="text-[11px] text-neutral-500">{it.detail}</div> : null}
                    </div>
                    <SeverityChip sev={(it.kind || 'OK') as 'OK' | 'WARN' | 'CRIT'} />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-1 text-sm text-neutral-500">No preview available.</div>
          )}
        </Card>
      </section>

      {/* ACTIONS */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <h3 className="mb-4 text-sm font-medium text-neutral-700">Take action now</h3>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <RunJobsCard
            variant="alerts"
            title="Alerts"
            description="Preview or send brand-routed alerts to Slack."
            icon={<Activity className="h-5 w-5" />}
          />
          <RunJobsCard
            variant="digest"
            title="Daily Digest"
            description="Preview or send today’s summary to your Summary channel."
            icon={<ClockIcon className="h-5 w-5" />}
          />
        </div>
      </section>

      {/* SYSTEM HEALTH */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-12">
        <h3 className="mb-3 text-sm font-medium text-neutral-700">System health</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <SystemItem label="Database" icon={<Database className="h-3.5 w-3.5" />} ok={health?.db === 'ok'} />
          <SystemItem label="Email" icon={<Mail className="h-3.5 w-3.5" />} ok={health?.resend === 'ok'} />
          <SystemItem label="Cron" icon={<Server className="h-3.5 w-3.5" />} ok={health?.cron === 'ok'} />
        </div>
      </section>

      <footer className="border-t bg-white/60">
        <div className="mx-auto max-w-7xl px-4 py-6 text-center text-xs text-neutral-500">
          © {new Date().getFullYear()} GrowthAgents.io — All rights reserved.
        </div>
      </footer>
    </main>
  );
}

/* ---------------------------- Helpers ---------------------------- */

async function getJSON<T>(url: string): Promise<T> {
  const r = await fetch(url, { cache: 'no-store' });
  if (!r.ok) throw new Error(`GET ${url} failed`);
  return (await r.json()) as T;
}

function clampInt(n: any, fallback = 0) {
  const x = Number(n);
  return Number.isFinite(x) ? Math.max(0, Math.floor(x)) : fallback;
}

function formatInt(n: number) {
  try {
    return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(n);
  } catch {
    return `${n}`;
  }
}

function formatWhen(s?: string) {
  if (!s) return '';
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/** Estimate "no-crit streak (hours)" from recent alert timestamps. */
function estimateNoCritStreakHours(sample: AlertItem[]) {
  if (!sample?.length) return 0;
  const now = Date.now();
  const horizonMs = 1000 * 60 * 60 * 12; // 12h
  const recent = sample.filter((a) => a.updatedAt && now - new Date(a.updatedAt).getTime() <= horizonMs);
  const hasRecentCrit = recent.some((a) => a.severity === 'CRIT');
  if (!hasRecentCrit) {
    const oldest = recent.sort((a, b) => (a.updatedAt! < b.updatedAt! ? -1 : 1))[0];
    if (!oldest?.updatedAt) return 1;
    const hrs = Math.max(1, Math.floor((now - new Date(oldest.updatedAt).getTime()) / (1000 * 60 * 60)));
    return Math.min(12, hrs);
  }
  return 0;
}

/* ---------------------------- UI Bits ---------------------------- */

function StatusDot({ ok }: { ok: boolean }) {
  const color = ok ? 'bg-emerald-500' : 'bg-rose-500';
  return <span aria-hidden className={`inline-block h-1.5 w-1.5 rounded-full ${color} animate-pulse`} />;
}

function KPI({
  label,
  value,
  sub,
  tone = 'neutral',
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: 'good' | 'warn' | 'danger' | 'neutral';
  icon?: React.ReactNode;
}) {
  const toneBg =
    tone === 'good'
      ? 'bg-emerald-50 ring-emerald-100'
      : tone === 'warn'
      ? 'bg-amber-50 ring-amber-100'
      : tone === 'danger'
      ? 'bg-rose-50 ring-rose-100'
      : 'bg-neutral-50 ring-neutral-100';
  const toneText =
    tone === 'good'
      ? 'text-emerald-700'
      : tone === 'warn'
      ? 'text-amber-700'
      : tone === 'danger'
      ? 'text-rose-700'
      : 'text-neutral-900';

  return (
    <div className={`rounded-xl ${toneBg} ring-1 px-4 py-4`}>
      <div className="flex items-center justify-between">
        <div className="text-[12px] text-neutral-600">{label}</div>
        {icon}
      </div>
      <div className={`mt-1 text-[20px] font-semibold tracking-tight ${toneText}`}>{value}</div>
      {sub ? <div className="mt-0.5 text-[11px] text-neutral-500">{sub}</div> : null}
    </div>
  );
}

function StreakBand({
  icon,
  label,
  days,
  tone = 'neutral',
}: {
  icon: React.ReactNode;
  label: string;
  days: number;
  tone?: 'good' | 'neutral';
}) {
  const dots = 5;
  const filled = Math.max(0, Math.min(dots, days % (dots + 1)));
  return (
    <div className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white/80 px-3 py-2">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-[12px] text-neutral-600">{label}</span>
      </div>
      <div className="flex items-center gap-1">
        {Array.from({ length: dots }).map((_, i) => (
          <span
            key={i}
            className={`inline-block rounded-full ${i < filled ? (tone === 'good' ? 'bg-emerald-500' : 'bg-neutral-400') : 'bg-neutral-200'}`}
            style={{ width: 6, height: 6 }}
          />
        ))}
        <span className={`ml-2 text-[12px] ${tone === 'good' ? 'text-emerald-700' : 'text-neutral-700'}`}>{days}d</span>
      </div>
    </div>
  );
}

function Card({
  title,
  right,
  children,
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-white/90 p-6 shadow-sm ring-1 ring-neutral-200 backdrop-blur">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium">{title}</h2>
        {right}
      </div>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function SeverityChip({ sev }: { sev: 'OK' | 'WARN' | 'CRIT' }) {
  const map = {
    OK: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    WARN: 'bg-amber-100 text-amber-700 border-amber-200',
    CRIT: 'bg-rose-100 text-rose-700 border-rose-200',
  } as const;
  return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] ${map[sev]}`}>{sev}</span>;
}

function AlertsList({ alerts }: { alerts: AlertItem[] }) {
  if (!alerts?.length) {
    return <div className="mt-1 text-sm text-neutral-500">No alerts to show yet.</div>;
  }
  return (
    <ul className="divide-y divide-neutral-200/70">
      {alerts.slice(0, 7).map((a) => (
        <li key={a.id} className="py-2.5 flex items-start gap-3">
          <SeverityDot sev={a.severity} />
          <div className="flex-1">
            <div className="text-sm">
              <span className="font-medium">{a.brand || 'General'}</span> — {a.text}
            </div>
            <div className="text-[11px] text-neutral-500">{formatWhen(a.updatedAt)}</div>
          </div>
        </li>
      ))}
    </ul>
  );
}

function SeverityDot({ sev }: { sev: 'OK' | 'WARN' | 'CRIT' }) {
  const color = sev === 'CRIT' ? 'bg-rose-500' : sev === 'WARN' ? 'bg-amber-500' : 'bg-emerald-500';
  return <span className={`mt-1 inline-block h-1.5 w-1.5 rounded-full ${color}`} />;
}

function SystemItem({
  label,
  icon,
  ok,
}: {
  label: string;
  icon: React.ReactNode;
  ok: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-white/70 px-3 py-2 ring-1 ring-neutral-200">
      <div className="flex items-center gap-2 text-xs text-neutral-700">
        {icon}
        {label}
      </div>
      <StatusDot ok={ok} />
    </div>
  );
}
