export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { postToSlack } from "@/lib/slack";

function ok(req: Request) {
  const header = req.headers.get("authorization") || "";
  return header === `Bearer ${process.env.CRON_SECRET}`;
}

export async function GET(req: Request) {
  if (!ok(req)) return new NextResponse("Unauthorized", { status: 401 });

  try {
    // quick DB ping so we fail early with a readable error
    await prisma.$queryRaw`SELECT 1`;

    // allow ?dry=1 to skip Slack calls during testing
    const url = new URL(req.url);
    const dry = url.searchParams.get("dry") === "1";

    const users = await prisma.user.findMany({
      where: { onboardingComplete: true, slackWebhookUrl: { not: null } },
      select: { companyName: true, slackWebhookUrl: true, email: true },
    });

    let sent = 0;
    for (const u of users) {
      if (!u.slackWebhookUrl) continue;
      if (dry) { sent++; continue; }

      const res = await postToSlack(u.slackWebhookUrl, {
        text: `Daily digest for ${u.companyName || u.email}`,
        blocks: [
          { type: "header", text: { type: "plain_text", text: "📈 Daily Digest (MVP)" } },
          { type: "section", text: { type: "mrkdwn", text: "Good morning! Placeholder digest.\n• Metric A: 123\n• Metric B: 4.56%\n• Alerts: none" } },
        ],
      });
      if (res.ok) sent++;
      else console.error("Slack error:", res.error);
    }

    return NextResponse.json({ ok: true, users: users.length, sent, dry });
  } catch (e: any) {
    console.error("CRON /digest error:", e?.message, e?.stack);
    return NextResponse.json(
      { ok: false, error: e?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
