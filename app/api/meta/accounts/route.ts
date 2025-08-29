// app/api/meta/accounts/route.ts
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export async function GET() {
  const session = await auth();
  const token = (session as any)?.metaAccessToken;
  if (!token) return NextResponse.json({ ok: false, error: 'Not connected to Meta' }, { status: 401 });

  // get ad accounts the current user can access
  const r = await fetch(
    'https://graph.facebook.com/v19.0/me/adaccounts?fields=account_id,name,currency',
    { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' }
  );

  const j = await r.json();
  if (!r.ok) {
    return NextResponse.json({ ok: false, error: j?.error?.message || 'Meta error' }, { status: 400 });
  }

  const accounts = (j.data || []).map((a: any) => ({
    externalId: `act_${a.account_id}`,
    name: a.name,
    currency: a.currency,
  }));
  return NextResponse.json({ ok: true, accounts });
}
