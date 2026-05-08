'use client'

import { useEffect, useState } from 'react'

interface TimerState {
  timerRunning: boolean
  timerElapsedMs: number
  timerStartedAt: string | null
  half: number
}

function calcMinutes(state: TimerState) {
  const base = state.timerElapsedMs ?? 0
  const startedAt = state.timerStartedAt ? new Date(state.timerStartedAt).getTime() : null
  const ms = state.timerRunning && startedAt ? base + (Date.now() - startedAt) : base
  return Math.floor(ms / 60000)
}

export default function LiveTimer({ matchId, initial }: { matchId: string; initial: TimerState }) {
  const [state, setState] = useState(initial)
  const [minutes, setMinutes] = useState(() => calcMinutes(initial))

  useEffect(() => {
    setMinutes(calcMinutes(state))
    if (!state.timerRunning) return
    const tick = setInterval(() => setMinutes(calcMinutes(state)), 30000)
    return () => clearInterval(tick)
  }, [state])

  useEffect(() => {
    const poll = setInterval(async () => {
      const res = await fetch(`/api/matches/${matchId}`)
      const data = await res.json()
      setState({
        timerRunning: data.timerRunning ?? false,
        timerElapsedMs: data.timerElapsedMs ?? 0,
        timerStartedAt: data.timerStartedAt ?? null,
        half: data.half ?? 1,
      })
    }, 5000)
    return () => clearInterval(poll)
  }, [matchId])

  return (
    <div className="flex items-center justify-center gap-2 mt-2">
      <span className="text-sm font-bold tabular-nums text-white">{minutes}'</span>
      <span className="text-xs text-slate-400">{state.half === 1 ? '1º Tempo' : '2º Tempo'}</span>
    </div>
  )
}
