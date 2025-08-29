'use client';

import { useEffect, useState } from 'react';
import { CreditCard, Loader2 } from 'lucide-react';
import { formatMoney } from '@/lib/money';

type MetaSpendResp = {
  ok: boolean;
  message?: string;
  data?: {
    campaign_name?: string;
    spend?: string;
    impressions?: string;
    clicks?: string;
  }[];
  error?: string;
};

export default function MetaSpendCard() {
  const [loading, setLoading] = useState(true);
  const [resp, setResp] = useState<MetaSpendResp | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/meta/spend');
        const d: MetaSpendResp = await r.json();
        setResp(d);
      } catch (err) {
        setResp({ ok: false, error: 'Failed to fetch spend' });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="rounded-2xl bg-white shadow p-5 flex flex-col">
      <div className="flex items-center gap-2 mb-3">
        <CreditCard className="w-5 h-5 text-indigo-600" />
        <h2 className="font-semibold text-lg">Meta Ads Spend</h2>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-gray-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading…
        </div>
      )}

      {!loading && resp?.ok && resp?.data && resp.data.length > 0 && (
        <div>
          <p className="text-2xl font-bold text-gray-900">
            {formatMoney(Number(resp.data[0].spend || 0))}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {resp.data[0].impressions} impressions · {resp.data[0].clicks} clicks
          </p>
        </div>
      )}

      {!loading && resp?.ok && resp?.data?.length === 0 && (
        <p className="text-gray-500">{resp.message || 'No spend data yet.'}</p>
      )}

      {!loading && !resp?.ok && (
        <p className="text-red-500">Error: {resp?.error}</p>
      )}
    </div>
  );
}
