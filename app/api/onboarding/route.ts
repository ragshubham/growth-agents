import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  // 1) Auth
  const session = await auth();
  if (!session?.user?.email) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  // 2) Form data
  const form = await req.formData();
  const skip = form.get("skip");
  const name = (form.get("companyName") || form.get("name") || "") as string;
  const timezone = (form.get("timezone") || "UTC") as string;
  const slackWebhookUrl = (form.get("slackWebhookUrl") || null) as string | null;

  // 3) Fetch user (may be null)
  const userMaybe = await prisma.user.findUnique({
    where: { email: session.user.email! },
    include: { company: true },
  });
  if (!userMaybe) {
    return new NextResponse("User not found", { status: 404 });
  }

  // ---- From here on, ONLY use these local vars (no more `user?.`) ----
  const userId = userMaybe.id;
  const existingCompanyId = userMaybe.companyId ?? null;

  // 4) Skip flow: ensure user has a company, then return
  if (skip) {
    if (existingCompanyId) {
      return NextResponse.json({ ok: true, skipped: true, companyId: existingCompanyId });
    }
    const newCompanyId = `cmp_${userId}`;
    const company = await prisma.company.create({
      data: {
        id: newCompanyId,
        name: name || "My Company",
        timezone: timezone || "UTC",
        slackWebhookUrl,
      },
    });
    await prisma.user.update({
      where: { id: userId },
      data: { companyId: company.id },
    });
    return NextResponse.json({ ok: true, skipped: true, companyId: company.id });
  }

  // 5) Normal flow: upsert company, then link user → company (idempotent)
  const targetCompanyId = existingCompanyId ?? `cmp_${userId}`;

  const company = await prisma.company.upsert({
    where: { id: targetCompanyId },
    update: {
      name: name || undefined,
      timezone: timezone || undefined,
      slackWebhookUrl, // nullable is fine
    },
    create: {
      id: targetCompanyId,
      name: name || "My Company",
      timezone: timezone || "UTC",
      slackWebhookUrl,
    },
  });

  if (existingCompanyId !== company.id) {
    await prisma.user.update({
      where: { id: userId },
      data: { companyId: company.id },
    });
  }

  return NextResponse.json({
    ok: true,
    companyId: company.id,
    company: {
      name: company.name,
      timezone: company.timezone,
      slackWebhookUrl: company.slackWebhookUrl,
    },
  });
}
