// app/api/dashboard/crit/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { localYMD } from '@/lib/date';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function ymdInTz(d: Date, tz: string) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz || 'Asia/Kolkata',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(d); // "YYYY-MM-DD"
}

function addDaysUTC(d: Date, days: number) {
  return new Date(d.getTime() + days * 24 * 60 * 60 * 1000);
}

export async function GET(req: Request) {
  try {
    // Load company (no session for cron, but dashboard calls usually have one)
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
    const { ymd: todayYMD } = localYMD(tz);

    // Build a 14-day window ending yesterday in local business time
    const today0 = new Date(`${todayYMD}T00:00:00.000Z`);
    const end = addDaysUTC(today0, -1);      // yesterday
    const start = addDaysUTC(end, -13);      // last 14 days inclusive

    // Pull CronRun rows for meta-graph (the only source we alert on today)
    const rows = await prisma.cronRun.findMany({
      where: {
        companyId: company.id,
        source: 'meta-graph',
        runDate: {
          gte: start,
          lte: end,
        },
      },
      orderBy: { runDate: 'asc' },
    });

    // Reduce to a per-day map (should already be unique by schema)
    const daily = new Map<string, { spend: number; cap: number | null; ok: boolean; error?: string | null }>();
    for (const r of rows) {
      const ymd = ymdInTz(r.runDate, tz);
      daily.set(ymd, {
        spend: Number(r.spend ?? 0),
        cap: r.cap != null ? Number(r.cap) : null,
        ok: !!r.ok,
        error: r.errorJson || null,
      });
    }

    // Compute 14-day series with CRIT flag (cap hit for now)
    const series: Array<{ ymd: string; crit: boolean; reason: string[] }> = [];
    let critYesterday = false;

    for (let i = 0; i < 14; i++) {
      const d = addDaysUTC(start, i);
      const ymd = ymdInTz(d, tz);
      const day = daily.get(ymd);

      const reasons: string[] = [];
      let crit = false;

      if (day) {
        // CRIT rule v1: spend >= cap (only when cap > 0)
        if (day.cap && day.cap > 0 && day.spend >= day.cap) {
          crit = true;
          reasons.push('cap_hit');
        }
        // Future CRITs can be added here:
        // - tracking_gap (pixel=0, GA4 mismatch, etc)
        // - spend_spike, etc.
      } else {
        // No row for this local business day – don’t mark CRIT, but you might track this later.
      }

      if (ymd === ymdInTz(end, tz) && crit) critYesterday = true;

      series.push({ ymd, crit, reason: reasons });
    }

    const critCount = series.filter(d => d.crit).length;

    return NextResponse.json({
      ok: true,
      tz,
      window: { start: ymdInTz(start, tz), end: ymdInTz(end, tz), days: 14 },
      yesterday: { ymd: ymdInTz(end, tz), crit: critYesterday },
      counts: { critLast14: critCount },
      series,
    });
  } catch (e: any) {
    const status = e?.status && Number.isInteger(e.status) ? e.status : 500;
    return NextResponse.json(
      { ok: false, error: String(e?.message || e) },
      { status }
    );
  }
}
