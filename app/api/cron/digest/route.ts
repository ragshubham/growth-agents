// app/api/cron/digest/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { postToSlack } from '@/lib/slack';
import { formatSlackDigest, formatEmailDigest, type DigestPayload } from '@/lib/digest';
import { nowInTz, getHHMM, isWithinQuietHours } from "@/lib/time";
import { filterByMinSeverity, onlyNonCritical } from "@/lib/digest_prefs";
import { pickSlackWebhook } from '@/lib/notify'; // ✅ summary/global routing

// OPTIONAL: if you want email sending in the same pass
// import { sendEmail } from '@/lib/email';

function ok(req: Request) {
  const header = req.headers.get('authorization') || '';
  const isSecret = header === `Bearer ${process.env.CRON_SECRET}`;
  const isVercelCron = req.headers.get('x-vercel-cron') === '1';
  return isSecret || isVercelCron;
}

export async function GET(req: Request) {
  if (!ok(req)) return new NextResponse('Unauthorized', { status: 401 });

  try {
    // health check DB
    await prisma.$queryRaw`SELECT 1`;

    const env = process.env.VERCEL_ENV || process.env.NODE_ENV || 'development';
    const byCron = req.headers.get('x-vercel-cron') === '1';
    const url = new URL(req.url);
    const dryParam = url.searchParams.get('dry') === '1';
    const dry = !env.includes('production') ? true : dryParam; // non-prod always dry

    // STEP 3: pull recipients + company prefs (include summaryWebhookUrl)
    const rows = await prisma.user.findMany({
      where: { companyId: { not: null } },
      select: {
        email: true,
        company: {
          select: {
            name: true,
            slackWebhookUrl: true,
            summaryWebhookUrl: true, // 👈 NEW: digest prefers this
            timezone: true,
            minSeverity: true,
            quietHoursStart: true,
            quietHoursEnd: true,
            digestHourLocal: true,
          },
        },
      },
    });

    // helper: build a sample digest payload (replace with real detectors later)
    const buildPayload = (brand: string): DigestPayload => ({
      dateISO: new Date().toISOString(),
      summary: { ok: 5, warn: 2, crit: 1 },
      items: [
        { brand, kind: "CRIT", title: "Creative fatigue detected", detail: "CTR ↓40% on Ad Set #4", link: "#" },
        { brand, kind: "WARN", title: "Budget pacing risk", detail: "85% spent • 30% month left", link: "#" },
        { brand, kind: "OK", title: "Shopify revenue stable", detail: "7-day +4%" },
      ],
      sourceNote: "Meta CSV • GA4 • Updated 8:45 AM",
    });

    let sentSlack = 0;
    let queuedEmail = 0;

    // optional debug counters for skips
    let skippedByHour = 0;
    let skippedByQuiet = 0;
    let skippedByMinSeverity = 0;
    let skippedNoWebhook = 0;

    for (const r of rows) {
      const brand = r.company?.name || r.email || 'Your company';

      const payload = buildPayload(brand);

      // STEP 4: apply prefs gating BEFORE sending

      // 1) filter by min severity
      const min = (r.company?.minSeverity as "OK" | "WARN" | "CRIT") || "OK";
      payload.items = filterByMinSeverity(payload.items, min);

      // if nothing left after filtering → skip
      if (!payload.items.length) {
        skippedByMinSeverity++;
        continue;
      }

      // 2) quiet hours suppression for non-critical days
      const tz = r.company?.timezone || "Asia/Kolkata";
      const nowLocal = nowInTz(tz);
      const hhmm = getHHMM(nowLocal);
      const inQuiet = isWithinQuietHours(hhmm, r.company?.quietHoursStart, r.company?.quietHoursEnd);

      if (inQuiet && onlyNonCritical(payload.items)) {
        skippedByQuiet++;
        continue;
      }

      // 3) local-hour gating (send only at chosen hour)
      const targetHour =
        typeof r.company?.digestHourLocal === "number"
          ? (r.company!.digestHourLocal as number)
          : 9;

      if (nowLocal.getHours() !== targetHour) {
        skippedByHour++;
        continue;
      }

      // ✅ PICK WEBHOOK FOR SUMMARY (summary -> global)
      const webhook = pickSlackWebhook({
        company: {
          slackWebhookUrl: r.company?.slackWebhookUrl,
          summaryWebhookUrl: r.company?.summaryWebhookUrl,
          brandWebhookUrls: null, // not used for digest
        },
        purpose: 'summary',
      });

      if (!webhook) {
        skippedNoWebhook++;
        continue;
      }

      // SLACK send
      const prefix = byCron ? '🕒 Daily Digest' : '🧪 Test Digest';
      const text = `${prefix}\n\n${formatSlackDigest(payload)}`;

      if (!dry) {
        const res = await postToSlack(webhook, text); // your helper accepts plain string
        if ((res as any)?.ok === false) {
          console.error('Slack error:', (res as any)?.error);
        } else {
          sentSlack++;
        }
      } else {
        sentSlack++;
      }

      // EMAIL (optional; uncomment if you want email out of this route)
      /*
      if (r.email) {
        const html = formatEmailDigest(payload);
        if (!dry) {
          await sendEmail({ to: r.email, subject: "🛡 Daily Growth Digest", html });
        }
        queuedEmail++;
      }
      */
    }

    return NextResponse.json({
      ok: true,
      users: rows.length,
      sentSlack,
      queuedEmail,
      dry,
      env,
      // debug info helps during pilots
      skipped: {
        noWebhook: skippedNoWebhook,
        byHour: skippedByHour,
        byQuietHours: skippedByQuiet,
        byMinSeverity: skippedByMinSeverity,
      },
    });
  } catch (e: any) {
    console.error('CRON /digest error:', e?.message, e?.stack);
    return NextResponse.json({ ok: false, error: e?.message || 'Unknown error' }, { status: 500 });
  }
}
