// app/api/cron/spend-digest/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { localYMD } from '@/lib/date';
import { withRetries } from '@/lib/retry';
// import { fetchMetaNumbers } from '@/lib/meta'; // your existing code if factored out
import { postToSlack } from '@/lib/slack';

type MetaResp = {
  spend: number;
  impressions: number;
  clicks: number;
  source: 'meta-graph' | 'csv-fallback';
};

export const runtime = 'nodejs';

function isCronAuthorized(req: Request) {
  const cron = (req.headers.get('x-vercel-cron') || '').trim();
  const bearer = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
  const secret = process.env.CRON_SECRET || '';
  return (cron === '1') || (secret && bearer && bearer === secret);
}

export async function GET(req: Request) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const dry = url.searchParams.get('dry') === '1' || url.searchParams.get('dry') === 'true';

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

  // ---- Fetch Meta with safe retries (use your existing implementation) ----
  const meta: MetaResp = await withRetries(async () => {
    // If you already have working code inline in this file, keep it and just return in this shape:
    // const { spend, impressions, clicks, source } = await existingMetaFetch();
    // return { spend, impressions, clicks, source };
    // Or if you have a helper: return await fetchMetaNumbers(company);
    throw new Error('Wire your existing Meta fetch here: return { spend, impressions, clicks, source: "meta-graph" }');
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

  if (!dry) {
    try {
      // Compose your message (numbers must come from code, not LLM)
      const overCap = cap > 0 && meta.spend >= cap;
      const nearCap = cap > 0 && meta.spend >= 0.8 * cap;
      const title = overCap ? 'CRIT: Meta daily cap hit'
                  : nearCap ? 'WARN: Meta spend nearing cap'
                  : 'Daily spend digest';

      // ✅ FIX: pass blocks array (your postToSlack likely expects SlackBlock[])
      await postToSlack(company.slackWebhookUrl!, [
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
  });
}

function safeStringify(err: any) {
  try { return JSON.stringify(err, Object.getOwnPropertyNames(err)); }
  catch { try { return JSON.stringify({ message: String(err) }); } catch { return 'unknown'; } }
}
