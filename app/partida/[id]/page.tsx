export const dynamic = 'force-dynamic'
import { connectDB } from '@/lib/db'
import Match from '@/models/Match'
import MatchEvent from '@/models/MatchEvent'
import Media from '@/models/Media'
import '@/models/Player'
import { notFound } from 'next/navigation'
import LiveMatchView from '@/components/LiveMatchView'
import SharePartida from '@/components/SharePartida'

const phaseLabel: Record<string, string> = {
  group: 'Fase de Grupos',
  quarterfinal: 'Quartas de Final',
  semifinal: 'Semifinais',
  final: 'Final',
}

export default async function PartidaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await connectDB()

  const match = await Match.findById(id)
    .populate('homeTeam awayTeam')
    .populate({ path: 'manOfTheMatch', populate: { path: 'team', select: 'name color' }, strictPopulate: false })
    .lean() as any
  if (!match) notFound()

  const homeId = match.homeTeam._id.toString()
  const awayId = match.awayTeam._id.toString()

  const [events, media, h2hMatches] = await Promise.all([
    MatchEvent.find({ match: id })
      .populate('player assistPlayer substitutedPlayer team')
      .sort({ half: 1, minute: 1 })
      .lean(),
    Media.find({ match: id }).sort({ createdAt: -1 }).lean(),
    Match.find({
      _id: { $ne: match._id },
      status: 'finished',
      $or: [
        { homeTeam: match.homeTeam._id, awayTeam: match.awayTeam._id },
        { homeTeam: match.awayTeam._id, awayTeam: match.homeTeam._id },
      ],
    }).sort({ date: -1 }).limit(5).lean(),
  ])

  const serializedMatch = JSON.parse(JSON.stringify(match))
  const serializedEvents = JSON.parse(JSON.stringify(events))
  const isVideo = (url: string) => /\.(mp4|mov|avi|webm|mkv)$/i.test(url)

  return (
    <div className="space-y-6">
      {/* Phase header */}
      <div className="text-center">
        <p className="text-slate-500 text-xs uppercase tracking-wider">
          {phaseLabel[match.phase]}
          {match.status === 'live' && (
            <span className="ml-2 px-2 py-0.5 bg-red-600 text-white text-xs font-bold rounded-full animate-pulse">
              AO VIVO
            </span>
          )}
        </p>
        {match.status === 'scheduled' && match.date && (
          <p className="text-slate-500 text-xs mt-2">
            {new Date(match.date).toLocaleDateString('pt-BR', {
              weekday: 'long', day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit',
            })}
          </p>
        )}
      </div>

      <LiveMatchView
        matchId={id}
        initialMatch={serializedMatch}
        initialEvents={serializedEvents}
      />

      {/* Man of the match */}
      {match.manOfTheMatch && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center gap-4">
          <span className="text-3xl">🏅</span>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider">Melhor da Partida</p>
            <p className="text-lg font-bold text-white mt-0.5">{match.manOfTheMatch.name}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              {match.manOfTheMatch.team?.logo ? (
                <img src={match.manOfTheMatch.team.logo} alt={match.manOfTheMatch.team.name} className="w-4 h-4 rounded-full object-cover flex-shrink-0" />
              ) : match.manOfTheMatch.team ? (
                <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: match.manOfTheMatch.team.color }} />
              ) : null}
              <p className="text-xs text-slate-500">
                {match.manOfTheMatch.team?.name ?? ''} · #{match.manOfTheMatch.number}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Histórico de confrontos */}
      {(h2hMatches as any[]).length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Confrontos Anteriores
          </h2>
          <div className="bg-slate-900 border border-slate-800 rounded-xl divide-y divide-slate-800">
            {(h2hMatches as any[]).map(m => {
              const mHomeId = m.homeTeam.toString()
              const fromHomePerspective = mHomeId === homeId
              const leftScore = fromHomePerspective ? m.homeScore : m.awayScore
              const rightScore = fromHomePerspective ? m.awayScore : m.homeScore
              const homeWon = leftScore > rightScore
              const awayWon = rightScore > leftScore
              return (
                <a key={m._id} href={`/partida/${m._id}`} className="flex items-center justify-between px-4 py-3 hover:bg-slate-800/40 transition-colors">
                  <span className={`text-sm font-bold tabular-nums ${homeWon ? 'text-emerald-400' : awayWon ? 'text-red-400' : 'text-slate-300'}`}>
                    {leftScore} – {rightScore}
                  </span>
                  <span className="text-xs text-slate-500">
                    {m.date ? new Date(m.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }) : 'Data indefinida'}
                  </span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${homeWon ? 'bg-emerald-900/50 text-emerald-400' : awayWon ? 'bg-red-900/50 text-red-400' : 'bg-slate-800 text-slate-400'}`}>
                    {homeWon ? 'Vitória' : awayWon ? 'Derrota' : 'Empate'}
                  </span>
                </a>
              )
            })}
          </div>
        </section>
      )}

      {/* Galeria da partida */}
      {(media as any[]).length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Galeria
          </h2>
          <div className="columns-2 sm:columns-3 gap-2 space-y-2">
            {(media as any[]).map(m => (
              <div key={m._id} className="break-inside-avoid rounded-xl overflow-hidden">
                {isVideo(m.url) ? (
                  <video src={m.url} controls className="w-full" />
                ) : (
                  <img src={m.url} alt={m.description ?? ''} className="w-full object-cover" />
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      <SharePartida matchId={id} />
    </div>
  )
}
