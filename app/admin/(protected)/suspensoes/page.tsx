'use client'

import { useState, useEffect } from 'react'

interface Suspension {
  _id: string
  player: { _id: string; name: string; team: { _id: string; name: string; color: string } }
  reason: string
  matchesToServe: number
  matchesServed: number
  status: string
  disciplinaryNote?: string
  createdAt: string
}

const reasonLabel: Record<string, string> = {
  yellow_cards: '3 Cartões Amarelos',
  red_card: 'Cartão Vermelho',
  disciplinary: 'Comissão Disciplinar',
}

const statusLabel: Record<string, string> = {
  pending: 'Pendente',
  serving: 'Cumprindo',
  completed: 'Cumprida',
}

export default function SuspensoesPage() {
  const [suspensions, setSuspensions] = useState<Suspension[]>([])
  const [loading, setLoading] = useState(false)

  // Para suspensão disciplinar manual
  const [players, setPlayers] = useState<any[]>([])
  const [playerId, setPlayerId] = useState('')
  const [matchesToServe, setMatchesToServe] = useState('1')
  const [note, setNote] = useState('')

  async function fetchAll() {
    const [sRes, pRes] = await Promise.all([fetch('/api/suspensions'), fetch('/api/players')])
    setSuspensions(await sRes.json())
    const ps = await pRes.json()
    setPlayers(ps)
    if (!playerId && ps.length) setPlayerId(ps[0]._id)
  }

  useEffect(() => { fetchAll() }, [])

  async function handleDisciplinary(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    await fetch('/api/suspensions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        player: playerId,
        reason: 'disciplinary',
        matchesToServe: Number(matchesToServe),
        disciplinaryNote: note,
      }),
    })
    setNote('')
    setLoading(false)
    fetchAll()
  }

  async function updateStatus(id: string, status: string, matchesServed?: number) {
    await fetch(`/api/suspensions/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, ...(matchesServed !== undefined ? { matchesServed } : {}) }),
    })
    fetchAll()
  }

  async function deleteSuspension(id: string) {
    if (!confirm('Remover esta suspensão?')) return
    await fetch(`/api/suspensions/${id}`, { method: 'DELETE' })
    fetchAll()
  }

  const pending = suspensions.filter(s => s.status === 'pending' || s.status === 'serving')
  const completed = suspensions.filter(s => s.status === 'completed')

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-white">Suspensões</h1>

      {/* Suspensão disciplinar manual */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-slate-300 mb-4">Suspensão Disciplinar</h2>
        <form onSubmit={handleDisciplinary} className="space-y-3">
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Jogador</label>
              <select value={playerId} onChange={e => setPlayerId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500">
                {players.map(p => (
                  <option key={p._id} value={p._id}>{p.name} ({p.team?.name})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Jogos de suspensão</label>
              <input type="number" value={matchesToServe} onChange={e => setMatchesToServe(e.target.value)}
                min={1} max={99}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Observações</label>
              <input value={note} onChange={e => setNote(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                placeholder="Motivo da suspensão..." />
            </div>
          </div>
          <button type="submit" disabled={loading}
            className="bg-red-700 hover:bg-red-600 disabled:bg-slate-700 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors">
            {loading ? 'Aplicando...' : 'Aplicar Suspensão Disciplinar'}
          </button>
        </form>
      </div>

      {/* Suspensões ativas */}
      <div>
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
          Ativas ({pending.length})
        </h2>
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          {pending.length === 0 ? (
            <p className="text-slate-500 text-center py-8 text-sm">Nenhuma suspensão ativa</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500 text-xs uppercase">
                  <th className="text-left px-4 py-3">Jogador</th>
                  <th className="text-left px-2 py-3 hidden sm:table-cell">Time</th>
                  <th className="text-left px-2 py-3">Motivo</th>
                  <th className="text-center px-2 py-3">Jogos</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {pending.map(s => (
                  <tr key={s._id} className="border-b border-slate-800/50 last:border-0">
                    <td className="px-4 py-3 font-medium">{s.player?.name}</td>
                    <td className="px-2 py-3 hidden sm:table-cell">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.player?.team?.color }} />
                        <span className="text-slate-400 text-xs">{s.player?.team?.name}</span>
                      </div>
                    </td>
                    <td className="px-2 py-3">
                      <div>
                        <span className="text-xs">{reasonLabel[s.reason]}</span>
                        {s.disciplinaryNote && (
                          <p className="text-xs text-slate-500 mt-0.5">{s.disciplinaryNote}</p>
                        )}
                      </div>
                    </td>
                    <td className="text-center px-2 py-3">
                      <span className="text-xs text-slate-400">{s.matchesServed}/{s.matchesToServe}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => updateStatus(s._id, 'completed', s.matchesToServe)}
                          className="text-xs text-blue-400 hover:text-green-300 px-2 py-1 rounded border border-green-900 hover:border-green-700 transition-colors"
                        >
                          Cumprida
                        </button>
                        <button
                          onClick={() => deleteSuspension(s._id)}
                          className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded border border-red-900 hover:border-red-700 transition-colors"
                        >
                          Remover
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Suspensões cumpridas */}
      {completed.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Cumpridas ({completed.length})
          </h2>
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden opacity-60">
            <table className="w-full text-sm">
              <tbody>
                {completed.map(s => (
                  <tr key={s._id} className="border-b border-slate-800/50 last:border-0">
                    <td className="px-4 py-2.5 font-medium text-slate-400">{s.player?.name}</td>
                    <td className="px-2 py-2.5 text-slate-500 text-xs">{reasonLabel[s.reason]}</td>
                    <td className="px-4 py-2.5 text-slate-600 text-xs text-right">
                      {new Date(s.createdAt).toLocaleDateString('pt-BR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
