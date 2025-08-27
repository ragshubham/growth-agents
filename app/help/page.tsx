'use client';

import Topbar from '@/components/Topbar';

export default function HelpPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-neutral-50 to-white">
      {/* topbar works even if not signed in; we just omit the email */}
      <Topbar email={undefined} />

      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        {/* Header */}
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">Help & Support</h1>
          <p className="text-sm text-neutral-600">
            Quick answers to get you live fast. If you’re stuck, email
            {' '}
            <a className="underline" href="mailto:hello@growthagents.io">hello@growthagents.io</a>.
          </p>
        </header>

        {/* Getting started */}
        <section className="rounded-2xl border border-neutral-200 bg-white/70 p-5 shadow-sm backdrop-blur">
          <h2 className="text-sm font-medium">Getting started (2 minutes)</h2>
          <ol className="mt-3 space-y-2 text-sm text-neutral-700 list-decimal list-inside">
            <li>
              <a className="underline" href="/signin">Sign in with Google</a>.
            </li>
            <li>
              Complete onboarding (company name & timezone), then open
              {' '}
              <a className="underline" href="/settings">Settings</a>.
            </li>
            <li>
              (Optional) Paste your <strong>Slack webhook</strong> → Save.
            </li>
            <li>
              Add a <strong>CSV URL</strong> in Data Source (temporary until OAuth) with headers:
              {' '}
              <code>id,text,severity,updatedAt</code>.
            </li>
            <li>
              Go to <a className="underline" href="/dashboard">Dashboard</a> → click
              {' '}
              <strong>Send digest now</strong> to test email delivery.
            </li>
          </ol>
        </section>

        {/* FAQ */}
        <section className="rounded-2xl border border-neutral-200 bg-white/70 p-5 shadow-sm backdrop-blur">
          <h2 className="text-sm font-medium">FAQ</h2>

          <div className="mt-4 space-y-5 text-sm text-neutral-700">
            <div>
              <div className="font-medium">I didn’t receive the digest email.</div>
              <ul className="mt-2 list-disc list-inside space-y-1">
                <li>Check <em>Settings → Email (Resend)</em> shows “OK” on the dashboard.</li>
                <li>Verify your <code>RESEND_API_KEY</code> in Vercel env & set a branded “From”.</li>
                <li>Look in spam or Promotions; mark as “Not spam”.</li>
              </ul>
            </div>

            <div>
              <div className="font-medium">The Integrations page says “Not connected”.</div>
              <ul className="mt-2 list-disc list-inside space-y-1">
                <li>Slack needs a valid <strong>incoming webhook URL</strong> pasted in Settings.</li>
                <li>Google/Meta show “Using CSV source” when your <strong>sheetCsvUrl</strong> is set.</li>
              </ul>
            </div>

            <div>
              <div className="font-medium">What format should the CSV be?</div>
              <p className="mt-2">
                A public CSV with headers <code>id,text,severity,updatedAt</code>. Severity must be
                {' '}
                <code>good</code>, <code>warn</code>, or <code>info</code>. Example:
              </p>
              <pre className="mt-2 rounded-lg bg-neutral-900 text-neutral-100 p-3 overflow-auto text-xs">
{`id,text,severity,updatedAt
overlap,Audience overlap rising (brand vs remarketing),warn,2025-08-27T06:00:00Z
fatigue,Creative fatigue detected in Set B,warn,2025-08-27T05:30:00Z
ctr,Prospecting CTR improving on Meta,good,2025-08-27T04:10:00Z`}
              </pre>
            </div>

            <div>
              <div className="font-medium">When is the daily digest sent?</div>
              <p className="mt-2">By default at <strong>8:30 AM</strong> of your company’s timezone (configurable via cron).</p>
            </div>

            <div>
              <div className="font-medium">How do I disconnect?</div>
              <p className="mt-2">Remove your Slack webhook & CSV in Settings. Click “Log out” from the top-right menu.</p>
            </div>
          </div>
        </section>

        {/* Contact / Legal */}
        <section className="rounded-2xl border border-neutral-200 bg-white/70 p-5 shadow-sm backdrop-blur">
          <h2 className="text-sm font-medium">Need more help?</h2>
          <p className="mt-2 text-sm text-neutral-700">
            Email <a className="underline" href="mailto:hello@growthagents.io">hello@growthagents.io</a>.  
            See our <a className="underline" href="/legal/terms">Terms</a> and <a className="underline" href="/legal/privacy">Privacy</a>.
          </p>
        </section>
      </div>
    </main>
  );
}
