// app/api/alerts/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { fetchCsv, type CsvRow } from '@/lib/csv';
import { pickSlackWebhook, postToSlack } from '@/lib/notify';
import { nowInTz, getHHMM, isWithinQuietHours } from '@/lib/time';
import { compareSeverity, type Severity } from '@/lib/notify';

// Security: optional bearer for server-to-server calls (eg. cron or Make.com)
function ok(req: Request) {
  const h = req.headers.get('authorization') || '';
  return !process.env.ALERTS_SECRET || h === `Bearer ${process.env.ALERTS_SECRET}`;
}

/** Expected CSV headers for Phase 1: id, text, severity, updatedAt, brand? */
type AlertItem = {
  id: string;
  text: string;
  severity: Severity;     // 'OK' | 'WARN' | 'CRIT'
  updatedAt?: string;     // ISO/any
  brand?: string;         // optional
};

function rowToAlert(r: CsvRow): AlertItem | null {
  const id = r.id || r.ID || '';
  const text = r.text || r.message || '';
  const sevRaw = (r.severity || r.SEVERITY || 'OK').toUpperCase();
  const severity: Severity = (sevRaw === 'CRIT' || sevRaw === 'WARN') ? (sevRaw as Severity) : 'OK';
  const updatedAt = r.updatedAt || r.updated_at || '';
  const brand = r.brand || r.Brand || r.BRAND || undefined;
  if (!id || !text) return null;
  return { id, text, severity, updatedAt, brand };
}

export async function GET(req: Request) {
  // GET works as a preview/readiness check
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { email: session.user.email! },
    include: { company: true },
  });
  if (!user?.company) return NextResponse.json({ ok: false, error: 'Company not found' }, { status: 404 });

  const url = user.company.sheetCsvUrl;
  if (!url) return NextResponse.json({ ok: false, error: 'No CSV set. Add a CSV in Settings.' }, { status: 400 });

  try {
    const rows = await fetchCsv(url);
    const alerts = rows.map(rowToAlert).filter(Boolean) as AlertItem[];
    return NextResponse.json({ ok: true, count: alerts.length, sample: alerts.slice(0, 5) });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Failed to read CSV' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  // POST executes alerts (can be user-triggered from dashboard or a cron/automation)
  if (!ok(req)) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  // If called by logged-in user from UI, we also allow session auth:
  const session = await auth().catch(() => null);

  // Find all companies that have CSV set (multi-tenant ready)
  const companies = await prisma.company.findMany({
    where: { sheetCsvUrl: { not: null } },
    select: {
      id: true,
      name: true,
      sheetCsvUrl: true,
      timezone: true,
      minSeverity: true,
      quietHoursStart: true,
      quietHoursEnd: true,
      slackWebhookUrl: true,
      summaryWebhookUrl: true,
      brandWebhookUrls: true,
    },
  });

  const urlObj = new URL(req.url);
  const dry = urlObj.searchParams.get('dry') === '1';

  let scanned = 0;
  let sent = 0;
  let skippedBySeverity = 0;
  let skippedByQuiet = 0;
  let skippedNoWebhook = 0;

  for (const c of companies) {
    const csvUrl = c.sheetCsvUrl!;
    let rows: CsvRow[] = [];
    try {
      rows = await fetchCsv(csvUrl);
    } catch {
      continue; // skip company if CSV fails
    }

    const tz = c.timezone || 'Asia/Kolkata';
    const nowLocal = nowInTz(tz);
    const hhmm = getHHMM(nowLocal);

    for (const r of rows) {
      const a = rowToAlert(r);
      if (!a) continue;
      scanned++;

      // 1) minSeverity gate
      const min = (c.minSeverity as Severity) || 'OK';
      if (compareSeverity(a.severity, min) < 0) { skippedBySeverity++; continue; }

      // 2) quiet hours: suppress if within quiet hours AND not critical
      const inQuiet = isWithinQuietHours(hhmm, c.quietHoursStart, c.quietHoursEnd);
      if (inQuiet && a.severity !== 'CRIT') { skippedByQuiet++; continue; }

      // 3) pick webhook (brand override → global)
      const webhook = pickSlackWebhook({
        company: {
          slackWebhookUrl: c.slackWebhookUrl,
          summaryWebhookUrl: c.summaryWebhookUrl,
          brandWebhookUrls: c.brandWebhookUrls,
        },
        purpose: 'alert',
        brandName: a.brand,
      });

      if (!webhook) { skippedNoWebhook++; continue; }

      // Compose a simple alert (swap with your Block Kit when ready)
      const payload = {
        text: `[${a.severity}] ${a.text}`,
        blocks: [
          { type: 'header', text: { type: 'plain_text', text: `Alert — ${a.severity}`, emoji: true } },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `${a.text}${a.brand ? `\n*Brand:* ${a.brand}` : ''}${a.updatedAt ? `\n*When:* ${a.updatedAt}` : ''}`,
            },
          },
        ],
      };

      if (!dry) {
        try {
          await postToSlack(webhook, payload);
          sent++;
        } catch {
          // ignore individual failures; continue
        }
      } else {
        sent++; // count as would-send
      }
    }
  }

  return NextResponse.json({
    ok: true,
    dry,
    scanned,
    sent,
    skipped: {
      bySeverity: skippedBySeverity,
      byQuietHours: skippedByQuiet,
      noWebhook: skippedNoWebhook,
    },
  });
}
