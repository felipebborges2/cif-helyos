import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { auth } from '@/lib/auth'
import Player from '@/models/Player'
import Suspension from '@/models/Suspension'

export async function GET(req: Request) {
  await connectDB()
  const { searchParams } = new URL(req.url)
  const teamId = searchParams.get('team')

  const filter: any = {}
  if (teamId) filter.team = teamId

  const players = await Player.find(filter).populate('team').sort({ name: 1 })

  const suspensions = await Suspension.find({ status: 'pending' }).select('player')
  const suspendedIds = new Set(suspensions.map((s: any) => s.player.toString()))

  const result = players.map((p: any) => ({
    ...p.toObject(),
    isSuspended: suspendedIds.has(p._id.toString()),
    isWarned: !suspendedIds.has(p._id.toString()) && p.yellowCardCount === 2,
  }))

  return NextResponse.json(result)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  await connectDB()
  const body = await req.json()
  const player = await Player.create(body)
  const populated = await player.populate('team')
  return NextResponse.json(populated, { status: 201 })
}
