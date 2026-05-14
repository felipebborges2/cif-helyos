import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { auth } from '@/lib/auth'
import Match from '@/models/Match'
import Team from '@/models/Team'

export async function POST() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  await connectDB()

  // Calcula classificação da fase de grupos
  const teams = await Team.find({ isActive: { $ne: false } }).lean() as unknown as any[]
  const groupMatches = await Match.find({ phase: 'group', status: 'finished' }).lean() as unknown as any[]

  const map = new Map<string, any>()
  for (const team of teams) {
    map.set(team._id.toString(), {
      team,
      played: 0, won: 0, drawn: 0, lost: 0,
      goalsFor: 0, goalsAgainst: 0, goalDiff: 0, points: 0,
    })
  }

  for (const match of groupMatches) {
    const homeId = match.homeTeam.toString()
    const awayId = match.awayTeam.toString()
    const home = map.get(homeId)
    const away = map.get(awayId)
    if (!home || !away) continue

    const hg = match.homeScore ?? 0
    const ag = match.awayScore ?? 0

    home.played++; away.played++
    home.goalsFor += hg; home.goalsAgainst += ag
    away.goalsFor += ag; away.goalsAgainst += hg

    if (hg > ag) { home.won++; home.points += 3; away.lost++ }
    else if (hg < ag) { away.won++; away.points += 3; home.lost++ }
    else { home.drawn++; away.drawn++; home.points++; away.points++ }
  }

  const standings = Array.from(map.values())
    .map(r => ({ ...r, goalDiff: r.goalsFor - r.goalsAgainst }))
    .sort((a, b) => b.points - a.points || b.goalDiff - a.goalDiff || b.goalsFor - a.goalsFor)

  if (standings.length < 7) {
    return NextResponse.json(
      { error: 'É necessário ter pelo menos 7 times na classificação para gerar o mata-mata.' },
      { status: 400 }
    )
  }

  // Formato: 1º vai direto à semifinal; 2º–7º disputam quartas
  // Quartas: (2 vs 7), (3 vs 6), (4 vs 5)
  // Semifinais: (1 vs vencedor Q1), (vencedor Q2 vs vencedor Q3)
  const [first, second, third, fourth, fifth, sixth, seventh] = standings

  // Apaga mata-mata existente
  await Match.deleteMany({ phase: { $in: ['quarterfinal', 'semifinal', 'final'] } })

  // Cria quartas
  const quarters = await Match.insertMany([
    { homeTeam: second.team._id, awayTeam: seventh.team._id, phase: 'quarterfinal', status: 'scheduled', matchNumber: 1 },
    { homeTeam: third.team._id, awayTeam: sixth.team._id, phase: 'quarterfinal', status: 'scheduled', matchNumber: 2 },
    { homeTeam: fourth.team._id, awayTeam: fifth.team._id, phase: 'quarterfinal', status: 'scheduled', matchNumber: 3 },
  ])

  // Cria semifinais (times TBD — preenchidos depois)
  await Match.insertMany([
    { homeTeam: first.team._id, phase: 'semifinal', status: 'scheduled', matchNumber: 1 },
    { phase: 'semifinal', status: 'scheduled', matchNumber: 2 },
  ])

  // Cria final
  await Match.create({ phase: 'final', status: 'scheduled', matchNumber: 1 })

  return NextResponse.json({ ok: true, quarters: quarters.length })
}
