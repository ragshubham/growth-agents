'use client';

import React, { useMemo } from 'react';
import { formatMoney } from '@/lib/money';

type Recommendation = {
  id: string;
  title: string;
  detail: string;
};

type Props = {
  currencyCode?: string;  // e.g. "USD", "INR"
  locale?: string;        // e.g. "en-US", "en-IN" (optional)
};

export default function RecommendationsCard({ currencyCode = 'USD', locale }: Props) {
  // Normalize once; keep it defensive
  const cur = (currencyCode || 'USD').toUpperCase();

  // Demo/sample recommendations (replace with real ones if fetched from API)
  const recs: Recommendation[] = useMemo(
    () => [
      {
        id: 'r1',
        title: 'Shift budget',
        detail: `Ad sets #4, #7 underperforming 48h. Reallocate ${formatMoney(15000, cur, locale)} from Brand B where CPA is 18% lower.`,
      },
      {
        id: 'r2',
        title: 'Scale high-ROAS',
        detail: `Consider ${formatMoney(10000, cur, locale)} spend in high-ROAS campaigns to hit weekly target.`,
      },
      {
        id: 'r3',
        title: 'Refresh creatives',
        detail: 'Creative fatigue detected in Meta ads (CTR ↓12%). Test new variations this week.',
      },
    ],
    [cur, locale]
  );

  return (
    <div className="rounded-2xl bg-white/90 p-6 shadow-sm ring-1 ring-neutral-200 backdrop-blur">
      <h2 className="text-sm font-medium">Recommendations</h2>
      <ul className="mt-3 space-y-3">
        {recs.map((r) => (
          <li key={r.id} className="rounded-xl border border-neutral-200 bg-white/70 p-3">
            <div className="text-sm font-medium text-neutral-800">{r.title}</div>
            <div className="mt-0.5 text-xs text-neutral-600">{r.detail}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
