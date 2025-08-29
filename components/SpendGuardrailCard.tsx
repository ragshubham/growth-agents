'use client';

import { useEffect, useState } from 'react';
import { Megaphone, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { formatMoney } from '@/lib/money';

type MetaRow = {
  campaign_name?: string;
  spend?: string;        // as string from API
  impressions?: string;  // as string from API
  clicks?: string;       // as string from API
};

type MetaSpendResp =
  | { ok: true; data: MetaRow[]; message?: string }
  | { ok: false; error: string };

type SettingsData = {
  currencyCode?: string;
  dailyMetaCap?: number; // from Company.dailyMetaCap
};

export default function SpendGuardrailCard() {
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [meta, setMeta] = useState<MetaSpendResp | null>(null);

  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [loadingSettings, setLoadingSettings] = useState(true);

  // Load Meta spend
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/meta/spend', { cache: 'no-store' });
        const d: MetaSpendResp = await r.json();
        setMeta(d);
      } catch {
        setMeta({ ok: false, error: 'Failed to fetch Meta spend' });
      } finally {
        setLoadingMeta(false);
      }
    })();
  }, []);

  // Load Settings (to get dailyMetaCap + currency)
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/settings', { cache: 'no-store' });
        const d = await r.json();
        if (d?.ok) {
          setSettings({
            currencyCode: d.currencyCode,
            dailyMetaCap: typeof d.dailyMetaCap === 'number' ? d.dailyMetaCap : undefined,
          });
        }
      } finally {
        setLoadingSettings(false);
      }
    })();
  }, []);

  const spendToday =
    meta && 'ok' in meta && meta.ok && meta.data.length > 0
      ? Number(meta.data[0].spend || 0)
      : 0;

  const DAILY_BUDGET = settings?.dailyMetaCap ?? 50; // fallback if not set
  const hasDelivery = spendToday > 0;
  const overBudget = spendToday > DAILY_BUDGET;

  const loading = loadingMeta || loadingSettings;

  return (
    <div className="rounded-2xl bg-white shadow-sm border border-gray-100 p-5 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Megaphone className="w-5 h-5 text-indigo-600" />
          <h2 className="font-semibold text-lg">Spend Guardrail</h2>
        </div>

        {/* Status Pill */}
        {loading ? (
          <span className="inline-flex items-center gap-1 text-gray-500 text-sm">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Checking…
          </span>
        ) : meta && 'ok' in meta && meta.ok ? (
          hasDelivery ? (
            overBudget ? (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-50 text-red-700 text-xs">
                <AlertTriangle className="w-3.5 h-3.5" />
                Over budget today
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs">
                <CheckCircle2 className="w-3.5 h-3.5" />
                On track
              </span>
            )
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-100 text-gray-600 text-xs">
              No delivery yet
            </span>
          )
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-50 text-red-700 text-xs">
            <AlertTriangle className="w-3.5 h-3.5" />
            Error
          </span>
        )}
      </div>

      {/* Body */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Meta Ads */}
        <div className="rounded-xl border border-gray-100 p-4">
          <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">Meta Ads</div>

          {loading && (
            <div className="flex items-center gap-2 text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading…
            </div>
          )}

          {!loading && meta && 'ok' in meta && meta.ok && meta.data.length > 0 && (
            <>
              <div className="text-2xl font-semibold text-gray-900">
                {formatMoney(spendToday)}
              </div>
              <div className="text-sm text-gray-500 mt-1">
                {Number(meta.data[0].impressions || 0).toLocaleString()} impressions ·{' '}
                {Number(meta.data[0].clicks || 0).toLocaleString()} clicks
              </div>
              {overBudget && (
                <div className="mt-3 text-xs text-red-600">
                  Exceeds today’s guardrail of {formatMoney(DAILY_BUDGET)}.
                </div>
              )}
            </>
          )}

          {!loading && meta && 'ok' in meta && meta.ok && meta.data.length === 0 && (
            <div className="text-gray-600">
              {meta.message || 'No spend data yet.'}
            </div>
          )}

          {!loading && meta && 'ok' in meta && !meta.ok && (
            <div className="text-red-600">Error: {meta.error}</div>
          )}
        </div>

        {/* Google Ads placeholder (wire later) */}
        <div className="rounded-xl border border-gray-100 p-4">
          <div className="text-xs uppercase tracking-wide text-gray-400 mb-1">Google Ads</div>
          <div className="text-gray-400 text-sm">Connect source to show spend</div>
        </div>

        {/* Total */}
        <div className="rounded-xl border border-gray-100 p-4">
          <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">Total (Today)</div>
          <div className="text-2xl font-semibold text-gray-900">
            {formatMoney(spendToday /* + googleSpendLater */)}
          </div>
          <div className="text-sm text-gray-500 mt-1">
            Across connected channels
          </div>
          {!loading && (
            <div className="mt-3 text-xs text-gray-500">
              Daily cap: {formatMoney(DAILY_BUDGET)} {settings?.currencyCode ? `(${settings.currencyCode})` : ''}
            </div>
          )}
        </div>
      </div>

      {/* Footer note */}
      <div className="mt-4 text-xs text-gray-500">
        Guardrail compares today’s spend to your daily cap. You can edit the cap in Settings → Company.
      </div>
    </div>
  );
}
