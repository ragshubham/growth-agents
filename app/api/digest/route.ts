// app/api/digest/route.ts
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { logRun } from "../../../lib/slack_log";
import { dmSlack } from "../../../lib/slack_dm";
import React from "react";
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { render } from "@react-email/render";
import DailyShieldEmail from "@/app/emails/DailyShieldEmail";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const TO = process.env.RESEND_TO || "you@example.com";

function baseUrl(req: Request) {
  const url = new URL(req.url);
  return `${url.protocol}//${url.host}`;
}

export async function GET(req: Request) {
  try {
    // read query + headers
    const url = new URL(req.url);
    const isCron = req.headers.get("x-vercel-cron") === "1";
    const isMock = url.searchParams.get("mock");
    const toOverride = url.searchParams.get("to");

    // SAFETY GATE:
    // - allow if mock=1
    // - allow if coming from Vercel Cron (header)
    // - allow if explicit ?to=... provided (manual run)
    if (!isMock && !isCron && !toOverride) {
      return NextResponse.json(
        { ok: false, error: "No permission to send (use ?mock=1 or ?to=...)" },
        { status: 403 }
      );
    }

    // pull alerts
    const res = await fetch(`${baseUrl(req)}/api/alerts`, { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to read alerts");
    const { alerts, updatedAt } = await res.json();

    // MOCK PATH (or when Resend not configured): return JSON + DM mock + LOG
    if (isMock || !resend) {
      console.log("[digest] (mock) would send to", toOverride || TO, alerts);
      await dmSlack(`🛡️ [Mock] Digest: ${alerts?.length ?? 0} alerts · ${updatedAt}`);
      await logRun({ ok: true, count: alerts?.length ?? 0, updatedAt, mode: "mock" });
      return NextResponse.json({ ok: true, mocked: true, alerts, updatedAt });
    }

    // REAL SEND PATH
    const element = React.createElement(DailyShieldEmail, {
      alerts,
      asOf: updatedAt,
    });
    const html = await render(element);

    await resend.emails.send({
      from: "Growth Agents <onboarding@resend.dev>",
      to: toOverride || TO,
      subject: `Shield Daily Digest — ${new Date(updatedAt).toLocaleDateString()}`,
      html,
    });

    // DM + LOG summary after real send
    await dmSlack(`🛡️ Digest sent to ${toOverride || TO} · ${alerts?.length ?? 0} alerts · ${updatedAt}`);
    await logRun({ ok: true, count: alerts?.length ?? 0, updatedAt, mode: "real" });

    return NextResponse.json({
      ok: true,
      sentTo: toOverride || TO,
      count: alerts?.length ?? 0,
    });
  } catch (e: any) {
    // failure log (use current time if we don't have updatedAt)
    try {
      await logRun({
        ok: false,
        count: 0,
        updatedAt: new Date().toISOString(),
        mode: "real",
        error: e?.message
      });
    } catch {}
    console.error("[/api/digest] error:", e);
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
