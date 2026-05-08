import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { auth } from '@/lib/auth'
import Team from '@/models/Team'

export async function GET(req: Request) {
  await connectDB()
  const { searchParams } = new URL(req.url)
  const all = searchParams.get('all') === 'true'
  const filter = all ? {} : { isActive: { $ne: false } }
  const teams = await Team.find(filter).sort({ name: 1 })
  return NextResponse.json(teams)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  await connectDB()
  const body = await req.json()
  const team = await Team.create(body)
  return NextResponse.json(team, { status: 201 })
}
