// app/api/onboarding/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { postToSlack, welcomeBlock } from "@/lib/slack";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const form = await req.formData();
  const skip = form.get("skip");

  // Current user with company
  const user = await prisma.user.findUnique({
    where: { email: session.user.email! },
    include: { company: true },
  });
  if (!user) return new NextResponse("User not found", { status: 404 });

  // Helper: ensure user has a company record (id = cmp_<userId>)
  async function ensureCompany({
    name,
    timezone,
    slackWebhookUrl,
  }: {
    name: string;
    timezone: string;
    slackWebhookUrl: string | null;
  }) {
    const companyId = user.companyId ?? `cmp_${user.id}`;

    await prisma.company.upsert({
      where: { id: companyId },
      update: {
        name,
        timezone,
        slackWebhookUrl,
        updatedAt: new Date(),
      },
      create: {
        id: companyId,
        name,
        timezone,
        slackWebhookUrl,
      },
    });

    if (!user.companyId) {
      await prisma.user.update({
        where: { id: user.id },
        data: { companyId },
      });
    }

    return { companyId };
  }

  if (skip) {
    // Minimal path: create/link a placeholder company if missing
    const fallbackName = user.company?.name || "Your Company";
    const fallbackTz = user.company?.timezone || "UTC";
    const fallbackWebhook = user.company?.slackWebhookUrl ?? null;

    await ensureCompany({
      name: fallbackName,
      timezone: fallbackTz,
      slackWebhookUrl: fallbackWebhook,
    });

    // Optional: send welcome if we already have a webhook
    if (fallbackWebhook) {
      await postToSlack(fallbackWebhook, welcomeBlock(fallbackName));
    }

    return NextResponse.json({ ok: true, skipped: true });
  }

  // Full submit
  const companyName = (form.get("companyName") || "").toString().trim();
  const timezone = ((form.get("timezone") || "").toString().trim()) || "UTC";
  const slackWebhookUrlRaw = (form.get("slackWebhookUrl") || "").toString().trim();
  const slackWebhookUrl = slackWebhookUrlRaw ? slackWebhookUrlRaw : null;

  if (!companyName || !timezone) {
    return new NextResponse("Missing fields", { status: 400 });
  }

  await ensureCompany({
    name: companyName,
    timezone,
    slackWebhookUrl,
  });

  // Send welcome/test ping using the freshest webhook (form > existing)
  const webhookToUse = slackWebhookUrl ?? user.company?.slackWebhookUrl ?? null;
  if (webhookToUse) {
    await postToSlack(webhookToUse, welcomeBlock(companyName));
  }

  return NextResponse.json({ ok: true });
}
