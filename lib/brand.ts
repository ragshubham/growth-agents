// lib/brand.ts
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function getActiveBrand() {
  // kept for compatibility; now just returns ensureDefaultBrand
  return ensureDefaultBrand();
}

/** Ensures there is at least one brand for the user's company and returns it. */
export async function ensureDefaultBrand() {
  const session = await auth();
  if (!session?.user?.email) return null;

  const user = await prisma.user.findUnique({
    where: { email: session.user.email! },
    select: {
      companyId: true,
      company: {
        select: { name: true, currencyCode: true },
      },
    },
  });
  if (!user?.companyId) return null;

  // 1) If any brand exists, return the first one
  const existing = await prisma.brand.findFirst({
    where: { companyId: user.companyId },
    orderBy: { createdAt: 'asc' },
    select: { id: true, name: true, currencyCode: true },
  });
  if (existing) return existing;

  // 2) Else create a default brand with company prefs
  const name = user.company?.name?.trim() || 'Default';
  const currency = (user.company?.currencyCode || 'USD').toUpperCase();

  const created = await prisma.brand.create({
    data: {
      companyId: user.companyId,
      name,
      currencyCode: currency,
    },
    select: { id: true, name: true, currencyCode: true },
  });
  return created;
}
