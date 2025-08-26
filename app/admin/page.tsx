'use client';

import { useState } from 'react';

export default function AdminPage() {
  const [out, setOut] = useState<string>('');

  async function call(path: string) {
    setOut('Running…');
    try {
      const res = await fetch(path, { method: 'GET' });
      const txt = await res.text();
      setOut(`${res.status} ${res.ok ? 'OK' : 'ERR'}\n` + txt);
    } catch (e: any) {
      setOut('ERR: ' + (e?.message || 'unknown'));
    }
  }

  return (
    <main className="p-6 max-w-2xl mx-auto space-y-4">
      <h1 className="text-2xl font-semibold">Shield Admin</h1>

      <div className="space-x-2">
        <button
          className="px-4 py-2 rounded bg-black text-white"
          onClick={() => call('/api/digest?mock=1')}
        >
          🧪 Mock run (no email)
        </button>

        <button
          className="px-4 py-2 rounded bg-blue-600 text-white"
          onClick={() => {
            const to = prompt('Send to email:', 'you@example.com');
            if (to) call(`/api/digest?to=${encodeURIComponent(to)}`);
          }}
        >
          ✉️ Send digest now
        </button>
      </div>

      <pre className="bg-gray-100 text-sm p-3 rounded whitespace-pre-wrap">
        {out || 'Results will appear here…'}
      </pre>
    </main>
  );
}
