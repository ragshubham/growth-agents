import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) return new NextResponse("Unauthorized", { status: 401 });
  const me = await prisma.user.findUnique({
    where: { email: session.user.email! },
    select: { companyName: true, timezone: true, slackWebhookUrl: true },
  });
  return NextResponse.json(me || {});
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) return new NextResponse("Unauthorized", { status: 401 });
  const body = await req.json().catch(() => ({}));
  const { companyName, timezone, slackWebhookUrl } = body || {};
  await prisma.user.update({
    where: { email: session.user.email! },
    data: { companyName, timezone, slackWebhookUrl },
  });
  return NextResponse.json({ ok: true });
}
