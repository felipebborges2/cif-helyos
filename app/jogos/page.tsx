export const dynamic = 'force-dynamic'
import { connectDB } from '@/lib/db'
import Match from '@/models/Match'
import Link from 'next/link'

const phaseLabel: Record<string, string> = {
  group: 'Fase de Grupos',
  quarterfinal: 'Quartas de Final',
  semifinal: 'Semifinais',
  final: 'Final',
}

function formatDate(date: any) {
  if (!date) return 'A definir'
  return new Date(date).toLocaleDateString('pt-BR', {
    weekday: 'short', day: '2-digit', month: '2-digit',
    hour: '2-digit', minute: '2-digit',
  }).replace(',', ' ·')
}

function TeamLogo({ team }: { team: any }) {
  if (team.logo) return <img src={team.logo} alt={team.name} className="w-6 h-6 rounded-full object-cover flex-shrink-0" />
  return <div className="w-6 h-6 rounded-full flex-shrink-0" style={{ backgroundColor: team.color }} />
}

function MatchCard({ match }: { match: any }) {
  return (
    <Link
      href={`/partida/${match._id}`}
      className="block bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 hover:border-blue-500 transition-colors"
    >
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
          <span className="font-semibold text-sm truncate text-right">{match.homeTeam.name}</span>
          <TeamLogo team={match.homeTeam} />
        </div>

        <div className="text-center flex-shrink-0 w-24">
          {match.status === 'finished' ? (
            <span className="text-lg font-black tabular-nums">
              {match.homeScore} – {match.awayScore}
            </span>
          ) : match.status === 'live' ? (
            <span className="px-2 py-0.5 bg-red-600 text-white text-xs font-bold rounded-full animate-pulse">
              AO VIVO
            </span>
          ) : (
            <span className="text-slate-600 text-lg font-bold">×</span>
          )}
          {match.date && match.status === 'scheduled' && (
            <p className="text-slate-600 text-[10px] mt-0.5 leading-tight">{formatDate(match.date)}</p>
          )}
        </div>

        <div className="flex items-center gap-2 flex-1 min-w-0">
          <TeamLogo team={match.awayTeam} />
          <span className="font-semibold text-sm truncate">{match.awayTeam.name}</span>
        </div>
      </div>
      {match.venue && (
        <p className="text-slate-600 text-xs mt-1.5 text-center">{match.venue}</p>
      )}
    </Link>
  )
}

export default async function JogosPage() {
  await connectDB()
  const matches = await Match.find()
    .populate('homeTeam awayTeam')
    .sort({ round: 1, date: 1, matchNumber: 1 })
    .lean() as any[]

  // Separar grupos da fase de grupos e resto
  const groupMatches = matches.filter(m => m.phase === 'group')
  const knockoutMatches = matches.filter(m => m.phase !== 'group')

  // Agrupar fase de grupos por rodada
  const roundMap = new Map<number, any[]>()
  for (const m of groupMatches) {
    const r = m.round ?? 1
    if (!roundMap.has(r)) roundMap.set(r, [])
    roundMap.get(r)!.push(m)
  }
  const rounds = Array.from(roundMap.entries()).sort(([a], [b]) => a - b)

  // Agrupar mata-mata por fase
  const knockoutMap = new Map<string, any[]>()
  for (const m of knockoutMatches) {
    if (!knockoutMap.has(m.phase)) knockoutMap.set(m.phase, [])
    knockoutMap.get(m.phase)!.push(m)
  }
  const knockoutOrder = ['quarterfinal', 'semifinal', 'final']

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-white">Jogos</h1>

      {/* Fase de Grupos com rodadas */}
      {rounds.length > 0 && (
        <section className="space-y-6">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Fase de Grupos
          </h2>
          {rounds.map(([round, roundMatches]) => (
            <div key={round}>
              <h3 className="text-sm font-semibold text-slate-300 mb-2 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-xs text-slate-400 font-bold">{round}</span>
                Rodada {round}
              </h3>
              <div className="space-y-2">
                {roundMatches.map((match: any) => <MatchCard key={match._id} match={match} />)}
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Mata-mata */}
      {knockoutOrder.map(phase => {
        const phaseMatches = knockoutMap.get(phase)
        if (!phaseMatches?.length) return null
        return (
          <section key={phase}>
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              {phaseLabel[phase]}
            </h2>
            <div className="space-y-2">
              {phaseMatches.map((match: any) => <MatchCard key={match._id} match={match} />)}
            </div>
          </section>
        )
      })}

      {!matches.length && (
        <p className="text-slate-500 text-center py-16">Nenhum jogo cadastrado ainda.</p>
      )}
    </div>
  )
}
