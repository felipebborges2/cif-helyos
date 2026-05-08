'use client'

import { useState, useEffect } from 'react'
import SuspensionBadge from '@/components/SuspensionBadge'

interface Team { _id: string; name: string; color: string; logo?: string }
interface Player {
  _id: string; name: string; number: number; team: Team
  yellowCardCount: number; isSuspended: boolean; isWarned: boolean; isActive: boolean
}

export default function JogadoresPage() {
  const [players, setPlayers] = useState<Player[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [name, setName] = useState('')
  const [number, setNumber] = useState('')
  const [teamId, setTeamId] = useState('')
  const [editing, setEditing] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function fetchAll() {
    const [pRes, tRes] = await Promise.all([fetch('/api/players'), fetch('/api/teams')])
    setPlayers(await pRes.json())
    const ts = await tRes.json()
    setTeams(ts)
    if (!teamId && ts.length) setTeamId(ts[0]._id)
  }

  useEffect(() => { fetchAll() }, [])

  function startEdit(p: Player) {
    setEditing(p._id)
    setName(p.name)
    setNumber(String(p.number))
    setTeamId(p.team._id)
  }

  function cancelEdit() {
    setEditing(null)
    setName('')
    setNumber('')
    setTeamId(teams[0]?._id ?? '')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const num = Number(number)
    const duplicate = players.find(p =>
      p.team._id === teamId &&
      p.number === num &&
      p._id !== editing
    )
    if (duplicate) {
      alert(`O número ${num} já está em uso por ${duplicate.name} neste time.`)
      return
    }

    setLoading(true)
    const body = { name, number: num, team: teamId }

    try {
      const url = editing ? `/api/players/${editing}` : '/api/players'
      const method = editing ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        alert('Erro ao salvar: ' + (err.error ?? res.status))
        return
      }
      setEditing(null)
      setName('')
      setNumber('')
    } finally {
      setLoading(false)
      fetchAll()
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir este jogador?')) return
    await fetch(`/api/players/${id}`, { method: 'DELETE' })
    fetchAll()
  }


  const byTeam = teams.map(t => ({
    team: t,
    players: players.filter(p => p.team._id === t._id).sort((a, b) => a.number - b.number),
  })).filter(g => g.players.length > 0)

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-white">Jogadores</h1>

      {/* Formulário */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-slate-300 mb-4">
          {editing ? 'Editar Jogador' : 'Novo Jogador'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="sm:col-span-1">
              <label className="block text-xs text-slate-400 mb-1.5">Nome</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                placeholder="Nome completo"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Número</label>
              <input
                type="number"
                value={number}
                onChange={e => setNumber(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                placeholder="10"
                min={1} max={99}
                required
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Time</label>
              <select
                value={teamId}
                onChange={e => setTeamId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                required
              >
                {teams.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
            >
              {loading ? 'Salvando...' : editing ? 'Salvar' : 'Adicionar Jogador'}
            </button>
            {editing && (
              <button type="button" onClick={cancelEdit}
                className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm transition-colors">
                Cancelar
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Lista agrupada por time */}
      {players.length === 0 ? (
        <p className="text-slate-500 text-center py-10 text-sm">Nenhum jogador cadastrado</p>
      ) : (
        <div className="space-y-6">
          {byTeam.map(({ team, players: teamPlayers }) => (
            <div key={team._id}>
              <div className="flex items-center gap-2 mb-2">
                {team.logo ? (
                  <img src={team.logo} alt={team.name} className="w-5 h-5 rounded-full object-cover flex-shrink-0" />
                ) : (
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: team.color }} />
                )}
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{team.name}</span>
                <span className="text-slate-600 text-xs">· {teamPlayers.length} jogadores</span>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <tbody>
                    {teamPlayers.map(p => (
                      <tr key={p._id} className="border-b border-slate-800/50 last:border-0">
                        <td className="px-4 py-2.5 text-slate-500 text-xs w-10 tabular-nums text-right">{p.number}</td>
                        <td className="px-3 py-2.5 font-medium flex-1">{p.name}</td>
                        <td className="px-2 py-2.5 text-center text-slate-500 text-xs">{p.yellowCardCount}/3 🟨</td>
                        <td className="px-2 py-2.5">
                          <SuspensionBadge isSuspended={p.isSuspended} isWarned={p.isWarned} />
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex gap-2 justify-end">
                            <button onClick={() => startEdit(p)}
                              className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded border border-slate-700 hover:border-slate-500 transition-colors">
                              Editar
                            </button>
                            <button onClick={() => handleDelete(p._id)}
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
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
