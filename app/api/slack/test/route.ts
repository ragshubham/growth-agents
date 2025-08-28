// app/api/slack/test/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { pickSlackWebhook, postToSlack, isValidSlackWebhook } from '@/lib/notify';

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email! },
    include: { company: true },
  });
  if (!user?.company) {
    return NextResponse.json({ ok: false, error: 'Company not found' }, { status: 404 });
  }

  const body = await req.json().catch(() => ({} as any));
  const target = (body.target as 'global' | 'summary' | 'brand') || 'global';
  const brand = (body.brand as string) || undefined;

  let webhook: string | null = null;
  if (target === 'global') webhook = user.company.slackWebhookUrl || null;
  else if (target === 'summary') webhook = pickSlackWebhook({ company: user.company, purpose: 'summary' });
  else if (target === 'brand') webhook = pickSlackWebhook({ company: user.company, purpose: 'alert', brandName: brand });

  if (!webhook || !isValidSlackWebhook(webhook)) {
    return NextResponse.json({ ok: false, error: 'No valid webhook configured for this target.' }, { status: 400 });
  }

  const payload = {
    text: 'Shield Agent — Test',
    blocks: [
      { type: 'header', text: { type: 'plain_text', text: 'Shield Agent — Test', emoji: true } },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `✅ Test message via *${target.toUpperCase()}*${brand ? ` (brand: *${brand}*)` : ''}.\nIf you can see this, routing works.`,
        },
      },
    ],
  };

  try {
    await postToSlack(webhook, payload);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Failed to send' }, { status: 500 });
  }
}
