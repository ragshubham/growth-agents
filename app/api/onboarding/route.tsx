import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const form = await req.formData();
  const skip = form.get("skip");

  if (skip) {
    await prisma.user.update({
      where: { email: session.user.email! },
      data: { onboardingComplete: true },
    });
    return NextResponse.json({ ok: true });
  }

  const companyName = (form.get("companyName") || "").toString().trim();
  const timezone = (form.get("timezone") || "").toString().trim();
  const slackWebhookUrl = (form.get("slackWebhookUrl") || "").toString().trim();

  if (!companyName || !timezone) {
    return new NextResponse("Missing fields", { status: 400 });
  }

  await prisma.user.update({
    where: { email: session.user.email! },
    data: {
      companyName,
      timezone,
      slackWebhookUrl: slackWebhookUrl || null,
      onboardingComplete: true,
    },
  });

  return NextResponse.json({ ok: true });
}
