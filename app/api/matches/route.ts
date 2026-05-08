import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { auth } from '@/lib/auth'
import Match from '@/models/Match'

export async function GET(req: Request) {
  await connectDB()
  const { searchParams } = new URL(req.url)
  const phase = searchParams.get('phase')
  const status = searchParams.get('status')

  const filter: any = {}
  if (phase) filter.phase = phase
  if (status) filter.status = status

  const matches = await Match.find(filter)
    .populate('homeTeam awayTeam')
    .sort({ date: 1, matchNumber: 1 })

  return NextResponse.json(matches)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  await connectDB()
  const body = await req.json()
  const match = await Match.create(body)
  const populated = await match.populate('homeTeam awayTeam')
  return NextResponse.json(populated, { status: 201 })
}
