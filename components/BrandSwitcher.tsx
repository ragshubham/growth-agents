'use client'; // ← MUST be the first line

import { useEffect, useState } from 'react';

type Brand = { id: string; name: string; currencyCode: string };

function getCookie(name: string) {
  const m = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return m ? decodeURIComponent(m[2]) : '';
}

export default function BrandSwitcher() {  // ← default export
  const [open, setOpen] = useState(false);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [active, setActive] = useState<Brand | null>(null);
  const [q, setQ] = useState('');

  useEffect(() => {
    (async () => {
      const r = await fetch('/api/brands', { cache: 'no-store' });
      const j = await r.json();
      const list: Brand[] = j?.brands || [];
      setBrands(list);

      const cookieId = getCookie('brandId');
      const found = list.find(b => b.id === cookieId);
      if (found) setActive(found);
      else if (list.length) {
        setActive(list[0]);
        document.cookie = `brandId=${list[0].id}; path=/; SameSite=Lax`;
      }
    })();
  }, []);

  function choose(b: Brand) {
    setActive(b);
    setOpen(false);
    document.cookie = `brandId=${b.id}; path=/; SameSite=Lax`;
    window.dispatchEvent(new CustomEvent('brand:selected', { detail: b }));
  }

  async function create() {
    const name = prompt('Brand name?');
    if (!name) return;
    const r = await fetch('/api/brands', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    const j = await r.json();
    if (j?.ok) {
      setBrands(prev => [...prev, j.brand]);
      choose(j.brand);
    } else {
      alert(j?.error || 'Failed to create brand.');
    }
  }

  const filtered = brands.filter(b => b.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-1.5 text-sm shadow-sm"
      >
        <span className="font-medium">{active?.name || 'Select Brand'}</span>
        {active?.currencyCode && (
          <span className="text-[11px] text-neutral-500">{active.currencyCode}</span>
        )}
        <svg width="12" height="12" viewBox="0 0 20 20" className="text-neutral-500">
          <path d="M5 7l5 5 5-5" fill="currentColor" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 mt-2 w-72 rounded-2xl border border-neutral-200 bg-white p-2 shadow-lg">
          <div className="p-1">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search brands…"
              className="w-full rounded-lg border border-neutral-200 px-2 py-1.5 text-sm"
            />
          </div>
          <ul className="max-h-56 overflow-auto">
            {filtered.map((b) => (
              <li key={b.id}>
                <button
                  onClick={() => choose(b)}
                  className="w-full rounded-lg px-2 py-2 text-left text-sm hover:bg-neutral-50"
                >
                  <div className="flex items-center justify-between">
                    <span>{b.name}</span>
                    <span className="text-[11px] text-neutral-500">{b.currencyCode}</span>
                  </div>
                </button>
              </li>
            ))}
            <li className="mt-1">
              <button
                onClick={create}
                className="w-full rounded-lg px-2 py-2 text-left text-sm text-sky-700 hover:bg-sky-50"
              >
                + New Brand
              </button>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
