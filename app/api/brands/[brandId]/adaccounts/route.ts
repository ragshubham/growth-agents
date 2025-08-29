// app/api/brands/[brandId]/adaccounts/route.ts
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function GET(
  _req: Request,
  { params }: { params: { brandId: string } }
) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ ok: false }, { status: 401 });

  // verify brand belongs to user's company
  const user = await prisma.user.findUnique({
    where: { email: session.user.email! },
    select: { companyId: true },
  });
  if (!user?.companyId) return NextResponse.json({ ok: true, accounts: [] });

  const brand = await prisma.brand.findFirst({
    where: { id: params.brandId, companyId: user.companyId },
    select: { id: true },
  });
  if (!brand) return NextResponse.json({ ok: false, error: 'Brand not found' }, { status: 404 });

  const accounts = await prisma.adAccount.findMany({
    where: { brandId: brand.id },
    orderBy: { createdAt: 'asc' },
    select: { id: true, provider: true, externalId: true, name: true, currency: true },
  });

  return NextResponse.json({ ok: true, accounts });
}

export async function POST(
  req: Request,
  { params }: { params: { brandId: string } }
) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ ok: false }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { action, provider = 'meta', externalId, name, currency } = body || {};
  if (!['attach', 'detach'].includes(action)) {
    return NextResponse.json({ ok: false, error: 'action must be attach|detach' }, { status: 400 });
  }

  // verify brand belongs to user's company
  const user = await prisma.user.findUnique({
    where: { email: session.user.email! },
    select: { id: true, companyId: true },
  });
  if (!user?.companyId) return NextResponse.json({ ok: false, error: 'No company' }, { status: 400 });

  const brand = await prisma.brand.findFirst({
    where: { id: params.brandId, companyId: user.companyId },
    select: { id: true },
  });
  if (!brand) return NextResponse.json({ ok: false, error: 'Brand not found' }, { status: 404 });

  if (action === 'attach') {
    if (!externalId || !name) return NextResponse.json({ ok: false, error: 'Missing externalId/name' }, { status: 400 });

    const id = `${provider}:${externalId}`;
    await prisma.adAccount.upsert({
      where: { provider_externalId: { provider, externalId } },
      update: {
        brandId: brand.id,
        name,
        currency,
        connectedBy: user.id,
      },
      create: {
        id,
        brandId: brand.id,
        provider,
        externalId,
        name,
        currency,
        connectedBy: user.id,
      },
    });
    return NextResponse.json({ ok: true });
  }

  if (action === 'detach') {
    if (!externalId) return NextResponse.json({ ok: false, error: 'Missing externalId' }, { status: 400 });
    await prisma.adAccount.deleteMany({
      where: { brandId: brand.id, provider, externalId },
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: false, error: 'Unknown action' }, { status: 400 });
}
