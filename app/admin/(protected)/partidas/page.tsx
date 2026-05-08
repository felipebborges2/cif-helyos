'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Team { _id: string; name: string; color: string; logo?: string }
interface Match {
  _id: string; homeTeam: Team; awayTeam: Team; homeScore: number; awayScore: number
  phase: string; status: string; date?: string; venue?: string; matchNumber?: number; round?: number
}

const phaseLabel: Record<string, string> = {
  group: 'Fase de Grupos', quarterfinal: 'Quartas', semifinal: 'Semifinal', final: 'Final',
}

const statusLabel: Record<string, string> = {
  scheduled: 'Agendado', live: 'Ao Vivo', finished: 'Encerrado',
}

export default function PartidasPage() {
  const [matches, setMatches] = useState<Match[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [homeTeam, setHomeTeam] = useState('')
  const [awayTeam, setAwayTeam] = useState('')
  const [phase, setPhase] = useState('group')
  const [date, setDate] = useState('')
  const [venue, setVenue] = useState('')
  const [round, setRound] = useState('1')
  const [loading, setLoading] = useState(false)

  async function fetchAll() {
    const [mRes, tRes] = await Promise.all([fetch('/api/matches'), fetch('/api/teams')])
    setMatches(await mRes.json())
    const ts = await tRes.json()
    setTeams(ts)
    if (!homeTeam && ts.length >= 2) {
      setHomeTeam(ts[0]._id)
      setAwayTeam(ts[1]._id)
    }
  }

  useEffect(() => { fetchAll() }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (homeTeam === awayTeam) return alert('Os times devem ser diferentes')
    setLoading(true)
    await fetch('/api/matches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ homeTeam, awayTeam, phase, round: phase === 'group' ? parseInt(round) || 1 : undefined, date: date || undefined, venue: venue || undefined }),
    })
    setLoading(false)
    setDate('')
    setVenue('')
    setRound('1')
    fetchAll()
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir esta partida?')) return
    await fetch(`/api/matches/${id}`, { method: 'DELETE' })
    fetchAll()
  }

  const [generating, setGenerating] = useState(false)

  async function generateBracket() {
    if (!confirm('Isso vai apagar as partidas de quartas, semifinais e final existentes e gerar novas com base na classificação atual. Continuar?')) return
    setGenerating(true)
    const res = await fetch('/api/bracket/generate', { method: 'POST' })
    const data = await res.json()
    setGenerating(false)
    if (!res.ok) return alert(data.error ?? 'Erro ao gerar mata-mata')
    fetchAll()
    alert('Mata-mata gerado com sucesso!')
  }

  const grouped = matches.reduce((acc, m) => {
    if (!acc[m.phase]) acc[m.phase] = []
    acc[m.phase].push(m)
    return acc
  }, {} as Record<string, Match[]>)

  const phaseOrder = ['group', 'quarterfinal', 'semifinal', 'final']
  const hasGroupFinished = (grouped['group'] ?? []).some(m => m.status === 'finished')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Partidas</h1>
        {hasGroupFinished && (
          <button
            onClick={generateBracket}
            disabled={generating}
            className="px-4 py-2 bg-violet-700 hover:bg-violet-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {generating ? 'Gerando...' : '⚡ Gerar Mata-Mata'}
          </button>
        )}
      </div>

      {/* Formulário nova partida */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-slate-300 mb-4">Nova Partida</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Time da Casa</label>
              <select value={homeTeam} onChange={e => setHomeTeam(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                required>
                {teams.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Time Visitante</label>
              <select value={awayTeam} onChange={e => setAwayTeam(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                required>
                {teams.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
              </select>
            </div>
          </div>
          <div className={`grid gap-4 ${phase === 'group' ? 'sm:grid-cols-4' : 'sm:grid-cols-3'}`}>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Fase</label>
              <select value={phase} onChange={e => setPhase(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500">
                <option value="group">Fase de Grupos</option>
                <option value="quarterfinal">Quartas de Final</option>
                <option value="semifinal">Semifinal</option>
                <option value="final">Final</option>
              </select>
            </div>
            {phase === 'group' && (
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Rodada</label>
                <input
                  type="number"
                  min="1"
                  value={round}
                  onChange={e => setRound(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                  placeholder="1"
                />
              </div>
            )}
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Data e Hora</label>
              <input type="datetime-local" value={date} onChange={e => setDate(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Local</label>
              <input value={venue} onChange={e => setVenue(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                placeholder="Quadra do Helyos" />
            </div>
          </div>
          <button type="submit" disabled={loading}
            className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors">
            {loading ? 'Criando...' : 'Criar Partida'}
          </button>
        </form>
      </div>

      {/* Lista por fase */}
      {phaseOrder.map(p => {
        const phaseMatches = grouped[p]
        if (!phaseMatches?.length) return null
        return (
          <section key={p}>
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              {phaseLabel[p]}
            </h2>
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <tbody>
                  {phaseMatches.map(match => (
                    <tr key={match._id} className="border-b border-slate-800/50 last:border-0">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {match.homeTeam.logo ? (
                            <img src={match.homeTeam.logo} alt={match.homeTeam.name} className="w-6 h-6 rounded-full object-cover flex-shrink-0" />
                          ) : (
                            <div className="w-6 h-6 rounded-full flex-shrink-0" style={{ backgroundColor: match.homeTeam.color }} />
                          )}
                          <span className="font-medium text-sm">{match.homeTeam.name}</span>
                        </div>
                      </td>
                      <td className="text-center px-2 py-3">
                        {match.status === 'scheduled' ? (
                          <span className="text-slate-600 text-xs">vs</span>
                        ) : (
                          <span className="font-black">{match.homeScore} – {match.awayScore}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {match.awayTeam.logo ? (
                            <img src={match.awayTeam.logo} alt={match.awayTeam.name} className="w-6 h-6 rounded-full object-cover flex-shrink-0" />
                          ) : (
                            <div className="w-6 h-6 rounded-full flex-shrink-0" style={{ backgroundColor: match.awayTeam.color }} />
                          )}
                          <span className="font-medium text-sm">{match.awayTeam.name}</span>
                        </div>
                      </td>
                      <td className="px-2 py-3 text-center">
                        {match.phase === 'group' && match.round && (
                          <span className="text-xs text-slate-600 mr-2">R{match.round}</span>
                        )}
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          match.status === 'live' ? 'bg-red-600 text-white animate-pulse' :
                          match.status === 'finished' ? 'bg-slate-700 text-slate-300' :
                          'bg-slate-800 text-slate-400'
                        }`}>
                          {statusLabel[match.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2 justify-end">
                          <Link
                            href={`/admin/partidas/${match._id}`}
                            className="text-xs bg-blue-700 hover:bg-blue-600 text-white px-2 py-1 rounded transition-colors"
                          >
                            {match.status === 'live' ? '⚡ Ao Vivo' : 'Gerenciar'}
                          </Link>
                          <button onClick={() => handleDelete(match._id)}
                            className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded border border-red-900 hover:border-red-700 transition-colors">
                            Excluir
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )
      })}

      {!matches.length && (
        <p className="text-slate-500 text-center py-10">Nenhuma partida cadastrada</p>
      )}
    </div>
  )
}
