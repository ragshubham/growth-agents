// app/api/settings/route.ts
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

function isValidSlackWebhook(url: string) {
  return /^https:\/\/hooks\.slack\.com\/services\/.+/.test(url);
}
function isValidHHMM(s: string) {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(s);
  return !!m;
}
function isValidMinSeverity(s: string): s is "OK" | "WARN" | "CRIT" {
  return s === "OK" || s === "WARN" || s === "CRIT";
}
function clampHour(h: unknown, fallback = 9) {
  const n = Number(h);
  if (Number.isFinite(n) && n >= 0 && n <= 23) return Math.floor(n);
  return fallback;
}
function isPlainObject(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

function parseBrandWebhookMap(input: unknown): Record<string, string> {
  if (isPlainObject(input)) {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(input)) {
      if (typeof v === "string" && k.trim()) out[k.trim()] = v.trim();
    }
    return out;
  }
  if (typeof input === "string") {
    const s = input.trim();
    if (!s) return {};
    try {
      const obj = JSON.parse(s);
      if (isPlainObject(obj)) return parseBrandWebhookMap(obj);
    } catch {}
    const lines = s.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const out: Record<string, string> = {};
    for (const line of lines) {
      const parts = line.split(/=|,|\|/).map(p => p.trim()).filter(Boolean);
      if (parts.length >= 2) {
        const brand = parts[0];
        const url = parts.slice(1).join(" ");
        if (brand && url) out[brand] = url;
      }
    }
    return out;
  }
  return {};
}

async function getCurrentUserBySession() {
  const session = await auth();
  if (!session?.user?.email) return null;
  return prisma.user.findUnique({
    where: { email: session.user.email! },
    select: { id: true, email: true, companyId: true },
  });
}

export async function GET() {
  try {
    const u = await getCurrentUserBySession();
    if (!u) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const company = u.companyId
      ? await prisma.company.findUnique({
          where: { id: u.companyId },
          select: {
            id: true,
            name: true,
            timezone: true,
            slackWebhookUrl: true,
            sheetCsvUrl: true,
            minSeverity: true,
            quietHoursStart: true,
            quietHoursEnd: true,
            digestHourLocal: true,
            summaryWebhookUrl: true,
            brandWebhookUrls: true,
            currencyCode: true, // NEW
          },
        })
      : null;

    const brandMap =
      isPlainObject(company?.brandWebhookUrls)
        ? Object.entries(company!.brandWebhookUrls as Record<string, unknown>)
            .filter(([k, v]) => typeof v === "string" && !!k)
            .reduce((acc, [k, v]) => { acc[k] = v as string; return acc; }, {} as Record<string, string>)
        : {};

    return NextResponse.json({
      ok: true,
      companyId: company?.id ?? null,
      companyName: company?.name ?? "",
      timezone: company?.timezone ?? "Asia/Kolkata",
      slackWebhookUrl: company?.slackWebhookUrl ?? "",
      sheetCsvUrl: company?.sheetCsvUrl ?? "",
      minSeverity: company?.minSeverity ?? "OK",
      quietHoursStart: company?.quietHoursStart ?? "21:00",
      quietHoursEnd: company?.quietHoursEnd ?? "07:00",
      digestHourLocal: company?.digestHourLocal ?? 9,
      summaryWebhookUrl: company?.summaryWebhookUrl ?? "",
      brandWebhookUrls: brandMap,
      currencyCode: (company?.currencyCode ?? "USD").toUpperCase(), // NEW
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Failed" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  return handleUpsert(req);
}

// Support POST as well, in case the form submits with POST
export async function POST(req: Request) {
  return handleUpsert(req);
}

async function handleUpsert(req: Request) {
  try {
    const u = await getCurrentUserBySession();
    if (!u) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    let companyName = "";
    let timezone = "";
    let slackWebhookUrl: string | null = null;
    let sheetCsvUrl: string | null = null;

    let minSeverity: "OK" | "WARN" | "CRIT" = "OK";
    let quietHoursStart: string = "21:00";
    let quietHoursEnd: string = "07:00";
    let digestHourLocal: number = 9;

    let summaryWebhookUrl: string | null = null;
    let brandWebhookUrlsMap: Record<string, string> = {};

    let currencyCode: string = "USD";

    const ctype = req.headers.get("content-type") || "";
    if (ctype.includes("application/json")) {
      const body = await req.json().catch(() => ({} as any));
      companyName = (body.companyName || "").trim();
      timezone = (body.timezone || "").trim();
      slackWebhookUrl = (body.slackWebhookUrl || "")?.trim() || null;
      sheetCsvUrl = (body.sheetCsvUrl || "")?.trim() || null;

      if (isValidMinSeverity(body.minSeverity)) minSeverity = body.minSeverity;
      if (typeof body.quietHoursStart === "string" && isValidHHMM(body.quietHoursStart)) quietHoursStart = body.quietHoursStart;
      if (typeof body.quietHoursEnd === "string" && isValidHHMM(body.quietHoursEnd)) quietHoursEnd = body.quietHoursEnd;
      digestHourLocal = clampHour(body.digestHourLocal, 9);

      summaryWebhookUrl = (body.summaryWebhookUrl || "")?.trim() || null;
      brandWebhookUrlsMap = parseBrandWebhookMap(body.brandWebhookUrls ?? body.brandWebhookUrlsText ?? {});
      currencyCode = String(body.currencyCode || "USD").trim().toUpperCase();
    } else {
      const form = await req.formData();
      companyName = String(form.get("companyName") || "").trim();
      timezone = String(form.get("timezone") || "").trim();
      slackWebhookUrl = String(form.get("slackWebhookUrl") || "").trim() || null;
      sheetCsvUrl = String(form.get("sheetCsvUrl") || "").trim() || null;

      const sev = String(form.get("minSeverity") || "OK").trim();
      if (isValidMinSeverity(sev)) minSeverity = sev;
      const qhs = String(form.get("quietHoursStart") || "21:00").trim();
      if (isValidHHMM(qhs)) quietHoursStart = qhs;
      const qhe = String(form.get("quietHoursEnd") || "07:00").trim();
      if (isValidHHMM(qhe)) quietHoursEnd = qhe;
      digestHourLocal = clampHour(form.get("digestHourLocal"), 9);

      const sum = String(form.get("summaryWebhookUrl") || "").trim();
      summaryWebhookUrl = sum || null;

      const brandsRaw =
        (form.get("brandWebhookUrls") as string) ??
        (form.get("brandWebhookUrlsText") as string) ??
        "";
      brandWebhookUrlsMap = parseBrandWebhookMap(brandsRaw);

      currencyCode = String(form.get("currencyCode") || "USD").trim().toUpperCase();
    }

    if (!/^[A-Z]{3}$/.test(currencyCode)) currencyCode = "USD";
    if (!companyName || !timezone) return NextResponse.json({ ok: false, error: "Missing fields" }, { status: 400 });

    if (slackWebhookUrl && !isValidSlackWebhook(slackWebhookUrl)) {
      return NextResponse.json({ ok: false, error: "Invalid Slack webhook URL (global)" }, { status: 400 });
    }
    if (summaryWebhookUrl && !isValidSlackWebhook(summaryWebhookUrl)) {
      return NextResponse.json({ ok: false, error: "Invalid Slack webhook URL (summary)" }, { status: 400 });
    }
    const invalidBrandEntries = Object.entries(brandWebhookUrlsMap).filter(([, url]) => !isValidSlackWebhook(url));
    if (invalidBrandEntries.length > 0) {
      const badKeys = invalidBrandEntries.map(([k]) => k).join(", ");
      return NextResponse.json({ ok: false, error: `Invalid Slack webhook URL(s) for brand(s): ${badKeys}` }, { status: 400 });
    }

    const companyId = u.companyId ?? `cmp_${u.id}`;

    const company = await prisma.company.upsert({
      where: { id: companyId },
      update: {
        name: companyName,
        timezone,
        slackWebhookUrl,
        sheetCsvUrl,
        minSeverity,
        quietHoursStart,
        quietHoursEnd,
        digestHourLocal,
        summaryWebhookUrl,
        brandWebhookUrls: brandWebhookUrlsMap,
        currencyCode, // NEW
        updatedAt: new Date(),
      },
      create: {
        id: companyId,
        name: companyName,
        timezone,
        slackWebhookUrl,
        sheetCsvUrl,
        minSeverity,
        quietHoursStart,
        quietHoursEnd,
        digestHourLocal,
        summaryWebhookUrl,
        brandWebhookUrls: brandWebhookUrlsMap,
        currencyCode, // NEW
      },
      select: {
        id: true,
        name: true,
        timezone: true,
        slackWebhookUrl: true,
        sheetCsvUrl: true,
        minSeverity: true,
        quietHoursStart: true,
        quietHoursEnd: true,
        digestHourLocal: true,
        summaryWebhookUrl: true,
        brandWebhookUrls: true,
        currencyCode: true,
      },
    });

    if (!u.companyId) {
      await prisma.user.update({
        where: { id: u.id },
        data: { companyId: company.id },
      });
    }

    // prevent caching at any layer
    const res = NextResponse.json({ ok: true, company });
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    return res;
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Failed" }, { status: 500 });
  }
}
