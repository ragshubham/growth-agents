'use client';
import { useState } from 'react';

export default function OnboardingPage() {
  const [name, setName] = useState('');
  const [tz, setTz] = useState('Asia/Kolkata');
  const [webhook, setWebhook] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const body = new URLSearchParams();
    body.set('companyName', name || 'My Company');
    body.set('timezone', tz);
    if (webhook) body.set('slackWebhookUrl', webhook);
    const res = await fetch('/api/onboarding', { method: 'POST', body });
    const json = await res.json();
    if (json?.ok) window.location.href = '/dashboard';
    else alert(json?.error || 'Failed');
  }

  async function skip() {
    const body = new URLSearchParams();
    body.set('skip', '1');
    const res = await fetch('/api/onboarding', { method: 'POST', body });
    const json = await res.json();
    if (json?.ok) window.location.href = '/dashboard';
    else alert(json?.error || 'Failed');
  }

  return (
    <main className="max-w-md mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Set up your company</h1>
      <form onSubmit={submit} className="space-y-3">
        <input className="w-full border p-2 rounded" placeholder="Company name"
          value={name} onChange={e=>setName(e.target.value)} />
        <input className="w-full border p-2 rounded" placeholder="Timezone (e.g., Asia/Kolkata)"
          value={tz} onChange={e=>setTz(e.target.value)} />
        <input className="w-full border p-2 rounded" placeholder="Slack webhook (optional)"
          value={webhook} onChange={e=>setWebhook(e.target.value)} />
        <div className="flex gap-2">
          <button className="px-4 py-2 rounded bg-black text-white" type="submit">Continue</button>
          <button className="px-4 py-2 rounded border" type="button" onClick={skip}>Skip for now</button>
        </div>
      </form>
    </main>
  );
}
