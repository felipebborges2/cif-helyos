import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { auth } from '@/lib/auth'
import Match from '@/models/Match'
import MatchEvent from '@/models/MatchEvent'
import { handleYellowCard, handleRedCard } from '@/lib/suspension-logic'
import type { Phase } from '@/types'

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await connectDB()
  const { id } = await params
  const events = await MatchEvent.find({ match: id })
    .populate('player assistPlayer substitutedPlayer team')
    .sort({ half: 1, minute: 1 })
  return NextResponse.json(events)
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  await connectDB()
  const { id } = await params
  const body = await req.json()

  const match = await Match.findById(id)
  if (!match) return NextResponse.json({ error: 'Partida não encontrada' }, { status: 404 })

  const event = await MatchEvent.create({ ...body, match: id })

  // Atualizar placar se for gol
  if (body.type === 'goal') {
    const isHome = body.team.toString() === match.homeTeam.toString()
    await Match.findByIdAndUpdate(id, {
      $inc: isHome ? { homeScore: 1 } : { awayScore: 1 },
    })
  }

  // Lógica de suspensões
  const phase = match.phase as Phase
  if (body.type === 'yellow_card') {
    await handleYellowCard(body.player, phase)
  } else if (body.type === 'red_card') {
    await handleRedCard(body.player, phase)
  }

  const populated = await event.populate('player assistPlayer substitutedPlayer team')
  return NextResponse.json(populated, { status: 201 })
}
