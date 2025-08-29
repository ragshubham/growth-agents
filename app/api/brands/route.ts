// app/api/brands/route.ts
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ ok: false }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { email: session.user.email! },
    select: { companyId: true },
  });
  if (!user?.companyId) return NextResponse.json({ ok: true, brands: [] });

  const brands = await prisma.brand.findMany({
    where: { companyId: user.companyId },
    orderBy: { createdAt: 'asc' },
    select: { id: true, name: true, currencyCode: true },
  });

  return NextResponse.json({ ok: true, brands });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ ok: false }, { status: 401 });

  const { name, currencyCode = 'USD' } = await req.json().catch(() => ({}));
  if (!name) return NextResponse.json({ ok: false, error: 'Name required' }, { status: 400 });

  const u = await prisma.user.findUnique({
    where: { email: session.user.email! },
    select: { companyId: true },
  });
  if (!u?.companyId) return NextResponse.json({ ok: false, error: 'No company' }, { status: 400 });

  const brand = await prisma.brand.create({
    data: {
      companyId: u.companyId,
      name,
      currencyCode: String(currencyCode).toUpperCase(),
    },
    select: { id: true, name: true, currencyCode: true },
  });

  return NextResponse.json({ ok: true, brand });
}
