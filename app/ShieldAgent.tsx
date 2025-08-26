'use client';

import React, { useEffect, useState } from 'react';

type Severity = 'good' | 'warn' | 'info';
type Alert = { id: string; text: string; severity: Severity };

export default function ShieldAgent() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [updatedAt, setUpdatedAt] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // subscribe form
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [subMsg, setSubMsg] = useState<string | null>(null);

  async function fetchAlerts() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/alerts', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load alerts');
      const data = await res.json();
      setAlerts(data.alerts ?? []);
      setUpdatedAt(data.updatedAt ?? new Date().toISOString());
    } catch (e: any) {
      setError(e.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchAlerts(); }, []);

  const styles: Record<Severity, string> = {
    good: 'border-emerald-400/30 bg-emerald-400/10',
    warn: 'border-amber-400/30 bg-amber-400/10',
    info: 'border-sky-400/30 bg-sky-400/10',
  };
  const icon: Record<Severity, string> = {
    good: '✅',
    warn: '⚠️',
    info: 'ℹ️',
  };

  async function onSubscribe(e: React.FormEvent) {
    e.preventDefault();
    setSubMsg(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Failed');
      setSubMsg(data.message || 'Subscribed!');
    } catch (err: any) {
      setSubMsg(err.message || 'Error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0a0d13] p-6 text-white shadow-xl">
      <div className="flex items-center justify-between">
  <h2 className="text-xl font-bold text-emerald-400">🛡️ Shield Agent</h2>

  <button
    onClick={async () => {
      try {
        const res = await fetch('/api/digest', { method: 'GET' });
        const data = await res.json();
        alert(data.ok ? 'Digest sent 🎯' : `Failed: ${data.error || 'unknown'}`);
      } catch (e) {
        alert('Network error sending digest');
      }
    }}
    className="rounded-lg border border-white/10 bg-white/10 px-3 py-1.5 text-xs text-slate-200 hover:bg-white/15"
    title="Send today's digest email now"
  >
    Send today’s digest
  </button>
</div>

      <p className="mt-2 text-sm text-slate-300">
        Overlap warnings, creative fatigue alerts, and budget shift suggestions.
      </p>

      {/* subscribe form */}
      <form onSubmit={onSubscribe} className="mt-4 flex gap-2">
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@brand.com"
          className="w-64 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none placeholder:text-slate-400"
          type="email"
          required
        />
        <button
          disabled={submitting}
          className="rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-black disabled:opacity-60"
        >
          {submitting ? 'Subscribing…' : 'Subscribe'}
        </button>
      </form>
      {subMsg && (
        <div className="mt-2 text-xs text-slate-300">{subMsg}</div>
      )}

      <div className="mt-3 text-xs text-slate-400">
        {updatedAt && <>Last updated: {new Date(updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</>}
      </div>

      {loading && <div className="mt-4 text-sm text-slate-300">Loading…</div>}
      {error && <div className="mt-4 rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-sm">Error: {error}</div>}

      {!loading && !error && (
        <div className="mt-4 space-y-2 text-sm">
          {alerts.map((a) => (
            <div key={a.id} className={`rounded-lg border px-3 py-2 ${styles[a.severity]}`}>
              {icon[a.severity]} {a.text}
            </div>
          ))}
          {alerts.length === 0 && (
            <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-slate-300">
              No alerts right now.
            </div>
          )}
        </div>
      )}
    </div>
  );
}