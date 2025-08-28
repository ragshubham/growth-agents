'use client';

import { useMemo } from 'react';
import { AlertTriangle, CheckCircle } from 'lucide-react';
import { formatMoney } from '@/lib/money';

type Props = {
  budget: number;
  spendToDate: number;
  projected: number;
  currencyCode?: string;
};

export default function SpendGuardrailCard({
  budget,
  spendToDate,
  projected,
  currencyCode = 'USD',
}: Props) {
  const { overAmt, overPct, onTrack } = useMemo(() => {
    const overAmt = Math.max(0, projected - budget);
    const overPct = budget > 0 ? Math.round((overAmt / budget) * 100) : 0;
    return { overAmt, overPct, onTrack: overAmt === 0 };
  }, [budget, projected]);

  return (
    <div className="h-full rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
      {/* header — identical layout to Tracking (status dot + title), no timestamp */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StatusDot ok={onTrack} />
          <h3 className="text-base font-semibold">Spend Guardrail</h3>
        </div>
        {/* (intentionally empty to align with Tracking’s right-side meta area) */}
        <div className="text-xs text-neutral-500" />
      </div>

      {/* three tiles matching Tracking’s tile style */}
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile
          label="Budget"
          value={formatMoney(budget, currencyCode)}
          sub="Planned cap"
        />
        <StatTile
          label="Spend to date"
          value={formatMoney(spendToDate, currencyCode)}
          sub={spendToDate > budget ? 'Exceeded cap' : 'Within cap'}
          tone={spendToDate > budget ? 'bad' : 'neutral'}
        />
        <StatTile
          label="Projected"
          value={formatMoney(projected, currencyCode)}
          sub={
            onTrack
              ? 'On track'
              : `Projected +${overPct}% (${formatMoney(overAmt, currencyCode)})`
          }
          tone={onTrack ? 'good' : 'bad'}
        />
      </div>

      {/* alert strip — same pattern as Tracking */}
      {!onTrack ? (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          <AlertTriangle className="mt-0.5 h-4 w-4" />
          <div>
            <span className="font-medium">Over budget —</span> projected{" "}
            <span className="font-medium">+{overPct}%</span> (
            <span className="font-medium">
              {formatMoney(overAmt, currencyCode)}
            </span>
            ).
          </div>
        </div>
      ) : (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          <CheckCircle className="mt-0.5 h-4 w-4" />
          <div>On track — projected within budget.</div>
        </div>
      )}
    </div>
  );
}

/* ---------- bits to perfectly match Tracking ---------- */
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

function StatTile({
  label,
  value,
  sub,
  tone = 'neutral',
}: {
  label: string;
  value: string | number;
  sub?: string;
  tone?: 'neutral' | 'good' | 'bad';
}) {
  const toneClass =
    tone === 'good'
      ? 'text-emerald-700'
      : tone === 'bad'
      ? 'text-rose-700'
      : 'text-neutral-900';
  const badgeClass =
    tone === 'good'
      ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
      : tone === 'bad'
      ? 'bg-rose-100 text-rose-700 border-rose-200'
      : 'bg-neutral-100 text-neutral-700 border-neutral-200';

  return (
    <div className="rounded-xl border border-neutral-200 p-4">
      <div className="text-xs text-neutral-600">{label}</div>
      <div className={`mt-1 text-xl font-semibold tracking-tight ${toneClass}`}>
        {value}
      </div>
      {sub && (
        <span className={`mt-1 inline-block rounded-full border px-2 py-0.5 text-[11px] ${badgeClass}`}>
          {sub}
        </span>
      )}
    </div>
  );
}
