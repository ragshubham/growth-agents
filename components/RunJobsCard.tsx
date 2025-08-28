'use client';

import { useState } from 'react';

type Props = {
  variant: 'alerts' | 'digest';
  title: string;
  description: string;
  icon: React.ReactNode;
};

export default function RunJobsCard({ variant, title, description, icon }: Props) {
  const [busy, setBusy] = useState<'preview' | 'live' | null>(null);
  const [note, setNote] = useState<string>('');

  async function call(action: 'preview' | 'live') {
    setBusy(action);
    setNote('');
    try {
      const path =
        variant === 'alerts'
          ? `/api/admin/alerts${action === 'preview' ? '?dry=1' : ''}`
          : `/api/admin/digest${action === 'preview' ? '?dry=1' : ''}`;

      const r = await fetch(path, { method: 'POST' });
      const j = await r.json().catch(() => ({}));

      if (!r.ok || j?.ok === false) {
        setNote(j?.error || 'Something went wrong. Please check Settings.');
      } else {
        // craft friendly copy for non-devs
        if (variant === 'alerts') {
          const scanned = j?.scanned ?? 0;
          const sent = j?.sent ?? 0;
          if (action === 'preview') {
            setNote(`Preview only — would send ${sent} alert${sent === 1 ? '' : 's'} (scanned ${scanned} items).`);
          } else {
            setNote(`Sent ${sent} alert${sent === 1 ? '' : 's'} to Slack.`);
          }
        } else {
          const sent = j?.sentSlack ?? 0;
          if (action === 'preview') {
            setNote(`Preview only — would send ${sent} digest${sent === 1 ? '' : 's'} today.`);
          } else {
            setNote(`Sent ${sent} digest${sent === 1 ? '' : 's'} to Slack.`);
          }
        }
      }
    } catch (e: any) {
      setNote(e?.message || 'Network error.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white/70 p-5 shadow-sm backdrop-blur">
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="text-sm font-medium">{title}</h3>
      </div>
      <p className="mt-2 text-sm text-neutral-600">{description}</p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => call('preview')}
          disabled={busy !== null}
          className="inline-flex items-center justify-center rounded-xl border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-900 shadow-sm hover:brightness-105 disabled:opacity-60"
        >
          {busy === 'preview' ? 'Previewing…' : 'Preview (no send)'}
        </button>
        <button
          type="button"
          onClick={() => call('live')}
          disabled={busy !== null}
          className="inline-flex items-center justify-center rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white shadow hover:brightness-110 disabled:opacity-60"
        >
          {busy === 'live' ? 'Sending…' : 'Send now'}
        </button>
        {note && <span className="text-sm text-neutral-600">{note}</span>}
      </div>

      <p className="mt-2 text-[11px] text-neutral-500">
        Preview shows what would be sent. “Send now” posts to your Slack channels based on your settings.
      </p>
    </div>
  );
}
