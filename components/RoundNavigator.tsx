'use client'

import { useState } from 'react'

interface RoundMatch {
  _id: string
  homeTeam: { _id: string; name: string; color: string; logo?: string }
  awayTeam: { _id: string; name: string; color: string; logo?: string }
  homeScore: number
  awayScore: number
  status: string
  date?: string
}

interface Round {
  round: number
  matches: RoundMatch[]
}

function TeamLogo({ team }: { team: RoundMatch['homeTeam'] }) {
  if (team.logo) return <img src={team.logo} alt={team.name} className="w-5 h-5 rounded-full object-cover flex-shrink-0" />
  return <div className="w-5 h-5 rounded-full flex-shrink-0" style={{ backgroundColor: team.color }} />
}

export default function RoundNavigator({ rounds }: { rounds: Round[] }) {
  const [idx, setIdx] = useState(() => {
    const firstActive = rounds.findIndex(r => r.matches.some(m => m.status !== 'finished'))
    return firstActive >= 0 ? firstActive : Math.max(0, rounds.length - 1)
  })

  if (!rounds.length) {
    return <p className="text-slate-500 text-sm text-center py-8">Nenhuma partida cadastrada</p>
  }

  const current = rounds[idx]
  const hasMultiple = rounds.length > 1

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => setIdx(i => Math.max(0, i - 1))}
          disabled={idx === 0}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-20 disabled:cursor-not-allowed transition-colors text-lg leading-none"
        >
          ←
        </button>
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          {hasMultiple ? `Rodada ${current.round}` : 'Fase de Grupos'}
        </h2>
        <button
          onClick={() => setIdx(i => Math.min(rounds.length - 1, i + 1))}
          disabled={idx === rounds.length - 1}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-20 disabled:cursor-not-allowed transition-colors text-lg leading-none"
        >
          →
        </button>
      </div>

      <div className="space-y-2">
        {current.matches.map(match => (
          <a
            key={match._id}
            href={`/partida/${match._id}`}
            className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 hover:border-blue-500 transition-colors"
          >
            <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
              <span className="text-xs font-medium truncate text-right text-slate-200">{match.homeTeam.name}</span>
              <TeamLogo team={match.homeTeam} />
            </div>

            <div className="text-center flex-shrink-0 w-14">
              {match.status === 'finished' ? (
                <span className="text-sm font-black tabular-nums">{match.homeScore}–{match.awayScore}</span>
              ) : match.status === 'live' ? (
                <span className="text-[10px] font-bold text-red-400 animate-pulse">AO VIVO</span>
              ) : (
                <span className="text-slate-600 text-xs">×</span>
              )}
            </div>

            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <TeamLogo team={match.awayTeam} />
              <span className="text-xs font-medium truncate text-slate-200">{match.awayTeam.name}</span>
            </div>
          </a>
        ))}
      </div>
    </div>
  )
}
