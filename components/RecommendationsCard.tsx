'use client';

import { useEffect, useState } from 'react';
import { Sparkles, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
import { formatMoney } from '@/lib/money';

type Recommendation = {
  id: string;
  severity: 'CRIT' | 'WARN' | 'OK';
  title: string;
  detail?: string;
  action?: { label: string; href?: string };
};

type RecommendationsResp = {
  ok: boolean;
  items: Recommendation[];
  generatedAtISO?: string;
  error?: string;
};

export default function RecommendationsCard({ currencyCode = 'USD', ...props }: any) {
  const [data, setData] = useState<RecommendationsResp | null>(null);
  const [loading, setLoading] = useState(true);

  // Poll every 2 min
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        const r = await fetch('/api/recommendations', { cache: 'no-store' }); // create later
        const j: RecommendationsResp = r.ok ? await r.json() : demo();
        if (mounted) setData(j);
      } catch {
        if (mounted) setData(demo());
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    const id = setInterval(load, 120_000);
    return () => { mounted = false; clearInterval(id); };
  }, []);

  const items = data?.items ?? [];

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-amber-500" />
          <h3 className="text-base font-semibold">Recommendations</h3>
        </div>
        {!loading && data?.generatedAtISO && (
          <div className="text-[11px] text-neutral-500">Updated {timeAgo(data.generatedAtISO)}</div>
        )}
      </div>

      {!items.length ? (
        <div className="mt-3 text-sm text-neutral-500">No suggestions right now — things look steady.</div>
      ) : (
        <ul className="mt-4 space-y-2">
          {items.map((r) => (
            <li key={r.id} className="rounded-xl border border-neutral-200 bg-white/60 px-3 py-2">
              <div className="flex items-start justify-between gap-3">
                <div className="text-sm">
                  <div className="flex items-center gap-2">
                    <SeverityBadge sev={r.severity} />
                    <span className="font-medium">{r.title}</span>
                  </div>
                  {r.detail && <div className="text-[11px] text-neutral-600 ml-6">{r.detail}</div>}
                </div>
                {r.action && (
                  <a
                    href={r.action.href || '#'}
                    target={r.action.href ? '_blank' : undefined}
                    className="inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs text-neutral-700 hover:bg-neutral-50"
                  >
                    {r.action.label} <ArrowRight className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ------------ bits ------------ */
function SeverityBadge({ sev }: { sev: 'CRIT' | 'WARN' | 'OK' }) {
  const map = {
    OK: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    WARN: 'bg-amber-100 text-amber-700 border-amber-200',
    CRIT: 'bg-rose-100 text-rose-700 border-rose-200',
  } as const;
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] ${map[sev]}`}>
      {sev}
    </span>
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

function demo(): RecommendationsResp {
  return {
    ok: true,
    generatedAtISO: new Date().toISOString(),
    items: [
      {
        id: 'r1',
        severity: 'CRIT',
        title: 'Rotate creatives on Brand A — CTR down 24%',
        detail: `Ad sets #4, #7 underperforming 48h. Reallocate ${formatMoney(15000, currencyCode)} from Brand B where CPA is 18% lower.`,
        action: { label: 'Open in Meta Ads', href: '#' },
      },
      {
        id: 'r2',
        severity: 'WARN',
        title: 'Budget pacing behind by 12%',
        detail: `Consider ${formatMoney(10000, currencyCode)} spend in high-ROAS campaigns to hit weekly target.`,
        action: { label: 'View pacing', href: '#' },
      },
      {
        id: 'r3',
        severity: 'OK',
        title: 'Pixel stable — no action needed',
        detail: 'No critical tracking gaps detected across GA4/Shopify/Meta.',
      },
    ],
  };
}
