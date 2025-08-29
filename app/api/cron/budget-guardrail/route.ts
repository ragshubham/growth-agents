import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { postToSlack, overBudgetBlocks } from '@/lib/slack';

/** ---- AUTH HELPER (no secret in URL) ------------------------------
 *  1) Authorization: Bearer <CRON_SECRET>
 *  2) Vercel scheduler in prod (x-vercel-cron header)
 */
function isAuthorized(req: Request) {
  const bearer = req.headers.get('authorization');
  const byHeader = bearer === `Bearer ${process.env.CRON_SECRET}`;

  // Vercel adds this when invoking via vercel.json "crons" in production
  const byVercelCron = !!process.env.VERCEL && !!req.headers.get('x-vercel-cron');

  return byHeader || byVercelCron;
}

/* ---------------------------- helpers ---------------------------- */

function ymd(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

async function fetchTodaySpend(token: string, accountId: string) {
  const id = accountId.startsWith('act_') ? accountId : `act_${accountId}`;
  const today = ymd(new Date());
  const tr = encodeURIComponent(JSON.stringify({ since: today, until: today }));
  const url = `https://graph.facebook.com/v19.0/${id}/insights?level=account&fields=spend,impressions,clicks&time_range=${tr}&time_increment=1`;

  const r = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!r.ok) throw new Error(`Meta ${r.status}: ${await r.text()}`);

  const j = await r.json().catch(() => ({} as any));
  const row = Array.isArray(j?.data) ? j.data[0] : undefined;

  return {
    spend: Number(row?.spend || 0) || 0,
    impressions: Number(row?.impressions || 0) || 0,
    clicks: Number(row?.clicks || 0) || 0,
  };
}

async function pickAdAccount(token: string, companyId: string): Promise<string | null> {
  // Try DB first (most reliable)
  const db = await prisma.adAccount.findFirst({
    where: { provider: 'meta', brand: { companyId } },
    orderBy: { updatedAt: 'desc' },
    select: { externalId: true },
  });
  if (db?.externalId) return db.externalId.startsWith('act_') ? db.externalId : `act_${db.externalId}`;

  // Fallback to Meta API: first attached account on the token
  const res = await fetch(
    'https://graph.facebook.com/v19.0/me/adaccounts?fields=id,account_id,name,currency,account_status&limit=50',
    { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' }
  );
  if (!res.ok) return null;
  const j = await res.json().catch(() => ({}));
  const first = j?.data?.[0]?.id || j?.data?.[0]?.account_id;
  if (!first) return null;
  return String(first).startsWith('act_') ? String(first) : `act_${first}`;
}

/* ------------------------------ GET ------------------------------ */

export async function GET(req: Request) {
  try {
    if (!isAuthorized(req)) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const token = process.env.META_ACCESS_TOKEN?.trim();
    if (!token) {
      return NextResponse.json({ ok: false, error: 'META_ACCESS_TOKEN missing' }, { status: 500 });
    }

    const companies = await prisma.company.findMany({
      select: {
        id: true,
        name: true,
        currencyCode: true,
        dailyMetaCap: true,
        slackWebhookUrl: true,
        summaryWebhookUrl: true,
      },
    });

    const results: Array<{
      company: string;
      skipped?: string;
      posted?: boolean;
      account?: string;
      spend?: number;
      cap?: number;
    }> = [];

    for (const c of companies) {
      const webhook = c.summaryWebhookUrl || c.slackWebhookUrl;
      const cap = typeof c.dailyMetaCap === 'number' ? c.dailyMetaCap : 0;

      if (!webhook || !cap) {
        results.push({ company: c.name || c.id, skipped: 'no webhook/cap' });
        continue;
      }

      const account = await pickAdAccount(token, c.id);
      if (!account) {
        results.push({ company: c.name || c.id, skipped: 'no ad account (DB+API)' });
        continue;
      }

      const { spend } = await fetchTodaySpend(token, account);

      if (spend <= cap) {
        results.push({ company: c.name || c.id, account, spend, cap });
        continue;
      }

      const currency = (c.currencyCode || 'USD').toUpperCase();
      await postToSlack(
        webhook,
        overBudgetBlocks('Meta', spend, cap, currency),
        `Over budget: ${c.name || 'Company'}`
      );

      results.push({ company: c.name || c.id, posted: true, account, spend, cap });
    }

    return NextResponse.json({ ok: true, results });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || 'guardrail cron failed' },
      { status: 500 }
    );
  }
}
