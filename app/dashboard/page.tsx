// app/dashboard/page.tsx
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { CheckCircle2, Mail, Clock, Activity } from 'lucide-react';
import Topbar from '@/components/Topbar';

type Health = { db?: string; resend?: string; cron?: string };

export default async function DashboardPage() {
  // --- Server-side gating (keeps your current logic) ---
  const session = await auth();
  if (!session?.user?.email) redirect('/signin');

  const user = await prisma.user.findUnique({
    where: { email: session.user.email! },
    select: { companyId: true },
  });
  if (!user?.companyId) redirect('/onboarding');

  // --- Fetch health server-side (no client JS required) ---
  let health: Health = {};
  try {
    const base = process.env.NEXTAUTH_URL ?? '';
    const res = await fetch(`${base}/api/health`, { cache: 'no-store' });
    health = await res.json();
  } catch {
    health = { db: 'error', resend: 'error', cron: 'error' };
  }

  const ok = (v?: string) => v === 'ok';

  // --- UI ---
  return (
    <main className="min-h-screen bg-gradient-to-b from-neutral-50 to-white">
      <Topbar email={session.user.email} />

      {/* Header */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-neutral-600">
            Your daily growth safety net — run a mock digest, send a test email, and check system health.
          </p>
        </div>
      </section>

      {/* Health row */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <HealthCard
            icon={<CheckCircle2 className={`h-4 w-4 ${ok(health.db) ? 'text-emerald-600' : 'text-amber-600'}`} />}
            title="Database"
            value={ok(health.db) ? 'OK' : 'Check'}
            hint={ok(health.db) ? 'Connected' : 'Connection issue'}
          />
          <HealthCard
            icon={<Mail className={`h-4 w-4 ${ok(health.resend) ? 'text-emerald-600' : 'text-amber-600'}`} />}
            title="Email (Resend)"
            value={ok(health.resend) ? 'OK' : 'Check'}
            hint={ok(health.resend) ? 'API key detected' : 'Missing/invalid key'}
          />
          <HealthCard
            icon={<Clock className={`h-4 w-4 ${ok(health.cron) ? 'text-emerald-600' : 'text-amber-600'}`} />}
            title="Cron"
            value={ok(health.cron) ? 'OK' : 'Check'}
            hint={ok(health.cron) ? 'Scheduled' : 'Configure in Vercel'}
          />
        </div>
      </section>

      {/* Actions */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <ActionCard
            icon={<Activity className="h-5 w-5" />}
            title="Run mock digest"
            desc="Safe preview — posts to Slack log/DM (if configured), no email required."
            href="/api/digest?mock=1"
            cta="Run mock"
          />
          <ActionCard
            icon={<Mail className="h-5 w-5" />}
            title="Send test email"
            desc="Send today’s digest email to your account email."
            href={`/api/digest?to=${encodeURIComponent(session.user.email!)}`}
            cta="Send email"
          />
        </div>
      </section>

      {/* Preview / activity */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-12">
        <div className="rounded-2xl border border-neutral-200 bg-white/70 p-5 shadow-sm backdrop-blur">
          <div className="flex items-center gap-2 text-sm text-neutral-600">
            <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-emerald-500"></span>
            Today’s Shield Digest (preview)
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <PreviewStat label="Spend (7d)" value="₹3.6L" />
            <PreviewStat label="Blended ROAS" value="3.1x" />
            <PreviewStat label="Anomalies" value="4" />
          </div>
          <ul className="mt-4 space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <span className="mt-1 inline-block h-2 w-2 rounded-full bg-amber-500"></span>
              Budget pacing at 82% — raise +₹12,000 to hit goal
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 inline-block h-2 w-2 rounded-full bg-red-500"></span>
              Pixel fired 0 times in the last 2 hours on /checkout
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 inline-block h-2 w-2 rounded-full bg-blue-500"></span>
              Creative CTR dropped 21% — rotate 3 top winners
            </li>
          </ul>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-white/60">
        <div className="mx-auto max-w-7xl px-4 py-6 text-center text-xs text-neutral-500">
          © {new Date().getFullYear()} GrowthAgents.io — All rights reserved.
        </div>
      </footer>
    </main>
  );
}

/* ---------------- UI bits ---------------- */

function HealthCard({
  icon,
  title,
  value,
  hint,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white/70 p-4 shadow-sm backdrop-blur transition hover:shadow-md">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <div className="text-sm text-neutral-600">{title}</div>
        </div>
        <div className="text-sm font-semibold">{value}</div>
      </div>
      <div className="mt-2 text-xs text-neutral-500">{hint}</div>
    </div>
  );
}

function ActionCard({
  icon,
  title,
  desc,
  href,
  cta,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  href: string;
  cta: string;
}) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white/70 p-5 shadow-sm backdrop-blur">
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="text-sm font-medium">{title}</h3>
      </div>
      <p className="mt-2 text-sm text-neutral-600">{desc}</p>
      <div className="mt-4">
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white shadow hover:brightness-110"
        >
          {cta}
        </a>
      </div>
    </div>
  );
}

function PreviewStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white/70 p-3 text-center">
      <div className="text-[11px] text-neutral-500">{label}</div>
      <div className="text-base font-semibold tracking-tight">{value}</div>
    </div>
  );
}
