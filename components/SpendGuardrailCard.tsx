'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Megaphone, Loader2, AlertTriangle, CheckCircle2, RefreshCcw } from 'lucide-react';
import { formatMoney } from '@/lib/money';

type MetaRow = { campaign_name?: string; spend?: string; impressions?: string; clicks?: string };
type MetaSpendResp = { ok: true; data: MetaRow[]; message?: string } | { ok: false; error: string };
type SettingsData = { dailyMetaCap?: number };

export default function SpendGuardrailCard({ currencyCode: currencyFromParent }: { currencyCode?: string }) {
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [meta, setMeta] = useState<MetaSpendResp | null>(null);
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const currency = (currencyFromParent || 'USD').toUpperCase();

  const spendToday =
    meta && 'ok' in meta && meta.ok && (meta as any).data.length > 0 ? Number((meta as any).data[0].spend ?? 0) || 0 : 0;

  const impressions =
    meta && 'ok' in meta && meta.ok && (meta as any).data[0]?.impressions ? Number((meta as any).data[0].impressions) : 0;

  const clicks = meta && 'ok' in meta && (meta as any).data[0]?.clicks ? Number((meta as any).data[0].clicks) : 0;

  const DAILY_BUDGET = settings?.dailyMetaCap ?? 50;
  const pctUsed = DAILY_BUDGET > 0 ? Math.round((spendToday / DAILY_BUDGET) * 100) : 0;

  const overBudget = DAILY_BUDGET > 0 && spendToday > DAILY_BUDGET;
  const nearCap = !overBudget && pctUsed >= 80;
  const hasDelivery = spendToday > 0;

  const loading = loadingMeta || loadingSettings || refreshing;

  // ---- fetchers
  const fetchMeta = useCallback(async () => {
    setLoadingMeta(true);
    try {
      const r = await fetch('/api/meta/spend', { cache: 'no-store' });
      const d: MetaSpendResp = await r.json();
      setMeta(d);
    } catch {
      setMeta({ ok: false, error: 'Failed to fetch Meta spend' });
    } finally {
      setLoadingMeta(false);
    }
  }, []);

  const fetchSettings = useCallback(async () => {
    setLoadingSettings(true);
    try {
      const r = await fetch('/api/settings', { cache: 'no-store' });
      const d = await r.json();
      if (d?.ok) {
        setSettings({
          dailyMetaCap: typeof d.dailyMetaCap === 'number' ? d.dailyMetaCap : undefined,
        });
      }
    } finally {
      setLoadingSettings(false);
    }
  }, []);

  const reload = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchMeta(), fetchSettings()]);
    setRefreshing(false);
  }, [fetchMeta, fetchSettings]);

  useEffect(() => {
    (async () => {
      await Promise.all([fetchMeta(), fetchSettings()]);
    })();
  }, [fetchMeta, fetchSettings]);

  // ---- status pill
  const StatusPill = useMemo(() => {
    if (loading) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-neutral-100 text-neutral-600 text-xs">
          <Loader2 className="w-3 h-3 animate-spin" />
          Checking…
        </span>
      );
    }
    if (overBudget) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-rose-50 text-rose-700 text-xs">
          <AlertTriangle className="w-3 h-3" />
          Over budget
        </span>
      );
    }
    if (nearCap) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-50 text-amber-700 text-xs">
          <AlertTriangle className="w-3 h-3" />
          Approaching cap
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs">
        <CheckCircle2 className="w-3 h-3" />
        {hasDelivery ? 'On track' : 'No delivery yet'}
      </span>
    );
  }, [loading, overBudget, nearCap, hasDelivery]);

  return (
    <div className="rounded-2xl bg-white shadow-sm border border-gray-100 p-5 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Megaphone className="w-5 h-5 text-indigo-600" />
          <h2 className="font-semibold text-lg">Spend Guardrail</h2>
          {StatusPill}
        </div>

        {/* smaller refresh to match Tracking card */}
        <button
          type="button"
          onClick={reload}
          disabled={loading}
          className="inline-flex items-center gap-1 rounded-full border border-neutral-200 px-2 py-1 hover:bg-neutral-50 disabled:opacity-60 text-xs text-neutral-700"
          aria-label="Refresh spend"
          title="Refresh"
        >
          <RefreshCcw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Body */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Meta Ads */}
        <div className="rounded-xl border border-gray-100 p-4">
          <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">META ADS</div>

          {loading && (
            <div className="flex items-center gap-2 text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading…
            </div>
          )}

          {!loading && meta && 'ok' in meta && meta.ok && (meta as any).data.length > 0 && (
            <>
              <div className="text-2xl font-semibold text-gray-900">{formatMoney(spendToday, currency)}</div>
              <div className="text-sm text-gray-500 mt-1">
                {impressions.toLocaleString()} impressions · {clicks.toLocaleString()} clicks
              </div>

              {DAILY_BUDGET > 0 && (
                <>
                  <div className="mt-3 h-2 w-full rounded-full bg-neutral-200">
                    <div
                      className={`h-2 rounded-full ${
                        overBudget ? 'bg-rose-500' : nearCap ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(0, pctUsed))}%` }}
                    />
                  </div>
                  <div className="mt-1 text-xs text-neutral-600">{pctUsed}% of daily cap</div>
                </>
              )}

              {overBudget && (
                <div className="mt-3 text-xs text-red-600">
                  Exceeds today’s guardrail of {formatMoney(DAILY_BUDGET, currency)}.
                </div>
              )}
            </>
          )}

          {!loading && meta && 'ok' in meta && meta.ok && (meta as any).data.length === 0 && (
            <div className="text-gray-600">
              {meta.message || 'No spend data yet. Campaigns may still be in review or haven’t delivered.'}
            </div>
          )}

          {!loading && meta && 'ok' in meta && !meta.ok && <div className="text-red-600">Error: {meta.error}</div>}
        </div>

        {/* Google Ads placeholder */}
        <div className="rounded-xl border border-gray-100 p-4">
          <div className="text-xs uppercase tracking-wide text-gray-400 mb-1">GOOGLE ADS</div>
          <div className="text-gray-400 text-sm">Connect source to show spend</div>
        </div>

        {/* Total */}
        <div className="rounded-xl border border-gray-100 p-4">
          <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">TOTAL (TODAY)</div>
          <div className="text-2xl font-semibold text-gray-900">
            {formatMoney(spendToday /* + google later */, currency)}
          </div>
          <div className="text-sm text-gray-500 mt-1">Across connected channels</div>
          {!loading && (
            <div className="mt-3 text-xs text-gray-500">Daily cap: {formatMoney(DAILY_BUDGET, currency)}</div>
          )}
        </div>
      </div>

      <div className="mt-4 text-xs text-gray-500">
        Guardrail compares today’s spend to your daily cap. You can edit the cap in Settings → Company.
      </div>
    </div>
  );
}
