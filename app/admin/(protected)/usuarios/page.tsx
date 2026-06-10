'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Image from 'next/image'

const PERMISSIONS = [
  { key: 'managePlayers', label: 'Inscrever jogadores' },
  { key: 'createTeams',       label: 'Criar times' },
  { key: 'editTeams',         label: 'Editar times' },
  { key: 'createMatches',     label: 'Criar jogos' },
  { key: 'editMatches',       label: 'Editar jogos' },
  { key: 'editLive',          label: 'Editar ao vivo' },
  { key: 'manageSuspensions', label: 'Gerenciar suspensões' },
]

type Team = { _id: string; name: string; shortName: string; color: string; logo?: string }

type User = {
  _id: string
  name: string
  email: string
  role: string
  organizerNumber?: string
  teamId?: Team | null
  permissions?: Record<string, boolean>
}

export default function UsuariosPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [saving, setSaving] = useState<string | null>(null)

  // form state
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [teamId, setTeamId] = useState('')
  const [creating, setCreating] = useState(false)

  const isAdmin = (session?.user as any)?.role === 'admin'

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/admin/login')
    if (status === 'authenticated' && !isAdmin) router.push('/admin')
  }, [status, isAdmin, router])

  useEffect(() => {
    if (!isAdmin) return
    fetch('/api/users').then(r => r.json()).then(setUsers)
    fetch('/api/teams?all=true').then(r => r.json()).then(setTeams)
  }, [isAdmin])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, teamId: teamId || null }),
      })
      if (!res.ok) {
        const err = await res.json()
        alert(err.error ?? 'Erro ao criar organizador')
        return
      }
      const created = await res.json()
      setUsers(prev => [...prev, created])
      setName(''); setEmail(''); setPassword(''); setTeamId('')
    } finally {
      setCreating(false)
    }
  }

  async function togglePermission(userId: string, key: string, current: boolean) {
    setSaving(userId + key)
    const res = await fetch(`/api/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [`permissions.${key}`]: !current }),
    })
    const updated = await res.json()
    setUsers(prev => prev.map(u => u._id === userId ? { ...u, permissions: updated.permissions } : u))
    setSaving(null)
  }

  async function changeTeam(userId: string, newTeamId: string) {
    setSaving(userId + 'team')
    const res = await fetch(`/api/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teamId: newTeamId || null }),
    })
    const updated = await res.json()
    const team = teams.find(t => t._id === newTeamId) ?? null
    setUsers(prev => prev.map(u => u._id === userId ? { ...u, teamId: team } : u))
    setSaving(null)
  }

  async function deleteUser(userId: string, name: string) {
    if (!confirm(`Remover ${name}?`)) return
    await fetch(`/api/users/${userId}`, { method: 'DELETE' })
    setUsers(prev => prev.filter(u => u._id !== userId))
  }

  if (status === 'loading' || !isAdmin) return null

  const others = users.filter(u => u.email !== session?.user?.email)

  return (
    <div className="space-y-8">
      <h1 className="text-xl font-bold text-white">Gerenciar Organizadores</h1>

      {/* Criar organizador */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-slate-300">Novo organizador</h2>
        <form onSubmit={handleCreate} className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Nome</label>
            <input value={name} onChange={e => setName(e.target.value)} required
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
              placeholder="Nome completo" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Email</label>
            <input value={email} onChange={e => setEmail(e.target.value)} type="email" required
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
              placeholder="email@exemplo.com" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Senha</label>
            <input value={password} onChange={e => setPassword(e.target.value)} type="password" required minLength={6}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
              placeholder="Mínimo 6 caracteres" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Time (opcional)</label>
            <select value={teamId} onChange={e => setTeamId(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500">
              <option value="">Sem time vinculado</option>
              {teams.map(t => (
                <option key={t._id} value={t._id}>{t.name}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <button type="submit" disabled={creating}
              className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors">
              {creating ? 'Criando...' : 'Criar organizador'}
            </button>
          </div>
        </form>
      </div>

      {others.length === 0 && (
        <p className="text-slate-500 text-sm">Nenhum organizador cadastrado ainda.</p>
      )}

      <div className="space-y-4">
        {others.map(user => (
          <div key={user._id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-white">{user.name}</p>
                  <p className="text-slate-500 text-xs">{user.email}</p>
                </div>
              </div>
              <button onClick={() => deleteUser(user._id, user.name)}
                className="text-xs text-red-500 hover:text-red-400 transition-colors">
                Remover
              </button>
            </div>

            {/* Time vinculado */}
            <div className="border-t border-slate-800 pt-4">
              <label className="block text-xs text-slate-400 mb-2">Time representado</label>
              <div className="flex items-center gap-3">
                {user.teamId && (
                  <div className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs text-white flex-shrink-0 overflow-hidden relative"
                    style={{ backgroundColor: user.teamId.color }}>
                    {user.teamId.logo
                      ? <Image src={user.teamId.logo} alt="" fill className="object-cover" unoptimized />
                      : user.teamId.shortName}
                  </div>
                )}
                <select
                  value={user.teamId?._id ?? ''}
                  onChange={e => changeTeam(user._id, e.target.value)}
                  disabled={saving === user._id + 'team'}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500 disabled:opacity-50">
                  <option value="">Sem time vinculado</option>
                  {teams.map(t => (
                    <option key={t._id} value={t._id}>{t.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Permissões */}
            <div className="border-t border-slate-800 pt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PERMISSIONS.map(({ key, label }) => {
                const granted = user.permissions?.[key] === true
                const isSaving = saving === user._id + key
                return (
                  <button key={key} onClick={() => togglePermission(user._id, key, granted)} disabled={isSaving}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                      granted
                        ? 'bg-green-950/50 border border-green-800 text-green-300'
                        : 'bg-slate-800 border border-slate-700 text-slate-500 hover:border-slate-500'
                    }`}>
                    <span>{label}</span>
                    <span className={`text-xs font-medium ${granted ? 'text-green-400' : 'text-slate-600'}`}>
                      {isSaving ? '...' : granted ? 'Ativo' : 'Inativo'}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
