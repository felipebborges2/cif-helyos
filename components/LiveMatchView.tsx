'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import LiveTimer from './LiveTimer'

const eventLabel: Record<string, string> = {
  goal: '⚽ Gol',
  yellow_card: '🟨 Cartão Amarelo',
  red_card: '🟥 Cartão Vermelho',
  substitution: '🔄 Substituição',
  difficult_save: '🧤 Defesa Difícil',
}

interface LiveMatchViewProps {
  matchId: string
  initialMatch: any
  initialEvents: any[]
}

export default function LiveMatchView({ matchId, initialMatch, initialEvents }: LiveMatchViewProps) {
  const [match, setMatch] = useState(initialMatch)
  const [events, setEvents] = useState(initialEvents)

  useEffect(() => {
    if (match.status !== 'live') return

    const interval = setInterval(async () => {
      const [matchRes, eventsRes] = await Promise.all([
        fetch(`/api/matches/${matchId}`, { cache: 'no-store' }),
        fetch(`/api/matches/${matchId}/events`, { cache: 'no-store' }),
      ])
      if (matchRes.ok) setMatch(await matchRes.json())
      if (eventsRes.ok) setEvents(await eventsRes.json())
    }, 5000)

    return () => clearInterval(interval)
  }, [matchId, match.status])

  const homeEvents = events.filter((e: any) => e.team?._id === match.homeTeam._id || e.team?._id?.toString() === match.homeTeam._id?.toString())
  const awayEvents = events.filter((e: any) => e.team?._id === match.awayTeam._id || e.team?._id?.toString() === match.awayTeam._id?.toString())

  return (
    <div className="space-y-6">
      {/* Scoreboard */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center justify-center gap-6">
          <div className="flex flex-col items-center gap-2 flex-1">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-white font-black text-lg overflow-hidden relative"
              style={{ backgroundColor: match.homeTeam.color }}
            >
              {match.homeTeam.logo ? (
                <Image src={match.homeTeam.logo} alt={match.homeTeam.name} fill className="object-cover" unoptimized />
              ) : match.homeTeam.shortName}
            </div>
            <span className="font-semibold text-sm text-center">{match.homeTeam.name}</span>
          </div>

          <div className="text-center">
            {match.status === 'finished' || match.status === 'live' ? (
              <div className="flex items-center gap-3">
                <span className="text-5xl font-black tabular-nums">{match.homeScore}</span>
                <span className="text-slate-600 text-2xl">–</span>
                <span className="text-5xl font-black tabular-nums">{match.awayScore}</span>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <span className="text-3xl font-black text-slate-700">–</span>
                <span className="text-slate-700 text-xl">×</span>
                <span className="text-3xl font-black text-slate-700">–</span>
              </div>
            )}
            {match.status === 'finished' && (
              <p className="text-slate-500 text-xs mt-1">Encerrado</p>
            )}
            {match.status === 'live' && (
              <LiveTimer
                matchId={matchId}
                initial={{
                  timerRunning: match.timerRunning ?? false,
                  timerElapsedMs: match.timerElapsedMs ?? 0,
                  timerStartedAt: match.timerStartedAt ? new Date(match.timerStartedAt).toISOString() : null,
                  half: match.half ?? 1,
                }}
              />
            )}
          </div>

          <div className="flex flex-col items-center gap-2 flex-1">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-white font-black text-lg overflow-hidden relative"
              style={{ backgroundColor: match.awayTeam.color }}
            >
              {match.awayTeam.logo ? (
                <Image src={match.awayTeam.logo} alt={match.awayTeam.name} fill className="object-cover" unoptimized />
              ) : match.awayTeam.shortName}
            </div>
            <span className="font-semibold text-sm text-center">{match.awayTeam.name}</span>
          </div>
        </div>

        {match.venue && (
          <p className="text-slate-600 text-xs text-center mt-4">📍 {match.venue}</p>
        )}
      </div>

      {/* Event timeline */}
      {events.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Linha do Tempo
          </h2>
          <div className="space-y-1">
            {events.map((event: any) => {
              const homeId = match.homeTeam._id?.toString?.() ?? match.homeTeam._id
              const eventTeamId = event.team?._id?.toString?.() ?? event.team?._id
              const isHome = eventTeamId === homeId
              return (
                <div
                  key={event._id}
                  className={`flex items-center gap-3 py-2 px-4 rounded-lg bg-slate-900/50 ${isHome ? 'flex-row' : 'flex-row-reverse'}`}
                >
                  <div className="flex flex-col items-center flex-shrink-0 w-8">
                    <span className="text-slate-500 text-xs">{event.minute}'</span>
                    <span className="text-slate-600 text-[10px] leading-none">{event.half ?? 1}T</span>
                  </div>
                  <div className={`flex-1 ${isHome ? 'text-left' : 'text-right'}`}>
                    <p className="text-sm font-medium">{event.player?.name}</p>
                    <p className="text-xs text-slate-500">{eventLabel[event.type]}</p>
                    {event.type === 'goal' && event.assistPlayer && (
                      <p className="text-xs text-slate-600">Assist: {event.assistPlayer.name}</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Goals by team */}
      {(homeEvents.filter((e: any) => e.type === 'goal').length > 0 || awayEvents.filter((e: any) => e.type === 'goal').length > 0) && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <h3 className="text-xs text-slate-500 uppercase tracking-wider mb-2">{match.homeTeam.name}</h3>
            <div className="space-y-1">
              {homeEvents.filter((e: any) => e.type === 'goal').map((e: any) => (
                <p key={e._id} className="text-sm">⚽ {e.player?.name} <span className="text-slate-500">{e.minute}'</span></p>
              ))}
            </div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <h3 className="text-xs text-slate-500 uppercase tracking-wider mb-2">{match.awayTeam.name}</h3>
            <div className="space-y-1">
              {awayEvents.filter((e: any) => e.type === 'goal').map((e: any) => (
                <p key={e._id} className="text-sm">⚽ {e.player?.name} <span className="text-slate-500">{e.minute}'</span></p>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
