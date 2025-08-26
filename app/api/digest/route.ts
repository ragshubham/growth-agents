// app/api/digest/route.ts
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

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
    const mock = new URL(req.url).searchParams.get("mock");

    const res = await fetch(`${baseUrl(req)}/api/alerts`, { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to read alerts");
    const { alerts, updatedAt } = await res.json();

    if (mock || !resend) {
      console.log("[digest] (mock) would send to", TO, alerts);
      return NextResponse.json({ ok: true, mocked: true, alerts, updatedAt });
    }

    // ✅ Use React.createElement to avoid JSX in .ts
    const element = React.createElement(DailyShieldEmail, {
      alerts,
      asOf: updatedAt,
    });
    const html = render(element);

    await resend.emails.send({
      from: "Growth Agents <onboarding@resend.dev>",
      to: TO,
      subject: `Shield Daily Digest — ${new Date(updatedAt).toLocaleDateString()}`,
      html,
    });

    return NextResponse.json({ ok: true, sentTo: TO, count: alerts?.length ?? 0 });
  } catch (e: any) {
    console.error("[/api/digest] error:", e);
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}