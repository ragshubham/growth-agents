// app/api/cron/weekly-receipt/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { postToSlack } from '@/lib/slack';
import { withRetries } from '@/lib/retry';
import { localYMD } from '@/lib/date';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Same auth as your daily route
function isCronAuthorized(req: Request) {
  const cron = (req.headers.get('x-vercel-cron') || '').trim();
  const bearer = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
  const secret = process.env.CRON_SECRET || '';
  return (cron === '1') || (secret && bearer && bearer === secret);
}

/** ---------- small helpers (inline) ---------- */
function ymdInTz(d: Date, tz: string) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz || 'Asia/Kolkata',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(d); // "YYYY-MM-DD"
}
function addDaysUTC(d: Date, days: number) {
  return new Date(d.getTime() + days * 24 * 60 * 60 * 1000);
}
function labelRange(startYMD: string, endYMD: string, tz: string) {
  const fmt = new Intl.DateTimeFormat('en-US', { timeZone: tz, month: 'short', day: '2-digit' });
  const s = fmt.format(new Date(`${startYMD}T00:00:00.000Z`));
  const e = fmt.format(new Date(`${endYMD}T00:00:00.000Z`));
  return `${s} → ${e}`;
}
function asYMD(d: Date, tz: string) { return ymdInTz(d, tz); }

// Slack blocks for the weekly “Value Receipt”
function buildWeeklyBlocks(opts: {
  companyName?: string;
  tz: string;
  currency: string;
  rangeLabel: string;
  totalSpend: number;
  daysTotal: number;
  daysSafe: number;
  capHits: number;
  capRisks: number;
  failures: number;
}) {
  const {
    companyName, tz, currency, rangeLabel,
    totalSpend, daysTotal, daysSafe, capHits, capRisks, failures,
  } = opts;

  const safeLine = failures === 0 && capHits === 0 ? '✅ *Four nines calm:* No failures or hard cap hits detected' : '⚠️ *Attention in the week:* See bullets below';

  const bullets: string[] = [];
  if (capHits > 0) bullets.push(`*Cap hit:* ${capHits} day(s) reached the daily cap`);
  if (capRisks > 0) bullets.push(`*Cap risk:* ${capRisks} day(s) at ≥80% of daily cap`);
  if (failures > 0) bullets.push(`*Failures:* ${failures} run(s) with errors (data/transport)`);

  const header = `🛡️ Shield Weekly Receipt — ${rangeLabel}`;
  const context = companyName ? `*${companyName}*` : '_Weekly safety summary_';

  const lines: any[] = [
    { type: 'header', text: { type: 'plain_text', text: header } },
    { type: 'context', elements: [{ type: 'mrkdwn', text: context }] },
    { type: 'section', text: { type: 'mrkdwn', text: safeLine } },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text:
          `• *Days all-safe:* ${daysSafe}/${daysTotal}\n` +
          `• *Total ad spend monitored:* ${currency} ${totalSpend.toFixed(2)}\n` +
          (bullets.length ? bullets.map(b => `• ${b}`).join('\n') : '• *Incidents:* None worth noting 🎉')
      }
    },
    { type: 'context', elements: [{ type: 'mrkdwn', text: `_Source: Meta Graph • Window: ${rangeLabel}_` }] },
  ];

  return lines;
}
/** ------------------------------------------- */

export async function GET(req: Request) {
  try {
    if (!isCronAuthorized(req)) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const dry = url.searchParams.get('dry') === '1' || url.searchParams.get('dry') === 'true';
    const debug = url.searchParams.get('debug') === '1';

    // Load company (cron may not have a session)
    const session = await auth().catch(() => null);
    const userEmail = session?.user?.email || null;
    const user = userEmail
      ? await prisma.user.findUnique({
          where: { email: userEmail },
          include: { company: true },
        })
      : null;

    const company = user?.company ?? (await prisma.company.findFirst());
    if (!company) {
      return NextResponse.json({ ok: false, error: 'No company found' }, { status: 404 });
    }

    const tz = company.timezone || 'Asia/Kolkata';
    const currency = company.currencyCode || 'USD';

    // Compute a 7-day window ending *yesterday* in company local time
    const { ymd: todayYMD } = localYMD(tz);
    const today0 = new Date(`${todayYMD}T00:00:00.000Z`);
    const end = addDaysUTC(today0, -1); // yesterday
    const start = addDaysUTC(end, -6);  // 7 days total: end-6 .. end

    const startYMD = asYMD(start, tz);
    const endYMD = asYMD(end, tz);
    const rangeLabel = labelRange(startYMD, endYMD, tz);

    // Pull CronRun rows for this company+source window
    const source: 'meta-graph' = 'meta-graph';
    const rows = await prisma.cronRun.findMany({
      where: {
        companyId: company.id,
        source,
        runDate: { gte: new Date(`${startYMD}T00:00:00.000Z`), lte: new Date(`${endYMD}T00:00:00.000Z`) },
      },
      orderBy: { runDate: 'asc' },
    });

    // Reduce to weekly stats
    let totalSpend = 0;
    let daysTotal = 0;
    let daysSafe = 0;
    let capHits = 0;
    let capRisks = 0;
    let failures = 0;

    const dailyByYmd = new Map<string, { spend: number; cap?: number | null; ok: boolean; error?: string | null }>();

    for (const r of rows) {
      // Note: runDate was stored as a Date object (local business day). Convert to YMD for stable grouping.
      const ymd = ymdInTz(r.runDate, tz);
      const spend = Number(r.spend ?? 0);
      const cap = r.cap ? Number(r.cap) : null;
      const ok = !!r.ok;
      const error = r.errorJson || null;

      // If multiple sources/runs per day existed, prefer the latest ok=true; here we just overwrite (they should be unique per schema).
      dailyByYmd.set(ymd, { spend, cap, ok, error });
    }

    // Ensure we iterate exactly the 7 days (even if no row exists for a day)
    for (let i = 0; i < 7; i++) {
      const d = addDaysUTC(start, i);
      const y = asYMD(d, tz);
      const day = dailyByYmd.get(y);

      daysTotal += 1;

      if (!day) {
        // No data logged that day → count as failure to be conservative
        failures += 1;
        continue;
      }

      totalSpend += day.spend;

      // Cap signals
      if (day.cap && day.cap > 0) {
        if (day.spend >= day.cap) capHits += 1;
        else if (day.spend >= 0.8 * day.cap) capRisks += 1;
      }

      // Safe if ok=true and not near/hit cap
      const nearOrHit = day.cap && day.cap > 0 && (day.spend >= 0.8 * day.cap);
      if (day.ok && !nearOrHit && !day.error) {
        daysSafe += 1;
      } else if (!day.ok || day.error) {
        failures += 1;
      }
    }

    // Build Slack blocks
    const blocks = buildWeeklyBlocks({
      companyName: company.name || undefined,
      tz,
      currency,
      rangeLabel,
      totalSpend,
      daysTotal,
      daysSafe,
      capHits,
      capRisks,
      failures,
    });

    // Post (or dry-run)
    let posted = false;
    let errorJson: string | undefined;

    if (!dry && company.slackWebhookUrl) {
      try {
        await withRetries(() => postToSlack(company.slackWebhookUrl!, blocks), { retries: 1, baseMs: 400 });
        posted = true;
      } catch (err: any) {
        errorJson = safeStringify(err);
      }
    }

    // Return JSON for visibility/testing
    return NextResponse.json({
      ok: true,
      dry,
      posted,
      period: { start: startYMD, end: endYMD, label: rangeLabel },
      totals: { spend: totalSpend },
      counts: { daysTotal, daysSafe, capHits, capRisks, failures },
      ...(debug ? { debug: { rows: rows.length, companyId: company.id } } : {}),
      errorJson,
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
