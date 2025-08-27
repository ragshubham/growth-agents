import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, image: true, emailVerified: true },
    })
    return NextResponse.json({ ok: true, users })
  } catch (e: any) {
    console.error('GET /api/users error:', e) // check your terminal for this
    return NextResponse.json({ ok: false, error: String(e?.message ?? e) }, { status: 500 })
  }
}
