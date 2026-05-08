import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { auth } from '@/lib/auth'
import MatchEvent from '@/models/MatchEvent'
import Match from '@/models/Match'
import Player from '@/models/Player'
import Suspension from '@/models/Suspension'

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; eventId: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  await connectDB()
  const { id, eventId } = await params
  const event = await MatchEvent.findById(eventId)
  if (!event) return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 })

  // Reverter placar se era gol
  if (event.type === 'goal') {
    const match = await Match.findById(id)
    if (match) {
      const isHome = event.team.toString() === match.homeTeam.toString()
      await Match.findByIdAndUpdate(id, {
        $inc: isHome ? { homeScore: -1 } : { awayScore: -1 },
      })
    }
  }

  // Reverter cartão amarelo: decrementar contador
  if (event.type === 'yellow_card') {
    await Player.findByIdAndUpdate(event.player, { $inc: { yellowCardCount: -1 } })
  }

  // Reverter suspensão por cartão vermelho (apenas se ainda pending)
  if (event.type === 'red_card') {
    await Suspension.findOneAndDelete({ player: event.player, reason: 'red_card', status: 'pending' })
  }

  await MatchEvent.findByIdAndDelete(eventId)
  return NextResponse.json({ ok: true })
}
