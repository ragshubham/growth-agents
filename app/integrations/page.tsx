// app/integrations/page.tsx
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Topbar from '@/components/Topbar';
import { prisma } from '@/lib/prisma';
import { ensureDefaultBrand } from '@/lib/brand';
import NextDynamic from 'next/dynamic';

export const dynamic = 'force-dynamic';

// client-only meta manager
const MetaSimple = NextDynamic(() => import('@/components/Integrations/MetaSimple'), { ssr: false });

export default async function IntegrationsPage() {
  const session = await auth();
  if (!session?.user?.email) redirect('/signin');

  // ensure at least one brand
  const brand = await ensureDefaultBrand();

  // read company + slack settings directly
  const user = await prisma.user.findUnique({
    where: { email: session.user.email! },
    select: { companyId: true },
  });

  const company = user?.companyId
    ? await prisma.company.findUnique({
        where: { id: user.companyId },
        select: {
          name: true,
          slackWebhookUrl: true,
          summaryWebhookUrl: true,
          brandWebhookUrls: true,
        },
      })
    : null;

  const slackGlobalOK = Boolean(company?.slackWebhookUrl);
  const slackSummaryOK = Boolean(company?.summaryWebhookUrl);
  const brandRoutes = (company?.brandWebhookUrls as Record<string, string> | null) || {};
  const brandRouteOK = !!(brand?.name && brandRoutes[brand.name]);

  // per-brand attachments
  let metaCount = 0;
  let googleCount = 0;
  if (brand?.id) {
    [metaCount, googleCount] = await Promise.all([
      prisma.adAccount.count({ where: { brandId: brand.id, provider: 'meta' } }),
      prisma.adAccount.count({ where: { brandId: brand.id, provider: 'google_ads' } }),
    ]);
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-neutral-50 to-white">
      <Topbar email={session.user.email} />

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Integrations</h1>
          <p className="text-sm text-neutral-600">
            Connect channels for <b>{brand?.name || 'Your Brand'}</b>. We will use this to blend insights across sources.
          </p>
        </header>

        {/* Collaboration */}
        <div className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Collaboration
          </h2>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Company Slack (primary) */}
            <IntegrationCard
              title="Slack: Company"
              description="Company-wide Slack webhooks."
              right={
                <StatusPill
                  ok={slackGlobalOK || slackSummaryOK}
                  text={slackGlobalOK || slackSummaryOK ? 'Connected' : 'Not connected'}
                />
              }
              actions={[{ label: 'Manage Slack', href: '/settings' }]}
            >
              <div className="space-y-2 text-[12px] text-neutral-700">
                <Row label="Global webhook (fallback)" ok={slackGlobalOK} />
                <Row label="Summary webhook (daily or weekly digest)" ok={slackSummaryOK} />
                <p className="text-[11px] text-neutral-500">
                  The daily or weekly digest uses the Summary webhook. Alerts fall back to Global if no brand route exists.
                </p>
              </div>
            </IntegrationCard>

            {/* Brand routing */}
            <IntegrationCard
              title="Slack: Brand routing"
              description={`Alerts for ${brand?.name || 'this brand'}.`}
              right={<StatusPill ok={brandRouteOK} text={brandRouteOK ? 'Connected' : 'Not connected'} />}
              actions={[{ label: 'Manage Slack', href: '/settings' }]}
            >
              <div className="space-y-2 text-[12px] text-neutral-700">
                <Row label={`Brand webhook (${brand?.name || 'Brand'})`} ok={brandRouteOK} />
                <p className="text-[11px] text-neutral-500">
                  Brand alerts post to this webhook. If not set, they fall back to the company Global webhook.
                </p>
              </div>
            </IntegrationCard>
          </div>
        </div>

        {/* Ad channels */}
        <div className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Ad channels
          </h2>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Meta Ads */}
            <IntegrationCard
              title="Meta Ads"
              description="Import spend, conversions and ROAS from Facebook and Instagram."
              right={<StatusPill ok={metaCount > 0} text={metaCount > 0 ? 'Accounts connected' : 'Not connected'} />}
            >
              <p className="text-[12px] text-neutral-600 mb-3">
                Connect and manage Facebook and Instagram ad accounts for <b>{brand?.name || 'your brand'}</b>.
              </p>
              {brand?.id && <MetaSimple brandId={brand.id} brandName={brand.name} />}
            </IntegrationCard>

            {/* Google Ads */}
            <IntegrationCard
              title="Google Ads"
              description="Import spend, conversions and ROAS from Google."
              right={<StatusPill ok={googleCount > 0} text={googleCount > 0 ? 'Accounts connected' : 'Not connected'} />}
              actions={[{ label: 'Connect Google Ads', href: '#', disabled: true }]}
            >
              <p className="text-[12px] text-neutral-600">
                Google OAuth coming next. Once connected, you will manage accounts here just like Meta.
              </p>
            </IntegrationCard>
          </div>
        </div>

                {/* E-commerce + Analytics */}
        <div className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Other
          </h2>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Shopify */}
            <IntegrationCard
              title="Shopify"
              description="Pull orders and revenue for attribution and ROAS."
              right={<StatusPill ok={false} text="Not connected" />}
              actions={[{ label: 'Connect Shopify', href: '#', disabled: true }]}
            >
              <p className="text-[12px] text-neutral-600">Coming soon.</p>
            </IntegrationCard>

            {/* GA4 */}
            <IntegrationCard
              title="GA4"
              description="Use GA4 conversions to reconcile channel reporting."
              right={<StatusPill ok={false} text="Not connected" />}
              actions={[{ label: 'Connect GA4', href: '#', disabled: true }]}
            >
              <p className="text-[12px] text-neutral-600">Coming soon.</p>
            </IntegrationCard>
          </div>
        </div>
      </div>
    </main>
  );
}

/* ---------- tiny UI bits ---------- */

function StatusPill({ ok, text }: { ok: boolean; text: string }) {
  const cls = ok
    ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
    : 'bg-neutral-100 text-neutral-700 border-neutral-200';
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] ${cls}`}>
      {text}
    </span>
  );
}

function Row({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white px-3 py-2">
      <span>{label}</span>
      <b className={ok ? 'text-emerald-700' : 'text-neutral-500'}>{ok ? 'Connected' : 'Not set'}</b>
    </div>
  );
}

function IntegrationCard({
  title,
  description,
  right,
  actions = [],
  children,
}: {
  title: string;
  description?: string;
  right?: React.ReactNode;
  actions?: Array<{ label: string; href: string; disabled?: boolean }>;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white/90 p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium">{title}</h3>
          {description && <p className="text-[12px] text-neutral-600">{description}</p>}
        </div>
        {right}
      </div>

      <div className="mt-3">{children}</div>

      {actions.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {actions.map((a, i) => (
            <a
              key={i}
              href={a.disabled ? undefined : a.href}
              aria-disabled={a.disabled || undefined}
              className={`rounded-xl px-3 py-2 text-sm font-semibold shadow-sm ${
                a.disabled
                  ? 'cursor-not-allowed bg-neutral-200 text-neutral-500'
                  : 'bg-black text-white hover:brightness-110'
              }`}
            >
              {a.label}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
