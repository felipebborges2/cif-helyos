export const dynamic = 'force-dynamic'
import { connectDB } from '@/lib/db'
import Match from '@/models/Match'
import Link from 'next/link'
import PrintBracket from '@/components/PrintBracket'

function TeamSlot({ team, score, winner }: { team?: any; score?: number; winner?: boolean }) {
  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm ${
        winner
          ? 'border-blue-500 bg-blue-950/30 font-semibold'
          : 'border-slate-800 bg-slate-900'
      }`}
    >
      {team ? (
        <>
          <div
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: team.color }}
          />
          <span className="flex-1 truncate">{team.name}</span>
          {score !== undefined && (
            <span className="font-black tabular-nums text-base">{score}</span>
          )}
        </>
      ) : (
        <span className="text-slate-600 italic">A definir</span>
      )}
    </div>
  )
}

function MatchCard({ match }: { match: any }) {
  if (!match) return (
    <div className="w-52 space-y-1 opacity-40">
      <TeamSlot />
      <TeamSlot />
    </div>
  )

  const homeWon = match.status === 'finished' && match.homeScore > match.awayScore
  const awayWon = match.status === 'finished' && match.awayScore > match.homeScore

  return (
    <Link href={`/partida/${match._id}`} className="block w-52 space-y-1 hover:opacity-80 transition-opacity">
      <TeamSlot team={match.homeTeam} score={match.status !== 'scheduled' ? match.homeScore : undefined} winner={homeWon} />
      <TeamSlot team={match.awayTeam} score={match.status !== 'scheduled' ? match.awayScore : undefined} winner={awayWon} />
      {match.status === 'live' && (
        <p className="text-center text-xs text-red-400 font-bold animate-pulse">AO VIVO</p>
      )}
    </Link>
  )
}

export default async function BracketPage() {
  await connectDB()

  const [quarters, semis, finals] = await Promise.all([
    Match.find({ phase: 'quarterfinal' }).populate('homeTeam awayTeam').sort({ matchNumber: 1 }).lean(),
    Match.find({ phase: 'semifinal' }).populate('homeTeam awayTeam').sort({ matchNumber: 1 }).lean(),
    Match.find({ phase: 'final' }).populate('homeTeam awayTeam').lean(),
  ])

  const q = quarters as any[]
  const s = semis as any[]
  const f = finals[0] as any

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Mata-Mata</h1>
        <PrintBracket />
      </div>

      <div className="overflow-x-auto pb-4">
        <div className="flex items-stretch gap-8 min-w-[700px]">
          {/* Quartas */}
          <div className="flex flex-col justify-around gap-8 flex-shrink-0">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-3 text-center">Quartas de Final</p>
              <div className="space-y-6">
                <MatchCard match={q[0]} />
                <MatchCard match={q[1]} />
                <MatchCard match={q[2]} />
              </div>
            </div>
          </div>

          {/* Conector */}
          <div className="flex items-center flex-shrink-0">
            <div className="w-8 h-full flex flex-col justify-around">
              <div className="h-px bg-slate-700 w-full" />
              <div className="h-px bg-slate-700 w-full" />
              <div className="h-px bg-slate-700 w-full" />
            </div>
          </div>

          {/* Semifinais */}
          <div className="flex flex-col justify-around gap-8 flex-shrink-0">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-3 text-center">Semifinais</p>
              <div className="space-y-16">
                <MatchCard match={s[0]} />
                <MatchCard match={s[1]} />
              </div>
            </div>
          </div>

          {/* Conector */}
          <div className="flex items-center flex-shrink-0">
            <div className="w-8 flex flex-col justify-around">
              <div className="h-px bg-slate-700 w-full" />
              <div className="h-px bg-slate-700 w-full" />
            </div>
          </div>

          {/* Final */}
          <div className="flex flex-col justify-center flex-shrink-0">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-3 text-center">Final</p>
            <MatchCard match={f} />
            {!f && (
              <p className="text-xs text-slate-600 text-center mt-2">Aguardando semifinais</p>
            )}
          </div>
        </div>
      </div>

      {!q.length && !s.length && !f && (
        <p className="text-slate-500 text-center py-16">
          O mata-mata será definido após a fase de grupos.
        </p>
      )}
    </div>
  )
}
