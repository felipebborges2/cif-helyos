export const revalidate = 30
import { connectDB } from '@/lib/db'
import Team from '@/models/Team'
import Player from '@/models/Player'
import Match from '@/models/Match'
import MatchEvent from '@/models/MatchEvent'
import Suspension from '@/models/Suspension'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'

const phaseLabel: Record<string, string> = {
  group: 'Fase de Grupos',
  quarterfinal: 'Quartas de Final',
  semifinal: 'Semifinais',
  final: 'Final',
}

function formatDate(date: any) {
  if (!date) return ''
  return new Date(date).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit',
  })
}

export default async function TimePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await connectDB()

  const team = await Team.findById(id).lean() as any
  if (!team) notFound()

  const [players, matches, pendingSuspensions] = await Promise.all([
    Player.find({ team: id, isActive: true }).sort({ number: 1 }).lean(),
    Match.find({
      $or: [{ homeTeam: id }, { awayTeam: id }],
    }).populate('homeTeam awayTeam').sort({ date: 1 }).lean(),
    Suspension.find({ status: 'pending' }).select('player').lean(),
  ])

  const suspendedIds = new Set((pendingSuspensions as any[]).map(s => s.player.toString()))

  // Artilheiros do time
  const playerIds = (players as any[]).map(p => p._id)
  const [goalsAgg, savesAgg] = await Promise.all([
    MatchEvent.aggregate([
      { $match: { type: 'goal', player: { $in: playerIds } } },
      { $group: { _id: '$player', goals: { $sum: 1 } } },
      { $sort: { goals: -1 } },
    ]),
    MatchEvent.aggregate([
      { $match: { type: 'difficult_save', player: { $in: playerIds } } },
      { $group: { _id: '$player', saves: { $sum: 1 } } },
      { $sort: { saves: -1 } },
    ]),
  ])

  const goalsMap = new Map(goalsAgg.map((g: any) => [g._id.toString(), g.goals]))
  const savesMap = new Map(savesAgg.map((s: any) => [s._id.toString(), s.saves]))

  const finishedMatches = (matches as any[]).filter(m => m.status === 'finished')
  let wins = 0, draws = 0, losses = 0, gf = 0, ga = 0
  for (const m of finishedMatches) {
    const isHome = m.homeTeam._id.toString() === id
    const scored = isHome ? m.homeScore : m.awayScore
    const conceded = isHome ? m.awayScore : m.homeScore
    gf += scored; ga += conceded
    if (scored > conceded) wins++
    else if (scored === conceded) draws++
    else losses++
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-5">
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center text-white font-black text-2xl overflow-hidden relative flex-shrink-0"
          style={{ backgroundColor: team.color }}
        >
          {team.logo ? (
            <Image src={team.logo} alt={team.name} fill className="object-cover" unoptimized />
          ) : team.shortName}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">{team.name}</h1>
          {team.description && <p className="text-slate-400 text-sm mt-0.5 italic">"{team.description}"</p>}
          <div className="flex flex-col gap-0.5 mt-1">
            {team.foundingYear && (
              <span className="text-slate-500 text-xs">Fundado em {team.foundingYear}</span>
            )}
            {team.titles > 0 && (
              <span className="text-slate-500 text-xs">
                {team.titles} {team.titles === 1 ? 'título' : 'títulos'}
                {team.titleYears?.length > 0 && ` (${team.titleYears.join(', ')})`}
              </span>
            )}
            <span className="text-slate-600 text-xs">{(players as any[]).length} jogadores</span>
          </div>
        </div>
      </div>

      {/* Resumo */}
      {finishedMatches.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Desempenho</h2>
          <div className="grid grid-cols-5 gap-2">
            {[
              { label: 'V', value: wins, color: 'text-emerald-400' },
              { label: 'E', value: draws, color: 'text-slate-300' },
              { label: 'D', value: losses, color: 'text-red-400' },
              { label: 'GP', value: gf, color: 'text-blue-400' },
              { label: 'GC', value: ga, color: 'text-slate-400' },
            ].map(stat => (
              <div key={stat.label} className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-center">
                <p className={`text-2xl font-black ${stat.color}`}>{stat.value}</p>
                <p className="text-slate-500 text-xs mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Elenco */}
      <section>
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Elenco</h2>
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500 text-xs uppercase">
                <th className="text-center px-4 py-3 w-12">#</th>
                <th className="text-left px-2 py-3">Jogador</th>
                <th className="text-center px-2 py-3 hidden sm:table-cell">Gols</th>
                <th className="text-center px-2 py-3 hidden sm:table-cell">Defesas</th>
                <th className="text-center px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {(players as any[]).map(player => {
                const goals = goalsMap.get(player._id.toString()) ?? 0
                const saves = savesMap.get(player._id.toString()) ?? 0
                const isSuspended = suspendedIds.has(player._id.toString())
                const isWarned = !isSuspended && player.yellowCardCount === 2
                return (
                  <tr key={player._id} className="border-b border-slate-800/50 last:border-0">
                    <td className="text-center px-4 py-3 text-slate-400 font-mono">{player.number}</td>
                    <td className="px-2 py-3 font-medium">
                      <Link href={`/jogadores/${player._id}`} className="hover:text-blue-400 transition-colors">
                        {player.name}
                      </Link>
                    </td>
                    <td className="text-center px-2 py-3 text-slate-300 hidden sm:table-cell">
                      {goals > 0 ? <span className="text-blue-400 font-bold">{goals} ⚽</span> : <span className="text-slate-700">—</span>}
                    </td>
                    <td className="text-center px-2 py-3 text-slate-300 hidden sm:table-cell">
                      {saves > 0 ? <span className="text-emerald-400 font-bold">{saves} 🧤</span> : <span className="text-slate-700">—</span>}
                    </td>
                    <td className="text-center px-4 py-3 text-xs">
                      {isSuspended ? (
                        <span className="px-2 py-0.5 bg-red-900/50 text-red-400 rounded-full">Suspenso</span>
                      ) : isWarned ? (
                        <span className="px-2 py-0.5 bg-yellow-900/50 text-yellow-400 rounded-full">Penúltimo</span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
              {(players as any[]).length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-slate-500">Nenhum jogador cadastrado</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Jogos */}
      <section>
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Jogos</h2>
        <div className="space-y-2">
          {(matches as any[]).map(match => {
            const isHome = match.homeTeam._id.toString() === id
            const opponent = isHome ? match.awayTeam : match.homeTeam
            const myScore = isHome ? match.homeScore : match.awayScore
            const theirScore = isHome ? match.awayScore : match.homeScore
            let resultColor = 'text-slate-500'
            let resultLabel = ''
            if (match.status === 'finished') {
              if (myScore > theirScore) { resultColor = 'text-emerald-400'; resultLabel = 'V' }
              else if (myScore === theirScore) { resultColor = 'text-slate-300'; resultLabel = 'E' }
              else { resultColor = 'text-red-400'; resultLabel = 'D' }
            }

            return (
              <Link
                key={match._id}
                href={`/partida/${match._id}`}
                className="flex items-center gap-3 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 hover:border-blue-500 transition-colors"
              >
                <div className="w-8 text-center">
                  {resultLabel ? (
                    <span className={`text-xs font-black ${resultColor}`}>{resultLabel}</span>
                  ) : match.status === 'live' ? (
                    <span className="text-xs font-bold text-red-400 animate-pulse">●</span>
                  ) : (
                    <span className="text-xs text-slate-600">{formatDate(match.date)}</span>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {opponent.logo ? (
                    <img src={opponent.logo} alt={opponent.name} className="w-5 h-5 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-5 h-5 rounded-full flex-shrink-0" style={{ backgroundColor: opponent.color }} />
                  )}
                  <span className="text-sm font-medium truncate">{opponent.name}</span>
                </div>

                <div className="text-center flex-shrink-0">
                  {match.status === 'finished' || match.status === 'live' ? (
                    <span className={`text-sm font-black tabular-nums ${resultColor}`}>
                      {myScore} – {theirScore}
                    </span>
                  ) : (
                    <span className="text-slate-600 text-xs">{phaseLabel[match.phase]}</span>
                  )}
                </div>
              </Link>
            )
          })}
          {!(matches as any[]).length && (
            <p className="text-slate-500 text-center py-8">Nenhum jogo ainda</p>
          )}
        </div>
      </section>
    </div>
  )
}
