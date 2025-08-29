// app/api/cron/spend-digest/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { postToSlack } from '@/lib/slack';

/** ---- AUTH: supports 3 ways ----
 *  1) Authorization: Bearer <CRON_SECRET>
 *  2) Vercel scheduler header in prod (x-vercel-cron)
 *  3) ?key=<CRON_SECRET> query param (keeps your current vercel.json working)
 */
function isAuthorized(req: Request) {
  const url = new URL(req.url);
  const key = url.searchParams.get('key');

  const bearer = req.headers.get('authorization');
  const byHeader = bearer === `Bearer ${process.env.CRON_SECRET}`;

  const byQuery = !!key && key === process.env.CRON_SECRET;

  const byVercelCron = !!process.env.VERCEL && !!req.headers.get('x-vercel-cron');

  return byHeader || byQuery || byVercelCron;
}

/** Build a simple, readable Slack blocks digest */
function digestBlocks(opts: {
  company: string;
  currency: string;
  spend: number;
  impressions: number;
  clicks: number;
  cap: number;
  over: boolean;
}) {
  const { company, currency, spend, impressions, clicks, cap, over } = opts;
  const money = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n);

  return [
    {
      type: 'header',
      text: { type: 'plain_text', text: `📊 Daily Ad Spend — ${company}` },
    },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*Today's Spend:*\n${money(spend)}` },
        { type: 'mrkdwn', text: `*Guardrail Cap:*\n${cap ? money(cap) : '—'}` },
        { type: 'mrkdwn', text: `*Impressions:*\n${impressions.toLocaleString()}` },
        { type: 'mrkdwn', text: `*Clicks:*\n${clicks.toLocaleString()}` },
        { type: 'mrkdwn', text: `*Status:*\n${over ? '🚨 Over budget' : '✅ On track'}` },
      ],
    },
  ];
}

export async function GET(req: Request) {
  try {
    if (!isAuthorized(req)) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Get your single company (expand to findMany if you support multiple)
    const company = await prisma.company.findFirst({
      select: {
        id: true,
        name: true,
        currencyCode: true,
        dailyMetaCap: true,
        slackWebhookUrl: true,
        summaryWebhookUrl: true,
      },
    });
    if (!company) return NextResponse.json({ ok: false, error: 'No company' }, { status: 400 });

    // Pull real spend from your internal endpoint (already wired to Meta)
    const base = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const r = await fetch(`${base}/api/meta/spend`, { cache: 'no-store' });
    const j = await r.json().catch(() => ({} as any));

    const row = Array.isArray(j?.data) ? j.data[0] : undefined;
    const spend = row?.spend ? Number(row.spend) : 0;
    const impressions = row?.impressions ? Number(row.impressions) : 0;
    const clicks = row?.clicks ? Number(row.clicks) : 0;

    const currency = (company.currencyCode || 'USD').toUpperCase();
    const cap = typeof company.dailyMetaCap === 'number' ? company.dailyMetaCap : 0;
    const over = cap > 0 && spend > cap;

    const webhook = company.summaryWebhookUrl || company.slackWebhookUrl || '';
    if (!webhook) return NextResponse.json({ ok: true, skipped: 'no webhook' });

    const blocks = digestBlocks({
      company: company.name || 'Company',
      currency,
      spend,
      impressions,
      clicks,
      cap,
      over,
    });

    const res = await postToSlack(webhook, blocks);

    return NextResponse.json({
      ok: !!res.ok,
      posted: !!res.ok,
      spend,
      impressions,
      clicks,
      cap,
      over,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || 'digest cron failed' },
      { status: 500 }
    );
  }
}
