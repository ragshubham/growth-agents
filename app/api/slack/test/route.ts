import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

function isSlackWebhook(url: string | null | undefined) {
  if (!url) return false;
  try {
    const u = new URL(url);
    if (u.hostname !== 'hooks.slack.com') return false;
    const parts = u.pathname.split('/').filter(Boolean); // ['services','T...','B...','...']
    return parts[0] === 'services' && parts.length === 4;
  } catch {
    return false;
  }
}

export async function POST() {
  try {
    // Require a signed-in user
    const session = await auth();
    const email = session?.user?.email;
    if (!email) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Find user + company
    const user = await prisma.user.findUnique({
      where: { email },
      select: { companyId: true, company: { select: { name: true, slackWebhookUrl: true } } },
    });
    const hook = user?.company?.slackWebhookUrl || '';
    if (!isSlackWebhook(hook)) {
      return NextResponse.json({ ok: false, error: 'No valid Slack webhook configured' }, { status: 400 });
    }

    // Send a simple test message
    const payload = {
      text: `✅ Shield test: Slack is connected for *${user?.company?.name ?? 'your company'}*.`,
    };

    const resp = await fetch(hook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!resp.ok) {
      const txt = await resp.text().catch(() => '');
      return NextResponse.json({ ok: false, error: `Slack responded ${resp.status} ${txt}` }, { status: 502 });
    }

    return NextResponse.json({ ok: true, sent: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? 'Unknown error' }, { status: 500 });
  }
}
