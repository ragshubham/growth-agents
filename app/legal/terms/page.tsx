import React from 'react';
import Topbar from '@/components/Topbar';

export default function TermsPage(): JSX.Element {
  return (
    <main className="min-h-screen bg-gradient-to-b from-neutral-50 to-white">
      {/* keep the app’s consistent header */}
      <Topbar email={undefined} />

      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-10 space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">Terms of Service</h1>
          <p className="text-sm text-neutral-600">
            These terms govern your use of Growth Agents. Replace with your final legal copy before GA.
          </p>
        </header>

        <section className="rounded-2xl border border-neutral-200 bg-white/70 p-5 shadow-sm backdrop-blur space-y-4">
          <h2 className="text-sm font-medium">1. Acceptance of terms</h2>
          <p className="text-sm text-neutral-700">
            By accessing or using Growth Agents (“Service”), you agree to be bound by these Terms. If you do not agree, do not use the Service.
          </p>
        </section>

        <section className="rounded-2xl border border-neutral-200 bg-white/70 p-5 shadow-sm backdrop-blur space-y-4">
          <h2 className="text-sm font-medium">2. Accounts & access</h2>
          <ul className="text-sm text-neutral-700 list-disc list-inside space-y-1">
            <li>You’re responsible for your account and any activity under it.</li>
            <li>You must comply with applicable laws and acceptable use.</li>
          </ul>
        </section>

        <section className="rounded-2xl border border-neutral-200 bg-white/70 p-5 shadow-sm backdrop-blur space-y-4">
          <h2 className="text-sm font-medium">3. Data & privacy</h2>
          <p className="text-sm text-neutral-700">
            We process personal data as described in our <a className="underline" href="/legal/privacy">Privacy Policy</a>.
          </p>
        </section>

        <section className="rounded-2xl border border-neutral-200 bg-white/70 p-5 shadow-sm backdrop-blur space-y-4">
          <h2 className="text-sm font-medium">4. Service changes</h2>
          <p className="text-sm text-neutral-700">
            We may modify or discontinue features with notice where reasonable.
          </p>
        </section>

        <section className="rounded-2xl border border-neutral-200 bg-white/70 p-5 shadow-sm backdrop-blur space-y-4">
          <h2 className="text-sm font-medium">5. Liability</h2>
          <p className="text-sm text-neutral-700">
            The Service is provided “as is”. To the fullest extent permitted by law, we disclaim all warranties and limit our liability.
          </p>
        </section>

        <footer className="text-xs text-neutral-500">
          Last updated: {new Date().toLocaleDateString()}
        </footer>
      </div>
    </main>
  );
}
