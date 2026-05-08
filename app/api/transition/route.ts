import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { transitionToKnockout } from '@/lib/suspension-logic'

export async function POST() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  await transitionToKnockout()
  return NextResponse.json({ ok: true })
}
