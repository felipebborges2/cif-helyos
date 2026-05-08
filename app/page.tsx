export const dynamic = 'force-dynamic'
import { connectDB } from '@/lib/db'
import Match from '@/models/Match'
import Team from '@/models/Team'
import MatchEvent from '@/models/MatchEvent'
import Player from '@/models/Player'
import Suspension from '@/models/Suspension'
import Link from 'next/link'
import RoundNavigator from '@/components/RoundNavigator'
import type { IStandingRow } from '@/types'

async function getStandings(): Promise<IStandingRow[]> {
  const teams = await Team.find({ isActive: { $ne: false } }).lean()
  const matches = await Match.find({ phase: 'group', status: 'finished' })
    .populate('homeTeam awayTeam').lean()

  const map = new Map<string, IStandingRow>()
  for (const team of teams as any[]) {
    map.set(team._id.toString(), {
      team, played: 0, won: 0, drawn: 0, lost: 0,
      goalsFor: 0, goalsAgainst: 0, goalDiff: 0, points: 0,
    })
  }
  for (const match of matches as any[]) {
    const homeId = match.homeTeam._id.toString()
    const awayId = match.awayTeam._id.toString()
    const home = map.get(homeId)!
    const away = map.get(awayId)!
    const hg = match.homeScore, ag = match.awayScore
    home.played++; away.played++
    home.goalsFor += hg; home.goalsAgainst += ag
    away.goalsFor += ag; away.goalsAgainst += hg
    if (hg > ag) { home.won++; home.points += 3; away.lost++ }
    else if (hg < ag) { away.won++; away.points += 3; home.lost++ }
    else { home.drawn++; away.drawn++; home.points++; away.points++ }
  }
  return Array.from(map.values())
    .map(r => ({ ...r, goalDiff: r.goalsFor - r.goalsAgainst }))
    .sort((a, b) => b.points - a.points || b.goalDiff - a.goalDiff || b.goalsFor - a.goalsFor)
}

async function getGroupRounds() {
  const matches = await Match.find({ phase: 'group' })
    .populate('homeTeam awayTeam')
    .sort({ round: 1, date: 1, matchNumber: 1 })
    .lean() as unknown as any[]

  const map = new Map<number, any[]>()
  for (const m of matches) {
    const r = m.round ?? 1
    if (!map.has(r)) map.set(r, [])
    map.get(r)!.push(m)
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a - b)
    .map(([round, matches]) => ({ round, matches: JSON.parse(JSON.stringify(matches)) }))
}

async function getTopScorers() {
  const agg = await MatchEvent.aggregate([
    { $match: { type: 'goal' } },
    { $group: { _id: '$player', goals: { $sum: 1 } } },
    { $sort: { goals: -1 } },
    { $limit: 5 },
  ])
  if (!agg.length) return []
  const players = await Player.find({ _id: { $in: agg.map(a => a._id) } })
    .populate('team', 'name color logo').lean()
  const playerMap = new Map(players.map((p: any) => [p._id.toString(), p]))
  return agg.map(a => ({ player: playerMap.get(a._id.toString()) as any, goals: a.goals }))
}

const reasonLabel: Record<string, string> = {
  yellow_cards: '3 amarelos',
  red_card: 'Cartão vermelho',
  disciplinary: 'Disciplinar',
}

export default async function HomePage() {
  await connectDB()
  const [standings, rounds, topScorers, liveMatch, activeSuspensions] = await Promise.all([
    getStandings(), getGroupRounds(), getTopScorers(),
    Match.findOne({ status: 'live' }).populate('homeTeam awayTeam').lean(),
    Suspension.find({ status: { $in: ['pending', 'serving'] } })
      .populate({ path: 'player', populate: { path: 'team', select: 'name color logo' } })
      .sort({ createdAt: -1 })
      .lean() as Promise<any[]>,
  ])

  return (
    <div className="space-y-6">
      <style>{`
        @media (min-width: 768px) {
          .standings-grid { display: grid; grid-template-columns: 1fr 360px; gap: 1.5rem; align-items: start; }
        }
      `}</style>
      <section>
        <h1 className="text-2xl font-bold text-white mb-1">23ª Copa Interclasses de Futsal</h1>
        <p className="text-slate-400 text-sm">Colégio Helyos · Feira de Santana · 2026</p>
      </section>

      {/* Partida ao vivo */}
      {liveMatch && (() => {
        const m = liveMatch as any
        return (
          <Link href={`/partida/${m._id}`} className="block bg-red-950/40 border border-red-800/60 rounded-xl px-5 py-4 hover:border-red-600 transition-colors">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-red-400 text-xs font-bold uppercase tracking-wider">Ao Vivo agora</span>
            </div>
            <div className="flex items-center justify-center gap-6">
              <div className="flex items-center gap-2 flex-1 justify-end min-w-0">
                <span className="font-bold text-sm sm:text-base truncate text-right">{m.homeTeam.name}</span>
                {m.homeTeam.logo
                  ? <img src={m.homeTeam.logo} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                  : <div className="w-8 h-8 rounded-full flex-shrink-0" style={{ backgroundColor: m.homeTeam.color }} />}
              </div>
              <div className="text-3xl font-black tabular-nums flex-shrink-0 text-white">
                {m.homeScore} – {m.awayScore}
              </div>
              <div className="flex items-center gap-2 flex-1 justify-start min-w-0">
                {m.awayTeam.logo
                  ? <img src={m.awayTeam.logo} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                  : <div className="w-8 h-8 rounded-full flex-shrink-0" style={{ backgroundColor: m.awayTeam.color }} />}
                <span className="font-bold text-sm sm:text-base truncate">{m.awayTeam.name}</span>
              </div>
            </div>
            <p className="text-center text-red-400/70 text-xs mt-3">Clique para acompanhar ao vivo →</p>
          </Link>
        )
      })()}

      {/* Classificação + Rodadas */}
      <div className="standings-grid space-y-6">

        {/* Classificação */}
        <section>
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Classificação — Fase de Grupos
          </h2>
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500 text-xs uppercase">
                  <th className="text-left px-4 py-3 w-8">#</th>
                  <th className="text-left px-2 py-3">Time</th>
                  <th className="text-center px-2 py-3">J</th>
                  <th className="text-center px-2 py-3">V</th>
                  <th className="text-center px-2 py-3">E</th>
                  <th className="text-center px-2 py-3">D</th>
                  <th className="text-center px-2 py-3 hidden sm:table-cell">GP</th>
                  <th className="text-center px-2 py-3 hidden sm:table-cell">GC</th>
                  <th className="text-center px-2 py-3">SG</th>
                  <th className="text-center px-4 py-3">Pts</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((row, idx) => (
                  <tr
                    key={(row.team as any)._id}
                    className={`border-b border-slate-800/50 last:border-0 hover:bg-slate-800/30 transition-colors ${idx === 0 ? 'bg-blue-950/30' : ''}`}
                  >
                    <td className="px-4 py-3 text-xs">
                      <span className={idx === 0 ? 'text-blue-400 font-bold' : 'text-slate-500'}>{idx + 1}º</span>
                    </td>
                    <td className="px-2 py-3">
                      <a href={`/times/${(row.team as any)._id}`} className="flex items-center gap-2 hover:text-blue-400 transition-colors">
                        {(row.team as any).logo ? (
                          <img src={(row.team as any).logo} alt={(row.team as any).name} className="w-6 h-6 rounded-full object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-6 h-6 rounded-full flex-shrink-0" style={{ backgroundColor: (row.team as any).color }} />
                        )}
                        <span className="font-medium">{(row.team as any).name}</span>
                      </a>
                    </td>
                    <td className="text-center px-2 py-3 text-slate-300">{row.played}</td>
                    <td className="text-center px-2 py-3 text-slate-300">{row.won}</td>
                    <td className="text-center px-2 py-3 text-slate-300">{row.drawn}</td>
                    <td className="text-center px-2 py-3 text-slate-300">{row.lost}</td>
                    <td className="text-center px-2 py-3 text-slate-300 hidden sm:table-cell">{row.goalsFor}</td>
                    <td className="text-center px-2 py-3 text-slate-300 hidden sm:table-cell">{row.goalsAgainst}</td>
                    <td className="text-center px-2 py-3 text-slate-300">
                      {row.goalDiff > 0 ? `+${row.goalDiff}` : row.goalDiff}
                    </td>
                    <td className="text-center px-4 py-3 font-bold text-white">{row.points}</td>
                  </tr>
                ))}
                {standings.length === 0 && (
                  <tr>
                    <td colSpan={10} className="text-center py-10 text-slate-500 text-sm">
                      Nenhum resultado registrado ainda
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-600 mt-2">
            1º classifica direto para as semifinais · 2º–7º disputam quartas de final
          </p>
        </section>

        {/* Rodadas */}
        <section>
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Rodadas — Fase de Grupos
          </h2>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sticky top-[4.5rem]">
            <RoundNavigator rounds={rounds} />
          </div>
        </section>
      </div>

      {/* Artilharia */}
      {topScorers.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Artilharia
          </h2>
          <div className="bg-slate-900 border border-slate-800 rounded-xl divide-y divide-slate-800">
            {topScorers.map(({ player, goals }, idx) => (
              <div key={player?._id} className="flex items-center gap-3 px-4 py-3">
                <span className={`text-xs font-bold w-5 text-center ${idx === 0 ? 'text-yellow-400' : 'text-slate-500'}`}>
                  {idx + 1}º
                </span>
                {player?.team?.logo ? (
                  <img src={player.team.logo} alt={player.team.name} className="w-6 h-6 rounded-full object-cover flex-shrink-0" />
                ) : (
                  <div className="w-6 h-6 rounded-full flex-shrink-0" style={{ backgroundColor: player?.team?.color ?? '#475569' }} />
                )}
                <div className="flex-1 min-w-0">
                  <a href={`/jogadores/${player?._id}`} className="text-sm font-medium text-white truncate hover:text-blue-400 transition-colors block">
                    {player?.name ?? '—'}
                  </a>
                  <p className="text-xs text-slate-500 truncate">{player?.team?.name ?? ''}</p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className={`text-xl font-black tabular-nums ${idx === 0 ? 'text-white' : 'text-slate-300'}`}>{goals}</span>
                  <span className="text-slate-600 text-xs">gols</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Suspensos */}
      {activeSuspensions.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Suspensos
          </h2>
          <div className="bg-slate-900 border border-slate-800 rounded-xl divide-y divide-slate-800">
            {activeSuspensions.map((s: any) => {
              const player = s.player
              const team = player?.team
              return (
                <div key={s._id} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-2 h-2 rounded-full flex-shrink-0 bg-red-500" />
                  <div className="flex-1 min-w-0">
                    <Link href={`/jogadores/${player?._id}`} className="text-sm font-medium text-white hover:text-blue-400 transition-colors">
                      {player?.name ?? '—'}
                    </Link>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {team && (
                        <span className="border-l-2 pl-2 mr-2" style={{ borderColor: team.color }}>{team.name}</span>
                      )}
                      <span>{reasonLabel[s.reason]}</span>
                      {s.disciplinaryNote && <span> · {s.disciplinaryNote}</span>}
                    </p>
                  </div>
                  <span className="text-xs text-red-400 font-medium flex-shrink-0">
                    {s.matchesToServe - s.matchesServed} jogo{s.matchesToServe - s.matchesServed !== 1 ? 's' : ''}
                  </span>
                </div>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
