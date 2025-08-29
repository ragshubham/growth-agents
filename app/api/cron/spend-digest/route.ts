export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { postToSlack } from "@/lib/slack";

function iso(date = new Date()) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * GET /api/cron/spend-digest?dry=1
 * Auth: Authorization: Bearer <CRON_SECRET>
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const dry = url.searchParams.get("dry") === "1";

  // ---- Auth (CRON_SECRET) ----
  const auth = req.headers.get("authorization") || "";
  const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7) : "";
  if (!token || token !== process.env.CRON_SECRET) {
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
    if (!company) return NextResponse.json({ ok: false, error: "no company configured" }, { status: 400 });

    const currency = company.currencyCode || "USD";
    const cap = company.dailyMetaCap ?? 0;
    const webhook = company.summaryWebhookUrl || company.slackWebhookUrl;

    // ---- Meta Graph API (direct) ----
    const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN!;
    const ACT = (process.env.META_AD_ACCOUNT_ID || "").replace(/^act[_=]?/, "act_");
    if (!ACCESS_TOKEN || !ACT) {
      throw new Error("META env vars missing");
    }

    // Today in UTC (Meta time range is inclusive)
    const today = iso(); // YYYY-MM-DD
    const params = new URLSearchParams({
      time_range: JSON.stringify({ since: today, until: today }),
      fields: "spend,impressions,clicks",
      level: "account",
      access_token: ACCESS_TOKEN,
    });

    const graphURL = `https://graph.facebook.com/v19.0/${ACT}/insights?${params.toString()}`;
    const r = await fetch(graphURL, { method: "GET", cache: "no-store" });
    const txt = await r.text();
    if (!r.ok) throw new Error(`meta insights ${r.status}: ${txt}`);

    const j = JSON.parse(txt);
    const row = Array.isArray(j.data) ? j.data[0] || {} : {};
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
