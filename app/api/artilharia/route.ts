import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import MatchEvent from '@/models/MatchEvent'
import Suspension from '@/models/Suspension'
import Player from '@/models/Player'

export async function GET() {
  await connectDB()

  // Agregar gols por jogador
  const goalsAgg = await MatchEvent.aggregate([
    { $match: { type: 'goal' } },
    { $group: { _id: '$player', goals: { $sum: 1 } } },
    { $sort: { goals: -1 } },
  ])

  // Agregar assistências por jogador
  const assistsAgg = await MatchEvent.aggregate([
    { $match: { type: 'goal', assistPlayer: { $exists: true, $ne: null } } },
    { $group: { _id: '$assistPlayer', assists: { $sum: 1 } } },
  ])

  const assistMap = new Map(assistsAgg.map((a: any) => [a._id.toString(), a.assists]))

  // Buscar suspensões pendentes
  const pendingSuspensions = await Suspension.find({ status: 'pending' }).select('player')
  const suspendedIds = new Set(pendingSuspensions.map((s: any) => s.player.toString()))

  // Popular jogadores — apenas de times ativos
  const playerIds = goalsAgg.map((g: any) => g._id)
  const players = await Player.find({ _id: { $in: playerIds } })
    .populate({ path: 'team', match: { isActive: { $ne: false } } })
  const playerMap = new Map(
    players.filter((p: any) => p.team !== null).map((p: any) => [p._id.toString(), p])
  )

  // Cartões amarelos
  const yellowAgg = await MatchEvent.aggregate([
    { $match: { type: 'yellow_card' } },
    { $group: { _id: '$player', yellowCards: { $sum: 1 } } },
  ])
  const yellowMap = new Map(yellowAgg.map((y: any) => [y._id.toString(), y.yellowCards]))

  const redAgg = await MatchEvent.aggregate([
    { $match: { type: 'red_card' } },
    { $group: { _id: '$player', redCards: { $sum: 1 } } },
  ])
  const redMap = new Map(redAgg.map((r: any) => [r._id.toString(), r.redCards]))

  const result = goalsAgg
    .filter((g: any) => playerMap.has(g._id.toString()))
    .map((g: any) => {
      const pid = g._id.toString()
      const player = playerMap.get(pid)
      return {
        player: player?.toObject() ?? { _id: pid, name: 'Desconhecido' },
        goals: g.goals,
        assists: assistMap.get(pid) ?? 0,
        yellowCards: yellowMap.get(pid) ?? 0,
        redCards: redMap.get(pid) ?? 0,
        isSuspended: suspendedIds.has(pid),
        isWarned: !suspendedIds.has(pid) && (player?.yellowCardCount ?? 0) === 2,
      }
    })

  return NextResponse.json(result)
}
