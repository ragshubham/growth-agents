// app/api/cron/spend-digest/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { localYMD } from '@/lib/date';
import { withRetries } from '@/lib/retry';
import { postToSlack } from '@/lib/slack';

type MetaResp = {
  spend: number;
  impressions: number;
  clicks: number;
  source: 'meta-graph' | 'csv-fallback';
};

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Variant switch: set SHIELD_ALWAYS_DAILY=false to be silent on “all safe” days
const ALWAYS_DAILY = /^(1|true|yes)$/i.test(String(process.env.SHIELD_ALWAYS_DAILY ?? 'true'));

function isCronAuthorized(req: Request) {
  const cron = (req.headers.get('x-vercel-cron') || '').trim();
  const bearer = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
  const secret = process.env.CRON_SECRET || '';
  return cron === '1' || (secret && bearer && bearer === secret);
}

/** ---------- tiny helpers ---------- */
function ymdInTz(d: Date, tz: string) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz || 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d); // "YYYY-MM-DD"
}
function getYmdsForYesterdayAndPrior(tz: string) {
  const todayYmd = ymdInTz(new Date(), tz);
  const today0 = new Date(`${todayYmd}T00:00:00.000Z`);
  const yest0 = new Date(today0.getTime() - 24 * 60 * 60 * 1000);
  const prev0 = new Date(today0.getTime() - 2 * 24 * 60 * 60 * 1000);
  return {
    ymdYesterday: ymdInTz(yest0, tz),
    ymdDayBefore: ymdInTz(prev0, tz),
    ymdToday: todayYmd,
  };
}
function accountIdFromEnv() {
  const raw = process.env.META_AD_ACCOUNT_ID || '';
  return raw.replace(/^act[_=]/, ''); // tolerate "act_123" or "act=123"
}
async function fetchMetaDaily(ymd: string): Promise<MetaResp> {
  const accountId = accountIdFromEnv();
  const TOKEN = process.env.META_ACCESS_TOKEN;
  if (!accountId || !TOKEN) {
    const miss = !accountId ? 'META_AD_ACCOUNT_ID' : 'META_ACCESS_TOKEN';
    const e: any = new Error(`Missing ${miss}`);
    e.status = 500;
    throw e;
  }
  const url = new URL(`https://graph.facebook.com/v20.0/act_${accountId}/insights`);
  url.searchParams.set('time_range', JSON.stringify({ since: ymd, until: ymd }));
  url.searchParams.set('fields', 'spend,impressions,clicks');
  url.searchParams.set('access_token', TOKEN);

  const res = await fetch(url.toString(), { cache: 'no-store' });
  if (!res.ok) {
    const body = await res.text();
    const err: any = new Error(`Meta insights ${res.status}`);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  const json: any = await res.json();
  const row = json?.data?.[0] ?? {};
  return {
    spend: Number(row.spend ?? 0),
    impressions: Number(row.impressions ?? 0),
    clicks: Number(row.clicks ?? 0),
    source: 'meta-graph',
  };
}
function pctChange(curr: number, prev: number): string {
  if (!isFinite(curr) || !isFinite(prev) || prev === 0) return '(–)';
  const pct = ((curr - prev) / prev) * 100;
  const arrow = pct > 0 ? '↑' : pct < 0 ? '↓' : '→';
  return `${arrow} ${Math.abs(pct).toFixed(1)}%`;
}
function monthDayLabel(ymd: string, tz: string) {
  const d = new Date(`${ymd}T00:00:00.000Z`);
  return new Intl.DateTimeFormat('en-US', { timeZone: tz, month: 'short', day: '2-digit' }).format(d);
}
function buildShieldDigestBlocks(
  brandName: string | undefined,
  ymd: string,
  tz: string,
  currency: string,
  yday: { ymd: string; spend: number; impressions: number; clicks: number },
  prior: { ymd: string; spend: number },
  safety: { cap?: number; nearCap?: boolean; overCap?: boolean; trackingGapNote?: string | null },
) {
  const header = `🛡️ Shield Digest — ${ymd}`;

  const noData = yday.spend === 0 && yday.impressions === 0 && yday.clicks === 0;
  const safe = !safety.overCap && !safety.nearCap && !safety.trackingGapNote && !noData;

  let safetyLine: string;
  if (noData) safetyLine = '⚠️ *No valid data yesterday* — check Meta connection or account activity';
  else if (safe) safetyLine = '✅ *Safe:* Budget pacing & integrity checks OK';
  else safetyLine = '⚠️ *Attention needed*';

  const bullets: string[] = [];
  if (!noData) {
    if (safety.overCap) bullets.push(`*Cap hit:* Spend reached daily cap (${currency} ${safety.cap})`);
    else if (safety.nearCap) bullets.push(`*Cap risk:* Spend ≥80% of daily cap (${currency} ${safety.cap})`);
    if (safety.trackingGapNote) bullets.push(`*Tracking gap:* ${safety.trackingGapNote}`);
  }

  const spendDelta = pctChange(yday.spend, prior.spend);

  const lines: any[] = [
    { type: 'header', text: { type: 'plain_text', text: header } },
    { type: 'context', elements: [{ type: 'mrkdwn', text: brandName ? `*${brandName}*` : '_Daily safety summary_' }] },
    { type: 'section', text: { type: 'mrkdwn', text: safetyLine } },
  ];
  if (bullets.length) {
    lines.push({ type: 'section', text: { type: 'mrkdwn', text: bullets.map((b) => `• ${b}`).join('\n') } });
  }
  lines.push({
    type: 'section',
    text: {
      type: 'mrkdwn',
      text:
        `*Yesterday (${monthDayLabel(yday.ymd, tz)}) vs ${monthDayLabel(prior.ymd, tz)}*\n` +
        `• *Spend:* ${currency} ${yday.spend.toFixed(2)} ${spendDelta}\n` +
        `• *Impr:* ${yday.impressions.toLocaleString()}  •  *Clicks:* ${yday.clicks.toLocaleString()}`,
    },
  });
  lines.push({ type: 'context', elements: [{ type: 'mrkdwn', text: `_Source: Meta Graph • ${ymd}_` }] });
  return { blocks: lines, noData };
}
/** ----------------------------------------------------------- */

export async function GET(req: Request) {
  try {
    if (!isCronAuthorized(req)) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const dry = url.searchParams.get('dry') === '1' || url.searchParams.get('dry') === 'true';
    const debug = url.searchParams.get('debug') === '1';

    // Load company (no session in cron)
    const session = await auth().catch(() => null);
    const userEmail = session?.user?.email || null;
    const user = userEmail
      ? await prisma.user.findUnique({ where: { email: userEmail }, include: { company: true } })
      : null;

    const company = user?.company ?? (await prisma.company.findFirst());
    if (!company) return NextResponse.json({ ok: false, error: 'No company found' }, { status: 404 });

    const tz = company.timezone || 'Asia/Kolkata';
    const { date: runDate, ymd } = localYMD(tz);
    const { ymdYesterday, ymdDayBefore } = getYmdsForYesterdayAndPrior(tz);

    // ---- Fetch Meta (yesterday & day-before) with retries ----
    const ydayMeta = await withRetries(() => fetchMetaDaily(ymdYesterday), { retries: 2, baseMs: 600 });
    const priorMeta = await withRetries(() => fetchMetaDaily(ymdDayBefore), { retries: 2, baseMs: 600 });

    // ---- Guardrail checks ----
    const cap = company.dailyMetaCap ?? 0;
    const nearCap = cap > 0 && ydayMeta.spend >= 0.8 * cap;
    const overCap = cap > 0 && ydayMeta.spend >= cap;
    const source: MetaResp['source'] = 'meta-graph';

    // ---- Idempotency: did we already post for this local business day+source? ----
    const existing = await prisma.cronRun.findUnique({
      where: { companyId_runDate_source: { companyId: company.id, runDate, source } },
    });
    if (existing?.posted && !dry) {
      return NextResponse.json({
        ok: true,
        source,
        dry,
        alreadyPosted: true,
        spend: Number(existing.spend ?? 0),
        cap: Number(existing.cap ?? 0),
        posted: false,
        ymd,
        period: { yesterday: ymdYesterday, dayBefore: ymdDayBefore },
        variant: ALWAYS_DAILY ? 'A' : 'B',
      });
    }

    // ---- Log BEFORE posting ----
    await prisma.cronRun.upsert({
      where: { companyId_runDate_source: { companyId: company.id, runDate, source } },
      create: {
        companyId: company.id,
        runDate,
        source,
        ok: true,
        posted: false,
        spend: ydayMeta.spend as any,
        cap: (cap || undefined) as any,
      },
      update: {
        ok: true,
        posted: existing?.posted ?? false,
        spend: ydayMeta.spend as any,
        cap: (cap || undefined) as any,
      },
    });

    // ---- Variant B short-circuit (silent when Safe) ----
    const trackingGapNote: string | null = null; // slot for GA4/Shopify later
    const noData = ydayMeta.spend === 0 && ydayMeta.impressions === 0 && ydayMeta.clicks === 0;
    const isSafe = !overCap && !nearCap && !trackingGapNote && !noData;

    let posted = false;
    let errorJson: string | undefined;

    if (!ALWAYS_DAILY && isSafe) {
      await prisma.cronRun.update({
        where: { companyId_runDate_source: { companyId: company.id, runDate, source } },
        data: { posted: false, ok: true },
      });
      return NextResponse.json({
        ok: true,
        source,
        dry,
        ymd,
        period: { yesterday: ymdYesterday, dayBefore: ymdDayBefore },
        spend: ydayMeta.spend,
        spendPrev: priorMeta.spend,
        cap,
        posted: false,
        skipped: 'silent_safe',
        variant: 'B',
        noDataToday: noData,
        ...(debug ? { debug: { companyId: company.id } } : {}),
      });
    }

    // ---- Build Slack blocks (safety-first + no-data awareness) ----
    const { blocks, noData: noDataFlag } = buildShieldDigestBlocks(
      company.name || undefined,
      ymd,
      tz,
      company.currencyCode || 'USD',
      { ymd: ymdYesterday, spend: ydayMeta.spend, impressions: ydayMeta.impressions, clicks: ydayMeta.clicks },
      { ymd: ymdDayBefore, spend: priorMeta.spend },
      { cap, nearCap, overCap, trackingGapNote },
    );

    // ---- Post to Slack (Global) ----
    if (!dry && company.slackWebhookUrl) {
      try {
        await postToSlack(company.slackWebhookUrl, blocks);
        posted = true;
      } catch (err: any) {
        errorJson = safeStringify(err);
      }
    }

    // ---- Update log AFTER posting ----
    await prisma.cronRun.update({
      where: { companyId_runDate_source: { companyId: company.id, runDate, source } },
      data: { posted, ok: posted || !!dry, errorJson },
    });

    return NextResponse.json({
      ok: true,
      source,
      dry,
      ymd,
      period: { yesterday: ymdYesterday, dayBefore: ymdDayBefore },
      spend: ydayMeta.spend,
      spendPrev: priorMeta.spend,
      cap,
      posted,
      variant: ALWAYS_DAILY ? 'A' : 'B',
      noDataToday: noDataFlag,
      ...(debug ? { debug: { companyId: company.id } } : {}),
    });
  } catch (e: any) {
    const status = e?.status && Number.isInteger(e.status) ? e.status : 500;
    return NextResponse.json(
      {
        ok: false,
        error: String(e?.message || e),
        details: e?.body ? String(e.body).slice(0, 400) : undefined,
      },
      { status },
    );
  }
}

function safeStringify(err: any) {
  try {
    return JSON.stringify(err, Object.getOwnPropertyNames(err));
  } catch {
    try {
      return JSON.stringify({ message: String(err) });
    } catch {
      return 'unknown';
    }
  }
}
