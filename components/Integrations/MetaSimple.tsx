'use client';

import { useEffect, useState } from 'react';

type Attached = { provider: string; externalId: string; name: string; currency?: string };

export default function MetaSimple({ brandId, brandName }: { brandId: string; brandName: string }) {
  const [attached, setAttached] = useState<Attached[]>([]);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState('');

  async function loadAttached() {
    setLoading(true);
    setNote('');
    try {
      const r = await fetch(`/api/brands/${brandId}/adaccounts`, { cache: 'no-store' });
      const j = await r.json();
      setAttached(j?.accounts?.filter((a: any) => a.provider === 'meta') || []);
    } catch (e: any) {
      setNote(e?.message || 'Failed to load accounts.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (brandId) loadAttached();
  }, [brandId]);

  async function detach(externalId: string) {
    setNote('');
    const r = await fetch(`/api/brands/${brandId}/adaccounts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'detach', provider: 'meta', externalId }),
    });
    const j = await r.json();
    if (j?.ok) loadAttached();
    else setNote(j?.error || 'Detach failed.');
  }

  const connectedCount = attached.length;

  return (
    <div>
      {/* STATUS */}
      {loading ? (
        <div className="text-sm text-neutral-500">Loading…</div>
      ) : connectedCount === 0 ? (
        <div className="text-sm text-neutral-700">
          No ad accounts connected to <b>{brandName}</b> yet.
        </div>
      ) : (
        <div className="space-y-2">
          <div className="text-sm text-neutral-700">
            Connected accounts ({connectedCount}):
          </div>
          <ul className="space-y-2">
            {attached.map((acc) => (
              <li
                key={acc.externalId}
                className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white px-3 py-2"
              >
                <div>
                  <div className="text-sm font-medium">{acc.name}</div>
                  <div className="text-[11px] text-neutral-500">
                    {acc.externalId} • {acc.currency || '—'}
                  </div>
                </div>
                <button
                  onClick={() => detach(acc.externalId)}
                  className="rounded-lg bg-white px-2.5 py-1.5 text-xs font-semibold text-rose-700 ring-1 ring-rose-200 hover:bg-rose-50"
                >
                  Disconnect
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ACTIONS */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {connectedCount === 0 ? (
          <a
            href="/api/auth/signin/facebook"
            className="rounded-xl bg-black px-3 py-2 text-sm font-semibold text-white hover:brightness-110"
          >
            Connect Meta Ads
          </a>
        ) : (
          <>
            <a
              href="/api/auth/signin/facebook"
              className="rounded-xl bg-black px-3 py-2 text-sm font-semibold text-white hover:brightness-110"
            >
              + Add more accounts
            </a>
          </>
        )}
        <button
          onClick={loadAttached}
          className="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-neutral-700 ring-1 ring-neutral-200 hover:bg-neutral-50"
        >
          Refresh
        </button>
      </div>

      {note && <div className="mt-2 text-sm text-neutral-600">{note}</div>}
    </div>
  );
}
