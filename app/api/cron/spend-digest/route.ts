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
// Ensure no static optimization caches this
export const dynamic = 'force-dynamic';

function isCronAuthorized(req: Request) {
  const cron = (req.headers.get('x-vercel-cron') || '').trim();
  const bearer = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
  const secret = process.env.CRON_SECRET || '';
  return (cron === '1') || (secret && bearer && bearer === secret);
}

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
    const user = userEmail ? await prisma.user.findUnique({
      where: { email: userEmail },
      include: { company: true },
    }) : null;

    const company = user?.company ?? await prisma.company.findFirst();
    if (!company) {
      return NextResponse.json({ ok: false, error: 'No company found' }, { status: 404 });
    }

    const { date: runDate, ymd } = localYMD(company.timezone || 'Asia/Kolkata');

    // ---- Fetch Meta with safe retries ----
    const meta: MetaResp = await withRetries(async () => {
      const AD = process.env.META_AD_ACCOUNT_ID;
      const TOKEN = process.env.META_ACCESS_TOKEN;
      if (!AD || !TOKEN) {
        const miss = !AD ? 'META_AD_ACCOUNT_ID' : 'META_ACCESS_TOKEN';
        const err: any = new Error(`Missing ${miss}`);
        err.status = 500;
        throw err;
      }

      const accountId = (process.env.META_AD_ACCOUNT_ID || '').replace(/^act_/, ''); // strip act_ if present
      const TOKEN = process.env.META_ACCESS_TOKEN;
      if (!accountId || !TOKEN) {
        const miss = !accountId ? 'META_AD_ACCOUNT_ID' : 'META_ACCESS_TOKEN';
        const err: any = new Error(`Missing ${miss}`);
        err.status = 500;
        throw err;
      }
      const graph = new URL(`https://graph.facebook.com/v20.0/act_${accountId}/insights`);

      graph.searchParams.set('date_preset', 'today');
      graph.searchParams.set('fields', 'spend,impressions,clicks');
      graph.searchParams.set('access_token', TOKEN);

      const res = await fetch(graph.toString(), { cache: 'no-store' });
      if (!res.ok) {
        const body = await res.text();
        const err: any = new Error(`Meta insights ${res.status}`);
        err.status = res.status;
        err.body = body;
        throw err;
      }

      const json: any = await res.json();
      const row = json?.data?.[0] ?? {};
      const spend = Number(row.spend ?? 0);
      const impressions = Number(row.impressions ?? 0);
      const clicks = Number(row.clicks ?? 0);

      return { spend, impressions, clicks, source: 'meta-graph' as const };
    }, { retries: 2, baseMs: 600 });

    const cap = company.dailyMetaCap ?? 0;
    const source = meta.source || 'meta-graph';

    // ---- Idempotency: did we already post today? ----
    const existing = await prisma.cronRun.findUnique({
      where: { companyId_runDate_source: { companyId: company.id, runDate, source } }
    });

    if (existing?.posted && !dry) {
      return NextResponse.json({
        ok: true, source, dry, alreadyPosted: true,
        spend: Number(existing.spend ?? 0),
        impressions: meta.impressions, clicks: meta.clicks,
        cap: Number(existing.cap ?? 0),
        posted: false, ymd,
      });
    }

    // ---- Log BEFORE posting (so failures are visible) ----
    await prisma.cronRun.upsert({
      where: { companyId_runDate_source: { companyId: company.id, runDate, source } },
      create: {
        companyId: company.id,
        runDate,
        source,
        ok: true,
        posted: false,
        spend: meta.spend as any,
        cap: (cap || undefined) as any,
      },
      update: {
        ok: true,
        posted: existing?.posted ?? false,
        spend: meta.spend as any,
        cap: (cap || undefined) as any,
      },
    });

    // ---- Post (live) or skip (dry) ----
    let posted = false;
    let errorJson: string | undefined;

    if (!dry && company.slackWebhookUrl) {
      try {
        const overCap = cap > 0 && meta.spend >= cap;
        const nearCap = cap > 0 && meta.spend >= 0.8 * cap;
        const title = overCap ? 'CRIT: Meta daily cap hit'
                              : nearCap ? 'WARN: Meta spend nearing cap'
                              : 'Daily spend digest';

        await postToSlack(company.slackWebhookUrl, [
          { type: 'header', text: { type: 'plain_text', text: `${title} — ${ymd}` } },
          { type: 'section', text: { type: 'mrkdwn', text:
            `*Spend:* ${company.currencyCode} ${meta.spend.toFixed(2)}\n` +
            `*Impr:* ${meta.impressions}  •  *Clicks:* ${meta.clicks}\n` +
            (cap ? `*Cap:* ${company.currencyCode} ${cap}\n` : '') +
            `_Source: ${source}_`
          }},
        ]);
        posted = true;
      } catch (err: any) {
        errorJson = safeStringify(err);
      }
    }

    // ---- Update log AFTER posting ----
    await prisma.cronRun.update({
      where: { companyId_runDate_source: { companyId: company.id, runDate, source } },
      data: {
        posted,
        ok: posted || !!dry, // if dry, ok=true
        errorJson,
      },
    });

    return NextResponse.json({
      ok: true,
      source,
      dry,
      spend: meta.spend,
      impressions: meta.impressions,
      clicks: meta.clicks,
      cap,
      posted,
      ymd,
      ...(debug ? { debug: { companyId: company.id } } : {}),
    });
  } catch (e: any) {
    // Always return JSON on failure so curl shows something
    const status = e?.status && Number.isInteger(e.status) ? e.status : 500;
    return NextResponse.json(
      { ok: false, error: String(e?.message || e), details: e?.body ? String(e.body).slice(0, 400) : undefined },
      { status }
    );
  }
}

function safeStringify(err: any) {
  try { return JSON.stringify(err, Object.getOwnPropertyNames(err)); }
  catch { try { return JSON.stringify({ message: String(err) }); } catch { return 'unknown'; } }
}
