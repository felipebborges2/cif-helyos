import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import User from '@/models/User'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  await connectDB()
  const user = await User.findOne({ email: session.user?.email }, '-password')
    .populate('teamId', 'name shortName color _id')
    .lean()

  return NextResponse.json(user)
}
