'use client';

import { useEffect, useState } from 'react';
import { Activity, AlertTriangle, CheckCircle, RefreshCcw } from 'lucide-react';

type TrackingResp = {
  ok: boolean;
  pixelFiresLast2h?: number;      // total pixel events in last 2h
  checkoutFiresLast15m?: number;  // high-intent fires in last 15m
  ga4VsShopifyGapPct?: number;    // +12 means GA4 > Shopify by 12%
  metaVsShopifyGapPct?: number;   // -8 means Meta < Shopify by 8%
  lastCheckedISO?: string;
  error?: string;
};

export default function TrackingMonitorCard() {
  const [data, setData] = useState<TrackingResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  // Poll every 60s
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        const r = await fetch('/api/tracking/health', { cache: 'no-store' });
        const j: TrackingResp = r.ok ? await r.json() : { ok: false };
        if (mounted) setData(j);
      } catch {
        if (mounted) setData({ ok: false });
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    const id = setInterval(() => {
      setTick((t) => t + 1);
      load();
    }, 60_000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, []);

  const pixel = data?.pixelFiresLast2h ?? 0;
  const checkout = data?.checkoutFiresLast15m ?? 0;
  const ga4Gap = data?.ga4VsShopifyGapPct ?? 0;
  const metaGap = data?.metaVsShopifyGapPct ?? 0;
  const isHealthy =
    data?.ok && Math.abs(ga4Gap) <= 10 && Math.abs(metaGap) <= 10 && checkout > 0;

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StatusDot ok={!!isHealthy} />
          <h3 className="text-base font-semibold">Tracking health</h3>
        </div>
        <div className="flex items-center gap-2 text-xs text-neutral-500">
          <RefreshCcw className="h-3.5 w-3.5" />
          {loading ? 'Checking…' : `Checked ${timeAgo(data?.lastCheckedISO)}`}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Tile
          label="Pixel fires (2h)"
          value={formatInt(pixel)}
          sub={checkout > 0 ? 'Checkout firing OK' : 'Checkout events low'}
          icon={<Activity className="h-4 w-4 text-neutral-400" />}
        />
        <GapTile label="GA4 ↔ Shopify" gapPct={ga4Gap} />
        <GapTile label="Meta ↔ Shopify" gapPct={metaGap} />
      </div>

      {!isHealthy && (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4" />
          <div>
            We’re seeing a tracking mismatch. Verify pixel firing on checkout, and
            compare attribution windows in GA4/Shopify/Meta.
          </div>
        </div>
      )}

      {isHealthy && (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          <CheckCircle className="mt-0.5 h-4 w-4" />
          <div>Tracking looks healthy across sources.</div>
        </div>
      )}
    </div>
  );
}

/* ----------------- small bits ----------------- */
function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span
      aria-hidden
      className={`inline-block h-1.5 w-1.5 rounded-full ${
        ok ? 'bg-emerald-500' : 'bg-rose-500'
      } animate-pulse`}
    />
  );
}

function Tile({
  label,
  value,
  sub,
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-neutral-200 p-4">
      <div className="flex items-center justify-between">
        <div className="text-xs text-neutral-600">{label}</div>
        {icon}
      </div>
      <div className="mt-1 text-xl font-semibold tracking-tight">{value}</div>
      {sub && <div className="text-[11px] text-neutral-500">{sub}</div>}
    </div>
  );
}

function GapTile({ label, gapPct }: { label: string; gapPct: number }) {
  const abs = Math.abs(gapPct);
  const healthy = abs <= 10;
  const tone =
    healthy ? 'text-emerald-700' : abs <= 20 ? 'text-amber-700' : 'text-rose-700';
  const badge =
    healthy
      ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
      : abs <= 20
      ? 'bg-amber-100 text-amber-700 border-amber-200'
      : 'bg-rose-100 text-rose-700 border-rose-200';

  return (
    <div className="rounded-xl border border-neutral-200 p-4">
      <div className="flex items-center justify-between">
        <div className="text-xs text-neutral-600">{label}</div>
      </div>
      <div className={`mt-1 text-xl font-semibold tracking-tight ${tone}`}>
        {gapPct > 0 ? '+' : ''}
        {gapPct.toFixed(0)}%
      </div>
      <span
        className={`mt-1 inline-block rounded-full border px-2 py-0.5 text-[11px] ${badge}`}
      >
        {healthy ? 'In sync' : abs <= 20 ? 'Slight mismatch' : 'Significant mismatch'}
      </span>
    </div>
  );
}

function timeAgo(iso?: string) {
  if (!iso) return 'just now';
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.max(0, Math.floor(ms / 60000));
  if (m === 0) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return `${h}h ago`;
}

function formatInt(n: number) {
  try {
    return new Intl.NumberFormat().format(n);
  } catch {
    return String(n);
  }
}
