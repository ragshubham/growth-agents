// app/api/settings/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

/**
 * Helper: get current user by session email.
 * Returns { id, email, companyId } or null.
 */
async function getCurrentUserBySession() {
  const session = await auth();
  if (!session?.user?.email) return null;

  const user = await prisma.user.findUnique({
    where: { email: session.user.email! },
    select: { id: true, email: true, companyId: true, company: true },
  });

  return user;
}

/**
 * GET /api/settings
 * Returns current company's settings for the logged-in user.
 */
export async function GET() {
  try {
    const u = await getCurrentUserBySession();
    if (!u) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    let company = null as null | {
      id: string;
      name: string | null;
      timezone: string | null;
      slackWebhookUrl: string | null;
      sheetCsvUrl: string | null;
    };

    if (u.companyId) {
      company = await prisma.company.findUnique({
        where: { id: u.companyId },
        select: { id: true, name: true, timezone: true, slackWebhookUrl: true, sheetCsvUrl: true },
      });
    }

    return NextResponse.json({
      ok: true,
      companyId: company?.id ?? null,
      companyName: company?.name ?? "",
      timezone: company?.timezone ?? "Asia/Kolkata", // <-- IST fallback
      slackWebhookUrl: company?.slackWebhookUrl ?? "",
      sheetCsvUrl: company?.sheetCsvUrl ?? "",
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Failed" }, { status: 500 });
  }
}

/**
 * PUT /api/settings
 * Accepts JSON OR form-data. Creates/updates Company and links user if needed.
 */
export async function PUT(req: Request) {
  try {
    const u = await getCurrentUserBySession();
    if (!u) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    let companyName = "";
    let timezone = "";
    let slackWebhookUrl: string | null = null;
    let sheetCsvUrl: string | null = null;

    const ctype = req.headers.get("content-type") || "";
    if (ctype.includes("application/json")) {
      const body = await req.json().catch(() => ({} as any));
      companyName = (body.companyName || "").trim();
      timezone = (body.timezone || "").trim();
      slackWebhookUrl = (body.slackWebhookUrl || "")?.trim() || null;
      sheetCsvUrl = (body.sheetCsvUrl || "")?.trim() || null;
    } else {
      const form = await req.formData();
      companyName = String(form.get("companyName") || "").trim();
      timezone = String(form.get("timezone") || "").trim();
      slackWebhookUrl = String(form.get("slackWebhookUrl") || "").trim() || null;
      sheetCsvUrl = String(form.get("sheetCsvUrl") || "").trim() || null;
    }

    if (!companyName || !timezone) {
      return NextResponse.json({ ok: false, error: "Missing fields" }, { status: 400 });
    }

    // Slack URL validation
    if (slackWebhookUrl && !/^https:\/\/hooks\.slack\.com\/services\//.test(slackWebhookUrl)) {
      return NextResponse.json({ ok: false, error: "Invalid Slack webhook URL" }, { status: 400 });
    }

    const companyId = u.companyId ?? `cmp_${u.id}`;

    const company = await prisma.company.upsert({
      where: { id: companyId },
      update: {
        name: companyName,
        timezone,
        slackWebhookUrl,
        sheetCsvUrl,
        updatedAt: new Date(),
      },
      create: {
        id: companyId,
        name: companyName,
        timezone,
        slackWebhookUrl,
        sheetCsvUrl,
      },
      select: { id: true, name: true, timezone: true, slackWebhookUrl: true, sheetCsvUrl: true },
    });

    if (!u.companyId) {
      await prisma.user.update({
        where: { id: u.id },
        data: { companyId: company.id },
      });
    }

    return NextResponse.json({ ok: true, company });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Failed" }, { status: 500 });
  }
}
