import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { auth } from '@/lib/auth'
import Suspension from '@/models/Suspension'

export async function GET() {
  await connectDB()
  const suspensions = await Suspension.find()
    .populate({ path: 'player', populate: { path: 'team' } })
    .sort({ createdAt: -1 })
  return NextResponse.json(suspensions)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  await connectDB()
  const body = await req.json()
  const suspension = await Suspension.create(body)
  return NextResponse.json(suspension, { status: 201 })
}
