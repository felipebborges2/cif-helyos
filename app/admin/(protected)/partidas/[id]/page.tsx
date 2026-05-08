'use client'

import { useState, useEffect, useRef, use } from 'react'
import { useRouter } from 'next/navigation'

interface Team { _id: string; name: string; color: string; shortName: string; logo?: string }
interface Player { _id: string; name: string; number: number; team: string; isSuspended: boolean; isWarned: boolean; yellowCardCount: number }
interface MatchEvent {
  _id: string; minute: number; half?: number; type: string
  player: { _id: string; name: string }
  assistPlayer?: { _id: string; name: string }
  substitutedPlayer?: { _id: string; name: string }
  team: { _id: string; name: string; color: string }
}
interface Match {
  _id: string; homeTeam: Team; awayTeam: Team
  homeScore: number; awayScore: number; phase: string; status: string
  date?: string; venue?: string; round?: number
  manOfTheMatch?: string
}

const eventLabel: Record<string, string> = {
  goal: '⚽ Gol', yellow_card: '🟨 Amarelo', red_card: '🟥 Vermelho', difficult_save: '🧤 Defesa Difícil',
}

export default function GerenciarPartidaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()

  const [match, setMatch] = useState<Match | null>(null)
  const [events, setEvents] = useState<MatchEvent[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [motm, setMotm] = useState<string>('')
  const [motmSaving, setMotmSaving] = useState(false)

  // Edit match info
  const [allTeams, setAllTeams] = useState<Team[]>([])
  const [editOpen, setEditOpen] = useState(false)
  const [editHome, setEditHome] = useState('')
  const [editAway, setEditAway] = useState('')
  const [editPhase, setEditPhase] = useState('group')
  const [editRound, setEditRound] = useState('1')
  const [editDate, setEditDate] = useState('')
  const [editVenue, setEditVenue] = useState('')
  const [editSaving, setEditSaving] = useState(false)

  const [eventType, setEventType] = useState<string>('goal')
  const [selectedTeam, setSelectedTeam] = useState<string>('')
  const [selectedPlayer, setSelectedPlayer] = useState<string>('')
  const [assistPlayer, setAssistPlayer] = useState<string>('')
  const [minute, setMinute] = useState<string>('')
  const [saving, setSaving] = useState(false)

  const [elapsed, setElapsed] = useState(0)
  const [timerRunning, setTimerRunning] = useState(false)
  const [half, setHalf] = useState(1)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const elapsedRef = useRef(0)

  async function syncTimer(running: boolean, elapsedCs: number, currentHalf: number) {
    await fetch(`/api/matches/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        timerRunning: running,
        timerElapsedMs: elapsedCs * 10,
        timerStartedAt: running ? new Date().toISOString() : null,
        half: currentHalf,
      }),
    })
  }

  function startTimerLocal() {
    if (intervalRef.current) return
    setTimerRunning(true)
    intervalRef.current = setInterval(() => {
      elapsedRef.current += 1
      setElapsed(elapsedRef.current)
    }, 10)
  }

  function pauseTimerLocal() {
    if (intervalRef.current) clearInterval(intervalRef.current)
    intervalRef.current = null
    setTimerRunning(false)
  }

  async function startTimer() {
    startTimerLocal()
    await syncTimer(true, elapsedRef.current, half)
  }

  async function pauseTimer() {
    pauseTimerLocal()
    await syncTimer(false, elapsedRef.current, half)
  }

  async function zeroTimer() {
    pauseTimerLocal()
    elapsedRef.current = 0
    setElapsed(0)
    await syncTimer(false, 0, half)
  }

  async function changeHalf(h: number) {
    setHalf(h)
    await syncTimer(timerRunning, elapsedRef.current, h)
  }

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current) }, [])

  // Sync periódico com o banco enquanto o timer está rodando
  useEffect(() => {
    if (!timerRunning) return
    const sync = setInterval(() => syncTimer(true, elapsedRef.current, half), 10000)
    return () => clearInterval(sync)
  }, [timerRunning, half])

  function formatTime(cs: number) {
    const m = Math.floor(cs / 6000).toString().padStart(2, '0')
    const s = Math.floor((cs % 6000) / 100).toString().padStart(2, '0')
    const c = (cs % 100).toString().padStart(2, '0')
    return `${m}:${s}.${c}`
  }

  const timerInitialized = useRef(false)

  async function fetchMatch() {
    const res = await fetch(`/api/matches/${id}`)
    const data = await res.json()
    setMatch(data)
    if (!selectedTeam && data.homeTeam) setSelectedTeam(data.homeTeam._id)
    setEditHome(data.homeTeam?._id ?? '')
    setEditAway(data.awayTeam?._id ?? '')
    setEditPhase(data.phase ?? 'group')
    setEditRound(data.round?.toString() ?? '1')
    setEditDate(data.date ? new Date(data.date).toISOString().slice(0, 16) : '')
    setEditVenue(data.venue ?? '')
    const motmRaw = data.manOfTheMatch
    const motmId = motmRaw
      ? (typeof motmRaw === 'object' ? motmRaw._id?.toString() : motmRaw.toString())
      : ''
    setMotm(prev => prev || motmId)

    if (!timerInitialized.current && data.status === 'live') {
      timerInitialized.current = true
      const base = data.timerElapsedMs ?? 0
      const startedAt = data.timerStartedAt ? new Date(data.timerStartedAt).getTime() : null
      const initialCs = data.timerRunning && startedAt
        ? Math.floor((base + (Date.now() - startedAt)) / 10)
        : Math.floor(base / 10)
      elapsedRef.current = initialCs
      setElapsed(initialCs)
      setHalf(data.half ?? 1)
      if (data.timerRunning) startTimerLocal()
    }
  }

  async function fetchEvents() {
    const res = await fetch(`/api/matches/${id}/events`)
    setEvents(await res.json())
  }

  async function fetchPlayers() {
    const res = await fetch('/api/players')
    setPlayers(await res.json())
  }

  async function fetchTeams() {
    const res = await fetch('/api/teams')
    setAllTeams(await res.json())
  }

  useEffect(() => {
    fetchMatch()
    fetchEvents()
    fetchPlayers()
    fetchTeams()
  }, [id])

  // Intervalo de atualização durante partida ao vivo
  useEffect(() => {
    if (match?.status !== 'live') return
    const interval = setInterval(() => { fetchMatch(); fetchEvents() }, 10000)
    return () => clearInterval(interval)
  }, [match?.status])

  async function updateStatus(status: string) {
    await fetch(`/api/matches/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (status === 'live') { timerInitialized.current = true; await startTimer() }
    if (status === 'finished') await pauseTimer()
    fetchMatch()
  }

  async function addEvent(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedPlayer || !minute) return
    setSaving(true)

    const body: any = {
      type: eventType,
      player: selectedPlayer,
      team: selectedTeam,
      minute: Number(minute),
      half,
    }
    if (eventType === 'goal' && assistPlayer) body.assistPlayer = assistPlayer

    try {
      const res = await fetch(`/api/matches/${id}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json()
        alert(err.error ?? 'Erro ao registrar evento')
        return
      }
      setSelectedPlayer('')
      setAssistPlayer('')
      setMinute('')
      fetchMatch()
      fetchEvents()
      fetchPlayers()
    } finally {
      setSaving(false)
    }
  }

  async function removeEvent(eventId: string) {
    if (!confirm('Remover este evento?')) return
    await fetch(`/api/matches/${id}/events/${eventId}`, { method: 'DELETE' })
    fetchMatch()
    fetchEvents()
    fetchPlayers()
  }

  async function saveManOfTheMatch(playerId: string) {
    setMotm(playerId)
    setMotmSaving(true)
    const res = await fetch(`/api/matches/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ manOfTheMatch: playerId || null }),
    })
    const data = await res.json()
    setMotmSaving(false)
    if (!res.ok) {
      alert('Erro ao salvar: ' + (data?.error ?? res.status))
      setMotm('')
      return
    }
    const savedId = data.manOfTheMatch
      ? (typeof data.manOfTheMatch === 'object' ? data.manOfTheMatch._id : data.manOfTheMatch)
      : null
    if (playerId && !savedId) {
      alert('O campo não foi salvo. Reinicie o servidor e tente novamente.')
      setMotm('')
    }
  }

  async function saveMatchInfo(e: React.FormEvent) {
    e.preventDefault()
    if (editHome === editAway) return alert('Os times devem ser diferentes')
    setEditSaving(true)
    await fetch(`/api/matches/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        homeTeam: editHome,
        awayTeam: editAway,
        phase: editPhase,
        ...(editPhase === 'group' ? { round: parseInt(editRound) || 1 } : {}),
        date: editDate || null,
        venue: editVenue || null,
      }),
    })
    setEditSaving(false)
    setEditOpen(false)
    fetchMatch()
  }

  if (!match) return <div className="text-slate-500 py-10 text-center">Carregando...</div>

  const teamPlayers = (teamId: string) =>
    players.filter(p => {
      const playerTeamId = typeof p.team === 'string' ? p.team : (p.team as any)._id
      return playerTeamId === teamId
    })

  const currentTeamPlayers = teamPlayers(selectedTeam)
  const otherTeamForAssist = currentTeamPlayers

  return (
    <div className="space-y-6">
      {/* Header da partida */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="flex items-center justify-center gap-6 mb-4">
          <div className="flex flex-col items-center gap-1 flex-1">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center font-black overflow-hidden relative"
              style={{ backgroundColor: match.homeTeam.color }}
            >
              {match.homeTeam.logo
                ? <img src={match.homeTeam.logo} alt="" className="w-full h-full object-cover" />
                : <span className="text-white text-xs">{match.homeTeam.shortName}</span>}
            </div>
            <span className="text-sm font-semibold">{match.homeTeam.name}</span>
          </div>
          <div className="text-center">
            <div className="text-4xl font-black tabular-nums">
              {match.homeScore} – {match.awayScore}
            </div>
            <div className="mt-1">
              {match.status === 'live' && (
                <span className="text-xs bg-red-600 text-white px-2 py-0.5 rounded-full animate-pulse font-bold">
                  AO VIVO
                </span>
              )}
              {match.status === 'finished' && (
                <span className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full">Encerrado</span>
              )}
              {match.status === 'scheduled' && (
                <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">Agendado</span>
              )}
            </div>
          </div>
          <div className="flex flex-col items-center gap-1 flex-1">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center font-black overflow-hidden relative"
              style={{ backgroundColor: match.awayTeam.color }}
            >
              {match.awayTeam.logo
                ? <img src={match.awayTeam.logo} alt="" className="w-full h-full object-cover" />
                : <span className="text-white text-xs">{match.awayTeam.shortName}</span>}
            </div>
            <span className="text-sm font-semibold">{match.awayTeam.name}</span>
          </div>
        </div>

        {/* Cronômetro */}
        {match.status === 'live' && (
          <div className="flex flex-col items-center gap-2 mb-4">
            <div className="flex rounded-lg overflow-hidden border border-slate-700 text-xs font-semibold">
              <button
                onClick={() => changeHalf(1)}
                className={`px-4 py-1.5 transition-colors ${half === 1 ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
              >
                1º Tempo
              </button>
              <button
                onClick={() => changeHalf(2)}
                className={`px-4 py-1.5 transition-colors ${half === 2 ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
              >
                2º Tempo
              </button>
            </div>
            <div className="flex items-end gap-0.5 tabular-nums font-black tracking-tight text-white leading-none">
              <span className="text-3xl">{formatTime(elapsed).slice(0, 5)}</span>
              <span className="text-base text-slate-400 mb-0.5">.{formatTime(elapsed).slice(6)}</span>
            </div>
            <div className="flex gap-2 justify-center">
              {timerRunning ? (
                <button onClick={pauseTimer} className="bg-yellow-600 hover:bg-yellow-500 text-white font-semibold px-3 py-1.5 rounded-lg text-xs transition-colors">
                  ⏸ Pausar
                </button>
              ) : (
                <button onClick={startTimer} className="bg-green-700 hover:bg-green-600 text-white font-semibold px-3 py-1.5 rounded-lg text-xs transition-colors">
                  ▶ Retomar
                </button>
              )}
              <button onClick={zeroTimer} className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded-lg text-xs transition-colors">
                ↺ Zerar
              </button>
            </div>
          </div>
        )}

        {/* Controles de status */}
        <div className="flex gap-2 justify-center flex-wrap">
          {match.status === 'scheduled' && (
            <button
              onClick={() => updateStatus('live')}
              className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-5 py-2 rounded-lg text-sm transition-colors"
            >
              ▶ Iniciar Partida
            </button>
          )}
          {match.status === 'live' && (
            <button
              onClick={() => updateStatus('finished')}
              className="bg-red-700 hover:bg-red-600 text-white font-semibold px-5 py-2 rounded-lg text-sm transition-colors"
            >
              ■ Encerrar Partida
            </button>
          )}
          {match.status === 'finished' && (
            <button
              onClick={() => updateStatus('live')}
              className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm transition-colors"
            >
              Reabrir Partida
            </button>
          )}
        </div>
      </div>

      {/* Editar informações da partida */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <button
          onClick={() => setEditOpen(o => !o)}
          className="w-full flex items-center justify-between px-5 py-3 text-sm text-slate-400 hover:text-white transition-colors"
        >
          <span className="font-medium">Editar informações da partida</span>
          <span className="text-lg leading-none">{editOpen ? '▲' : '▼'}</span>
        </button>
        {editOpen && (
          <form onSubmit={saveMatchInfo} className="border-t border-slate-800 px-5 py-4 space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Time da Casa</label>
                <select value={editHome} onChange={e => setEditHome(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500" required>
                  {allTeams.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Time Visitante</label>
                <select value={editAway} onChange={e => setEditAway(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500" required>
                  {allTeams.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
                </select>
              </div>
            </div>
            <div className={`grid gap-4 ${editPhase === 'group' ? 'sm:grid-cols-4' : 'sm:grid-cols-3'}`}>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Fase</label>
                <select value={editPhase} onChange={e => setEditPhase(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500">
                  <option value="group">Fase de Grupos</option>
                  <option value="quarterfinal">Quartas de Final</option>
                  <option value="semifinal">Semifinal</option>
                  <option value="final">Final</option>
                </select>
              </div>
              {editPhase === 'group' && (
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5">Rodada</label>
                  <input type="number" min="1" value={editRound} onChange={e => setEditRound(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                    placeholder="1" />
                </div>
              )}
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Data e Hora</label>
                <input type="datetime-local" value={editDate} onChange={e => setEditDate(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Local</label>
                <input value={editVenue} onChange={e => setEditVenue(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                  placeholder="Quadra do Helyos" />
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={editSaving}
                className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors">
                {editSaving ? 'Salvando...' : 'Salvar Alterações'}
              </button>
              <button type="button" onClick={() => setEditOpen(false)}
                className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm transition-colors">
                Cancelar
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Registrar evento */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-slate-300 mb-4">Registrar Evento</h2>

          {/* Seleção rápida de evento */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            {['goal', 'yellow_card', 'red_card', 'difficult_save'].map(type => (
              <button
                key={type}
                type="button"
                onClick={() => setEventType(type)}
                className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                  eventType === type
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                }`}
              >
                {eventLabel[type]}
              </button>
            ))}
          </div>

          <form onSubmit={addEvent} className="space-y-3">
            {/* Time */}
            <div>
              <label className="block text-xs text-slate-400 mb-1">Time</label>
              <div className="grid grid-cols-2 gap-2">
                {[match.homeTeam, match.awayTeam].map(team => (
                  <button
                    key={team._id}
                    type="button"
                    onClick={() => {
                      setSelectedTeam(team._id)
                      setSelectedPlayer('')
                      setAssistPlayer('')
                    }}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition-colors ${
                      selectedTeam === team._id
                        ? 'border-white bg-slate-700'
                        : 'border-slate-700 bg-slate-800 hover:border-slate-500'
                    }`}
                  >
                    {team.logo ? (
                      <img src={team.logo} alt={team.name} className="w-6 h-6 rounded-full object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-6 h-6 rounded-full flex-shrink-0" style={{ backgroundColor: team.color }} />
                    )}
                    <span className="truncate">{team.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Jogador */}
            <div>
              <label className="block text-xs text-slate-400 mb-1">Jogador</label>
              <select
                value={selectedPlayer}
                onChange={e => setSelectedPlayer(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                required
              >
                <option value="">Selecionar jogador...</option>
                {currentTeamPlayers.map(p => (
                  <option key={p._id} value={p._id}>
                    #{p.number} {p.name}
                    {p.isSuspended ? ' 🚫' : p.isWarned ? ' ⚠️' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Assistência (gol) */}
            {eventType === 'goal' && (
              <div>
                <label className="block text-xs text-slate-400 mb-1">Assistência (opcional)</label>
                <select
                  value={assistPlayer}
                  onChange={e => setAssistPlayer(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="">Sem assistência</option>
                  {otherTeamForAssist
                    .filter(p => p._id !== selectedPlayer)
                    .map(p => (
                      <option key={p._id} value={p._id}>#{p.number} {p.name}</option>
                    ))}
                </select>
              </div>
            )}

            {/* Minuto */}
            <div>
              <label className="block text-xs text-slate-400 mb-1">Minuto</label>
              <input
                type="number"
                value={minute}
                onChange={e => setMinute(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                placeholder="1–40"
                min={1} max={60}
                required
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors"
            >
              {saving ? 'Registrando...' : `Registrar ${eventLabel[eventType]}`}
            </button>
          </form>
        </div>

        {/* Timeline de eventos */}
        <div>
          <h2 className="text-sm font-semibold text-slate-300 mb-4">
            Eventos {events.length > 0 && <span className="text-slate-500 font-normal">({events.length})</span>}
          </h2>
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {events.length === 0 && (
              <p className="text-slate-600 text-sm text-center py-8">Nenhum evento ainda</p>
            )}
            {[...events].reverse().map(event => (
              <div
                key={event._id}
                className="flex items-start gap-3 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2.5"
              >
                <div className="flex flex-col items-end w-10 flex-shrink-0 pt-0.5 gap-0.5">
                  <span className="text-slate-500 text-xs">{event.minute}'</span>
                  {event.half && (
                    <span className="text-slate-600 text-[10px] leading-none">{event.half}T</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: event.team?.color ?? '#888' }}
                    />
                    <span className="text-xs text-slate-400">{eventLabel[event.type]}</span>
                  </div>
                  <p className="font-medium text-sm mt-0.5">{event.player?.name}</p>
                  {event.type === 'goal' && event.assistPlayer && (
                    <p className="text-xs text-slate-500">Assist: {event.assistPlayer.name}</p>
                  )}

                </div>
                <button
                  onClick={() => removeEvent(event._id)}
                  className="text-slate-600 hover:text-red-400 transition-colors text-xs flex-shrink-0"
                  title="Remover evento"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Avisos de suspensão */}
      {players.some(p => p.isSuspended || p.isWarned) && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <h3 className="text-xs text-slate-400 uppercase tracking-wider mb-3">Situação Disciplinar</h3>
          <div className="grid sm:grid-cols-2 gap-2">
            {players.filter(p => p.isSuspended || p.isWarned).map(p => {
              const teamId = typeof p.team === 'string' ? p.team : (p.team as any)._id
              const team = teamId === match.homeTeam._id ? match.homeTeam : match.awayTeam
              return (
                <div key={p._id} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: team.color }} />
                  <span className="text-sm">{p.name}</span>
                  {p.isSuspended ? (
                    <span className="text-xs bg-red-600 text-white px-1.5 py-0.5 rounded-full">Suspenso</span>
                  ) : (
                    <span className="text-xs bg-yellow-500 text-black px-1.5 py-0.5 rounded-full">
                      ⚠️ {p.yellowCardCount}/3 amarelos
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Melhor da partida */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <h3 className="text-xs text-slate-400 uppercase tracking-wider mb-3">🏅 Melhor da Partida</h3>
        <select
          value={motm}
          onChange={e => saveManOfTheMatch(e.target.value)}
          disabled={motmSaving}
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 disabled:opacity-50"
        >
          <option value="">Nenhum selecionado</option>
          {[match.homeTeam, match.awayTeam].map(team => (
            <optgroup key={team._id} label={team.name}>
              {players
                .filter(p => {
                  const tid = typeof p.team === 'string' ? p.team : (p.team as any)?._id?.toString() ?? ''
                  return tid === team._id
                })
                .map(p => (
                  <option key={p._id} value={p._id}>#{p.number} {p.name}</option>
                ))}
            </optgroup>
          ))}
        </select>
        {motm && (
          <p className="text-xs text-slate-500 mt-2">
            {motmSaving ? 'Salvando...' : <>Eleito: <span className="text-white font-medium">{players.find(p => p._id === motm)?.name ?? '—'}</span></>}
          </p>
        )}
      </div>
    </div>
  )
}
