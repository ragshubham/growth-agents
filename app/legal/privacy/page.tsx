import React from 'react';
import Topbar from '@/components/Topbar';

export default function PrivacyPage(): JSX.Element {
  return (
    <main className="min-h-screen bg-gradient-to-b from-neutral-50 to-white">
      <Topbar email={undefined} />

      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-10 space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">Privacy Policy</h1>
          <p className="text-sm text-neutral-600">
            We respect your privacy. This is placeholder copy for MVP—replace with your actual policy before GA.
          </p>
        </header>

        <section className="rounded-2xl border border-neutral-200 bg-white/70 p-5 shadow-sm backdrop-blur space-y-4">
          <h2 className="text-sm font-medium">1. Information we collect</h2>
          <ul className="text-sm text-neutral-700 list-disc list-inside space-y-1">
            <li>Account data (name, email) via OAuth/SSO.</li>
            <li>Configuration data (company, timezone, Slack webhook, CSV URL).</li>
            <li>Usage logs for reliability and security.</li>
          </ul>
        </section>

        <section className="rounded-2xl border border-neutral-200 bg-white/70 p-5 shadow-sm backdrop-blur space-y-4">
          <h2 className="text-sm font-medium">2. How we use data</h2>
          <ul className="text-sm text-neutral-700 list-disc list-inside space-y-1">
            <li>To provide digests, alerts, and dashboards.</li>
            <li>To improve reliability, detect abuse, and support customers.</li>
            <li>To send service emails (e.g., digest, critical updates).</li>
          </ul>
        </section>

        <section className="rounded-2xl border border-neutral-200 bg-white/70 p-5 shadow-sm backdrop-blur space-y-4">
          <h2 className="text-sm font-medium">3. Sharing</h2>
          <p className="text-sm text-neutral-700">
            We don’t sell personal data. We use vetted processors (e.g., hosting, email) under appropriate agreements.
          </p>
        </section>

        <section className="rounded-2xl border border-neutral-200 bg-white/70 p-5 shadow-sm backdrop-blur space-y-4">
          <h2 className="text-sm font-medium">4. Security</h2>
          <p className="text-sm text-neutral-700">
            We apply industry best practices; no method is 100% secure. Contact us for security disclosures.
          </p>
        </section>

        <section className="rounded-2xl border border-neutral-200 bg-white/70 p-5 shadow-sm backdrop-blur space-y-4">
          <h2 className="text-sm font-medium">5. Your rights</h2>
          <ul className="text-sm text-neutral-700 list-disc list-inside space-y-1">
            <li>Access, update, or delete your data.</li>
            <li>Contact: <a className="underline" href="mailto:hello@growthagents.io">hello@growthagents.io</a></li>
          </ul>
        </section>

        <footer className="text-xs text-neutral-500">
          Last updated: {new Date().toLocaleDateString()}
        </footer>
      </div>
    </main>
  );
}
