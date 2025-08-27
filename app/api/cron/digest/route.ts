export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { postToSlack } from '@/lib/slack';

function ok(req: Request) {
  const header = req.headers.get('authorization') || '';
  const isSecret = header === `Bearer ${process.env.CRON_SECRET}`;
  const isVercelCron = req.headers.get('x-vercel-cron') === '1';
  return isSecret || isVercelCron;
}

export async function GET(req: Request) {
  if (!ok(req)) return new NextResponse('Unauthorized', { status: 401 });

  try {
    await prisma.$queryRaw`SELECT 1`;

    const env = process.env.VERCEL_ENV || process.env.NODE_ENV || 'development';
    const byCron = req.headers.get('x-vercel-cron') === '1';
    const url = new URL(req.url);
    const dryParam = url.searchParams.get('dry') === '1';
    const dry = !env.includes('production') ? true : dryParam; // non-prod always dry

    // ✅ pull Company fields via relation (no User.companyName etc)
    // app/api/cron/digest/route.ts
// ...
const rows = await prisma.user.findMany({
  where: { companyId: { not: null } },   // ← remove onboardingComplete
  select: {
    email: true,
    company: { select: { name: true, slackWebhookUrl: true, timezone: true } },
  },
});

    let sent = 0;
    for (const r of rows) {
      const companyName = r.company?.name || r.email || 'Your company';
      const webhook = r.company?.slackWebhookUrl;
      if (!webhook) continue;
      if (dry) { sent++; continue; }

      const prefix = byCron ? '🕒 Cron' : '🧪 Manual';
      const title = `${prefix} · Daily Digest (MVP)`;

      const res = await postToSlack(webhook, {
        text: `${title} for ${companyName}`,
        blocks: [
          { type: 'header', text: { type: 'plain_text', text: `📈 ${title}` } },
          { type: 'section', text: { type: 'mrkdwn', text: `Good morning! Placeholder digest for *${companyName}*.\n• Metric A: 123\n• Metric B: 4.56%\n• Alerts: none` } },
          { type: 'context', elements: [{ type: 'mrkdwn', text: `Env: *${env}* • ${new Date().toLocaleString()}` }] }
        ],
      });
      if (res.ok) sent++; else console.error('Slack error:', res.error);
    }

    return NextResponse.json({ ok: true, users: rows.length, sent, dry });
  } catch (e: any) {
    console.error('CRON /digest error:', e?.message, e?.stack);
    return NextResponse.json({ ok: false, error: e?.message || 'Unknown error' }, { status: 500 });
  }
}
