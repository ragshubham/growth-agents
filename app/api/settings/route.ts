// app/api/settings/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// MVP helper: get “current” user (first user)
async function getCurrentUser() {
  return prisma.user.findFirst({
    include: { company: true },
    orderBy: { createdAt: "asc" },
  });
}

export async function GET() {
  try {
    const u = await getCurrentUser();
    const c = u?.company || null;
    return NextResponse.json({
      ok: true,
      companyName: c?.name ?? "",
      timezone: c?.timezone ?? "UTC",
      slackWebhookUrl: c?.slackWebhookUrl ?? "",
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Failed" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any));
    const { companyName, timezone, slackWebhookUrl } = body || {};
    if (!companyName || !timezone) {
      return NextResponse.json({ ok: false, error: "Missing fields" }, { status: 400 });
    }

    const u = await getCurrentUser();
    if (!u) return NextResponse.json({ ok: false, error: "No user" }, { status: 404 });

    // Stable id per-user
    const companyId = u.companyId ?? `cmp_${u.id}`;

    await prisma.company.upsert({
      where: { id: companyId },
      update: { name: companyName, timezone, slackWebhookUrl: slackWebhookUrl || null, updatedAt: new Date() },
      create: {
        id: companyId,
        name: companyName,
        timezone,
        slackWebhookUrl: slackWebhookUrl || null,
      },
    });

    if (!u.companyId) {
      await prisma.user.update({
        where: { id: u.id },
        data: { companyId },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Failed" }, { status: 500 });
  }
}
