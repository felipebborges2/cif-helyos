import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import User from '@/models/User'

export async function GET() {
  const session = await auth()
  if ((session?.user as any)?.role !== 'admin') {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  await connectDB()
  const users = await User.find({}, '-password').lean()
  return NextResponse.json(users)
}
