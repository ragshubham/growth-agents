'use client';

import { useEffect, useState } from 'react';

type Account = { externalId: string; name: string; currency?: string };
type Attached = { provider: string; externalId: string; name: string; currency?: string };

export default function MetaAccountMapper({ brandId }: { brandId: string }) {
  const [discovered, setDiscovered] = useState<Account[]>([]);
  const [attached, setAttached] = useState<Attached[]>([]);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState<string>('');

  async function load() {
    setLoading(true);
    setNote('');
    try {
      const [d, a] = await Promise.all([
        fetch('/api/meta/accounts', { cache: 'no-store' }).then(r => r.json()),
        fetch(`/api/brands/${brandId}/adaccounts`, { cache: 'no-store' }).then(r => r.json()),
      ]);
      setDiscovered(d?.accounts || []);
      setAttached(a?.accounts || []);
    } catch (e: any) {
      setNote(e?.message || 'Failed to load accounts.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (brandId) load();
  }, [brandId]);

  async function attach(acc: Account) {
    setNote('');
    const r = await fetch(`/api/brands/${brandId}/adaccounts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'attach', provider: 'meta', ...acc }),
    });
    const j = await r.json();
    if (j?.ok) load();
    else setNote(j?.error || 'Attach failed.');
  }

  async function detach(acc: Attached) {
    setNote('');
    const r = await fetch(`/api/brands/${brandId}/adaccounts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'detach', provider: 'meta', externalId: acc.externalId }),
    });
    const j = await r.json();
    if (j?.ok) load();
    else setNote(j?.error || 'Detach failed.');
  }

  const attachedSet = new Set(attached.map(a => a.externalId));
  const available = discovered.filter(d => !attachedSet.has(d.externalId));

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {/* Discovered */}
      <div className="rounded-2xl border border-neutral-200 bg-white/70 p-4 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-medium">Discovered (Meta)</h3>
          <button onClick={load} className="text-xs text-neutral-600 underline">Refresh</button>
        </div>
        {loading ? (
          <div className="text-sm text-neutral-500">Loading…</div>
        ) : available.length ? (
          <ul className="space-y-2">
            {available.map((acc) => (
              <li key={acc.externalId} className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white px-3 py-2">
                <div>
                  <div className="text-sm font-medium">{acc.name}</div>
                  <div className="text-[11px] text-neutral-500">{acc.externalId} • {acc.currency || '—'}</div>
                </div>
                <button
                  className="rounded-lg bg-black px-2.5 py-1.5 text-xs font-semibold text-white"
                  onClick={() => attach(acc)}
                >
                  Attach →
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-sm text-neutral-500">No unattached accounts.</div>
        )}
      </div>

      {/* Attached */}
      <div className="rounded-2xl border border-neutral-200 bg-white/70 p-4 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-medium">Attached to Brand</h3>
        </div>
        {loading ? (
          <div className="text-sm text-neutral-500">Loading…</div>
        ) : attached.length ? (
          <ul className="space-y-2">
            {attached.map((acc) => (
              <li key={`${acc.provider}:${acc.externalId}`} className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white px-3 py-2">
                <div>
                  <div className="text-sm font-medium">{acc.name}</div>
                  <div className="text-[11px] text-neutral-500">{acc.externalId} • {acc.currency || '—'}</div>
                </div>
                <button
                  className="rounded-lg bg-white px-2.5 py-1.5 text-xs font-semibold text-rose-700 ring-1 ring-rose-200 hover:bg-rose-50"
                  onClick={() => detach(acc)}
                >
                  ← Detach
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-sm text-neutral-500">Nothing attached yet.</div>
        )}
      </div>

      {note && <div className="col-span-1 sm:col-span-2 text-sm text-neutral-600">{note}</div>}
    </div>
  );
}
