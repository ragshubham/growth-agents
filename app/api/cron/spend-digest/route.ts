export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { postToSlack } from "@/lib/slack";

/**
 * GET /api/cron/spend-digest?dry=1
 * Auth: Authorization: Bearer <CRON_SECRET>
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const dry = url.searchParams.get("dry") === "1";

  // --- Auth ----------------------------------------------------
  const auth = req.headers.get("authorization") || "";
  const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7) : "";
  if (!token || token !== process.env.CRON_SECRET) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  try {
    // Load company + webhooks
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

    // --- Fetch today's Meta spend from your internal API --------
    // Assumes you already have /api/meta/spend reading from Meta Graph API.
    const base =
      process.env.NEXT_PUBLIC_BASE_URL ||
      process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}` ||
      "https://www.growthagents.io";

    const metaResp = await fetch(`${base}/api/meta/spend?date=today`, {
      method: "GET",
      headers: { "Accept": "application/json" },
      // ensure no cache in serverless
      cache: "no-store",
    });

    if (!metaResp.ok) {
      const text = await metaResp.text().catch(() => "");
      throw new Error(`meta spend failed: HTTP ${metaResp.status} ${text}`);
    }

    const metaJson = await metaResp.json().catch(() => ({}));
    // Expect metaJson like { ok: true, data: [{ spend: "34.75", impressions: "...", clicks: "..." }] }
    // Make this tolerant:
    const row = (metaJson?.data?.[0]) || metaJson?.data || {};
    const spend = Number(row.spend ?? 0);
    const impressions = Number(row.impressions ?? 0);
    const clicks = Number(row.clicks ?? 0);

    // --- Compose Slack blocks ----------------------------------
    const over = cap > 0 && spend > cap;
    const blocks = [
      { type: "header", text: { type: "plain_text", text: `Daily Spend — ${company.name}`, emoji: true } },
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: `*Meta*\n${new Intl.NumberFormat(undefined, { style: "currency", currency }).format(spend)}` },
          { type: "mrkdwn", text: `*Impressions*\n${Number(impressions).toLocaleString()}` },
          { type: "mrkdwn", text: `*Clicks*\n${Number(clicks).toLocaleString()}` },
          { type: "mrkdwn", text: `*Guardrail*\n${cap ? new Intl.NumberFormat(undefined, { style: "currency", currency }).format(cap) : "—"}` },
        ],
      },
      {
        type: "context",
        elements: [
          { type: "mrkdwn", text: over ? ":rotating_light: *Over budget today!*" : ":white_check_mark: On track" },
        ],
      },
    ] as any[];

    // --- Post or dry-run ---------------------------------------
    if (webhook && !dry) {
      await postToSlack(webhook, blocks as any); // your helper expects blocks
    }

    return NextResponse.json({
      ok: true,
      source: "meta",
      dry,
      spend,
      impressions,
      clicks,
      cap,
      posted: !!webhook && !dry,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || String(e) },
      { status: 500 }
    );
  }
}
