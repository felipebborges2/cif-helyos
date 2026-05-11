export const revalidate = 30
import { connectDB } from '@/lib/db'
import Player from '@/models/Player'
import MatchEvent from '@/models/MatchEvent'
import Suspension from '@/models/Suspension'
import { notFound } from 'next/navigation'
import Link from 'next/link'

const eventLabel: Record<string, string> = {
  goal: 'Gol',
  yellow_card: 'Amarelo',
  red_card: 'Vermelho',
  difficult_save: 'Defesa Difícil',
}

const eventStyle: Record<string, string> = {
  goal: 'bg-blue-900/50 text-blue-400',
  yellow_card: 'bg-yellow-900/50 text-yellow-400',
  red_card: 'bg-red-900/50 text-red-400',
  difficult_save: 'bg-purple-900/50 text-purple-400',
}

function formatDate(date: any) {
  if (!date) return ''
  return new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

export default async function JogadorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await connectDB()

  const player = await Player.findById(id).populate('team').lean() as any
  if (!player) notFound()

  const team = player.team as any

  const suspension = await Suspension.findOne({ player: id, status: { $in: ['pending', 'serving'] } }).lean() as any

  const [events, assistEvents] = await Promise.all([
    MatchEvent.find({ player: id })
      .populate({ path: 'match', populate: { path: 'homeTeam awayTeam', select: 'name color logo' } })
      .sort({ createdAt: -1 })
      .lean() as unknown as any[],
    MatchEvent.find({ assistPlayer: id, type: 'goal' })
      .populate({ path: 'match', populate: { path: 'homeTeam awayTeam', select: 'name color logo' } })
      .lean() as unknown as any[],
  ])

  const goals   = events.filter((e: any) => e.type === 'goal').length
  const assists = assistEvents.length
  const yellows = events.filter((e: any) => e.type === 'yellow_card').length
  const reds    = events.filter((e: any) => e.type === 'red_card').length
  const saves   = events.filter((e: any) => e.type === 'difficult_save').length

  // Agrupar eventos por jogo
  const matchMap = new Map<string, { match: any; events: any[] }>()
  for (const event of events) {
    if (!event.match) continue
    const mid = event.match._id.toString()
    if (!matchMap.has(mid)) matchMap.set(mid, { match: event.match, events: [] })
    matchMap.get(mid)!.events.push({ ...event, isAssist: false })
  }
  for (const event of assistEvents) {
    if (!event.match) continue
    const mid = event.match._id.toString()
    if (!matchMap.has(mid)) matchMap.set(mid, { match: event.match, events: [] })
    // Só adiciona se não está duplicado (pode ser gol + assistência do mesmo evento)
    const alreadyHas = matchMap.get(mid)!.events.some((e: any) => e._id?.toString() === event._id?.toString())
    if (!alreadyHas) matchMap.get(mid)!.events.push({ ...event, isAssist: true })
  }
  // Ordenar eventos de cada jogo por minuto e o mapa pelo jogo mais recente
  const matchGroups = Array.from(matchMap.values()).map(g => ({
    ...g,
    events: g.events.sort((a: any, b: any) => a.minute - b.minute),
  })).sort((a, b) => new Date(b.match.date ?? 0).getTime() - new Date(a.match.date ?? 0).getTime())

  const matchIds = [...matchMap.keys()]

  return (
    <div className="space-y-6">

      {/* Header card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        {/* Faixa colorida do time */}
        <div className="h-1.5" style={{ backgroundColor: team.color }} />

        <div className="flex items-center gap-5 px-6 py-5">
          {/* Número do jogador */}
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center font-black text-white text-2xl flex-shrink-0"
            style={{ backgroundColor: team.color + '33', border: `2px solid ${team.color}` }}
          >
            <span style={{ color: team.color }}>{player.number}</span>
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-white truncate">{player.name}</h1>
            <Link
              href={`/times/${team._id}`}
              className="inline-flex items-center gap-2 mt-1.5 hover:text-blue-400 transition-colors group"
            >
              {team.logo ? (
                <img src={team.logo} alt={team.name} className="w-5 h-5 rounded-full object-cover flex-shrink-0" />
              ) : (
                <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: team.color }} />
              )}
              <span className="text-slate-400 text-sm group-hover:text-blue-400">{team.name}</span>
            </Link>
          </div>

          {suspension ? (
            <span className="text-xs px-2 py-1 bg-red-900/50 text-red-400 rounded-full border border-red-800/50 flex-shrink-0">
              Suspenso
            </span>
          ) : player.yellowCardCount >= 2 && (
            <span className="text-xs px-2 py-1 bg-yellow-900/40 text-yellow-400 rounded-full border border-yellow-800/50 flex-shrink-0">
              {player.yellowCardCount}/3 amarelos
            </span>
          )}
        </div>
      </div>

      {/* Estatísticas */}
      <section>
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Estatísticas</h2>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {[
            { label: 'Jogos',   value: matchIds.length, color: 'text-white' },
            { label: 'Gols',    value: goals,           color: 'text-blue-400' },
            { label: 'Assist.', value: assists,         color: 'text-emerald-400' },
            { label: 'Defesas', value: saves,           color: 'text-purple-400' },
            { label: 'Amarelos / Vermelhos',
              value: `${yellows} / ${reds}`,
              color: yellows > 0 || reds > 0 ? 'text-yellow-400' : 'text-slate-600' },
          ].map(stat => (
            <div key={stat.label} className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-center">
              <p className={`text-2xl font-black ${stat.color}`}>{stat.value}</p>
              <p className="text-slate-500 text-xs mt-1 leading-tight">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Jogos com eventos agrupados */}
      {matchGroups.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Jogos</h2>
          <div className="space-y-3">
            {matchGroups.map(({ match, events: groupEvents }) => {
              const isHome = match.homeTeam._id.toString() === team._id.toString()
              const opponent = isHome ? match.awayTeam : match.homeTeam
              const myScore = isHome ? match.homeScore : match.awayScore
              const theirScore = isHome ? match.awayScore : match.homeScore

              return (
                <div key={match._id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                  {/* Cabeçalho da partida */}
                  <Link
                    href={`/partida/${match._id}`}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-slate-800/50 transition-colors border-b border-slate-800"
                  >
                    <span className="text-slate-600 text-xs w-8 flex-shrink-0">{formatDate(match.date)}</span>
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      {opponent.logo
                        ? <img src={opponent.logo} alt={opponent.name} className="w-5 h-5 rounded-full object-cover flex-shrink-0" />
                        : <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: opponent.color }} />}
                      <span className="text-sm font-medium text-white truncate">{opponent.name}</span>
                    </div>
                    {match.status === 'finished' && (
                      <span className="text-xs font-bold tabular-nums text-slate-400 flex-shrink-0">
                        {myScore}–{theirScore}
                      </span>
                    )}
                    <span className="text-slate-600 text-xs flex-shrink-0">→</span>
                  </Link>

                  {/* Eventos compactos */}
                  {(() => {
                    const counts: Record<string, number> = {}
                    for (const e of groupEvents) {
                      const key = e.isAssist ? 'assist' : e.type
                      counts[key] = (counts[key] ?? 0) + 1
                    }
                    const badges = [
                      { key: 'goal',          label: '⚽', style: 'bg-blue-900/50 text-blue-400' },
                      { key: 'assist',        label: '👟', style: 'bg-emerald-900/50 text-emerald-400' },
                      { key: 'difficult_save',label: '🧤', style: 'bg-purple-900/50 text-purple-400' },
                      { key: 'yellow_card',   label: '🟨', style: 'bg-yellow-900/50 text-yellow-400' },
                      { key: 'red_card',      label: '🟥', style: 'bg-red-900/50 text-red-400' },
                    ].filter(b => counts[b.key])
                    return (
                      <div className="flex flex-wrap gap-2 px-4 py-2.5">
                        {badges.map(b => (
                          <span key={b.key} className={`text-xs px-2 py-0.5 rounded-full font-medium ${b.style}`}>
                            {counts[b.key] > 1 && <span className="font-black mr-1">{counts[b.key]}×</span>}
                            {b.label}
                          </span>
                        ))}
                      </div>
                    )
                  })()}
                </div>
              )
            })}
          </div>
        </section>
      )}

      {matchGroups.length === 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl py-12 text-center">
          <p className="text-slate-500 text-sm">Nenhum evento registrado ainda</p>
        </div>
      )}
    </div>
  )
}
