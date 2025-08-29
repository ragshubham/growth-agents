export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { postToSlack } from "@/lib/slack";

function isoUTCToday() {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * GET /api/cron/spend-digest?dry=1
 * Auth: either Authorization: Bearer <CRON_SECRET> OR x-vercel-cron: 1
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const dry = url.searchParams.get("dry") === "1";

  // ---- Auth (CRON_SECRET or Vercel Cron) ----
  const auth = req.headers.get("authorization") || "";
  const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7) : "";
  const isVercelCron = req.headers.get("x-vercel-cron") === "1";
  if (!isVercelCron && (!token || token !== process.env.CRON_SECRET)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  try {
    // Load company + webhooks + cap
    const company = await prisma.company.findFirst({
      select: {
        id: true,
        name: true,
        currencyCode: true,
        summaryWebhookUrl: true,
        slackWebhookUrl: true,
        dailyMetaCap: true,
      },
    });
    if (!company) {
      return NextResponse.json({ ok: false, error: "no company configured" }, { status: 400 });
    }

    const currency = company.currencyCode || "USD";
    const cap = company.dailyMetaCap ?? 0;
    const webhook = company.summaryWebhookUrl || company.slackWebhookUrl;

    // ---- Meta Graph API (direct) ----
    const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
    let ACT = process.env.META_AD_ACCOUNT_ID || "";
    ACT = ACT.replace(/^act[_=]?/, "act_");
    if (!ACCESS_TOKEN || !ACT) {
      return NextResponse.json({ ok: false, error: "META env vars missing" }, { status: 500 });
    }

    const today = isoUTCToday(); // YYYY-MM-DD UTC
    const params = new URLSearchParams({
      time_range: JSON.stringify({ since: today, until: today }),
      fields: "spend,impressions,clicks",
      level: "account",
      access_token: ACCESS_TOKEN,
    });
    const graphURL = `https://graph.facebook.com/v19.0/${ACT}/insights?${params.toString()}`;

    const r = await fetch(graphURL, { method: "GET", cache: "no-store" });
    const bodyText = await r.text();
    if (!r.ok) {
      return NextResponse.json({ ok: false, error: `meta insights ${r.status}: ${bodyText}` }, { status: 502 });
    }

    const j = JSON.parse(bodyText);
    const row = Array.isArray(j.data) ? j.data[0] ?? {} : {};
    const spend = Number(row.spend ?? 0);
    const impressions = Number(row.impressions ?? 0);
    const clicks = Number(row.clicks ?? 0);

    // ---- Slack blocks ----
    const over = cap > 0 && spend > cap;
    const fmt = (n: number) =>
      new Intl.NumberFormat(undefined, { style: "currency", currency }).format(n);

    const blocks = [
      { type: "header", text: { type: "plain_text", text: `Daily Spend — ${company.name}`, emoji: true } },
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: `*Meta*\n${fmt(spend)}` },
          { type: "mrkdwn", text: `*Impressions*\n${Number(impressions).toLocaleString()}` },
          { type: "mrkdwn", text: `*Clicks*\n${Number(clicks).toLocaleString()}` },
          { type: "mrkdwn", text: `*Guardrail*\n${cap ? fmt(cap) : "—"}` },
        ],
      },
      {
        type: "context",
        elements: [
          { type: "mrkdwn", text: over ? ":rotating_light: *Over budget today!*" : ":white_check_mark: On track" },
        ],
      },
    ] as any[];

    if (webhook && !dry) {
      await postToSlack(webhook, blocks as any);
    }

    return NextResponse.json({
      ok: true,
      source: "meta-graph",
      dry,
      spend,
      impressions,
      clicks,
      cap,
      posted: !!webhook && !dry,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}
