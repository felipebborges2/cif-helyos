import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import Match from '@/models/Match'
import Team from '@/models/Team'
import type { IStandingRow } from '@/types'

export async function GET() {
  await connectDB()

  const teams = await Team.find({ isActive: { $ne: false } })
  const matches = await Match.find({ phase: 'group', status: 'finished' }).populate('homeTeam awayTeam')

  const map = new Map<string, IStandingRow>()

  for (const team of teams) {
    map.set(team._id.toString(), {
      team: team.toObject(),
      played: 0, won: 0, drawn: 0, lost: 0,
      goalsFor: 0, goalsAgainst: 0, goalDiff: 0, points: 0,
    })
  }

  for (const match of matches) {
    const homeId = (match.homeTeam as any)._id.toString()
    const awayId = (match.awayTeam as any)._id.toString()
    const home = map.get(homeId)!
    const away = map.get(awayId)!

    const hg = match.homeScore
    const ag = match.awayScore

    home.played++; away.played++
    home.goalsFor += hg; home.goalsAgainst += ag
    away.goalsFor += ag; away.goalsAgainst += hg

    if (hg > ag) { home.won++; home.points += 3; away.lost++ }
    else if (hg < ag) { away.won++; away.points += 3; home.lost++ }
    else { home.drawn++; away.drawn++; home.points++; away.points++ }
  }

  const standings = Array.from(map.values()).map(r => ({
    ...r,
    goalDiff: r.goalsFor - r.goalsAgainst,
  }))

  // Critérios de desempate: pontos > saldo > gols pró > confronto direto (simplificado)
  standings.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points
    if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff
    return b.goalsFor - a.goalsFor
  })

  return NextResponse.json(standings)
}
