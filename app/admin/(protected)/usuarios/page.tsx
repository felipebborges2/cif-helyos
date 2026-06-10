'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Image from 'next/image'

const PERMISSIONS = [
  { key: 'managePlayers',     label: 'Inscrever jogadores' },
  { key: 'createTeams',       label: 'Criar times' },
  { key: 'editTeams',         label: 'Editar times' },
  { key: 'createMatches',     label: 'Criar jogos' },
  { key: 'editMatches',       label: 'Editar jogos' },
  { key: 'editLive',          label: 'Editar ao vivo' },
  { key: 'manageSuspensions', label: 'Gerenciar suspensões' },
]

type Team = { _id: string; name: string; shortName: string; color: string; logo?: string }
type User = {
  _id: string; name: string; email: string; role: string
  teamId?: Team | null; permissions?: Record<string, boolean>
}
type Invite = {
  _id: string; token: string; teamId?: Team | null
  expiresAt: string; createdAt: string
}

export default function UsuariosPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [invites, setInvites] = useState<Invite[]>([])
  const [saving, setSaving] = useState<string | null>(null)
  const [inviteTeamId, setInviteTeamId] = useState('')
  const [generating, setGenerating] = useState(false)
  const [copiedToken, setCopiedToken] = useState<string | null>(null)

  const isAdmin = (session?.user as any)?.role === 'admin'

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/admin/login')
    if (status === 'authenticated' && !isAdmin) router.push('/admin')
  }, [status, isAdmin, router])

  useEffect(() => {
    if (!isAdmin) return
    fetch('/api/users').then(r => r.json()).then(setUsers)
    fetch('/api/teams?all=true').then(r => r.json()).then(setTeams)
    fetch('/api/invites').then(r => r.json()).then(setInvites)
  }, [isAdmin])

  async function generateInvite() {
    setGenerating(true)
    try {
      const res = await fetch('/api/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId: inviteTeamId || null }),
      })
      const invite = await res.json()
      setInvites(prev => [invite, ...prev])
      setInviteTeamId('')
    } finally {
      setGenerating(false)
    }
  }

  async function revokeInvite(id: string) {
    await fetch(`/api/invites/${id}`, { method: 'DELETE' })
    setInvites(prev => prev.filter(i => i._id !== id))
  }

  function copyLink(token: string) {
    const url = `${window.location.origin}/registrar/${token}`
    navigator.clipboard.writeText(url)
    setCopiedToken(token)
    setTimeout(() => setCopiedToken(null), 2000)
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
    await fetch(`/api/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teamId: newTeamId || null }),
    })
    const team = teams.find(t => t._id === newTeamId) ?? null
    setUsers(prev => prev.map(u => u._id === userId ? { ...u, teamId: team } : u))
    setSaving(null)
  }

  async function toggleRole(userId: string, currentRole: string) {
    const newRole = currentRole === 'admin' ? 'organizer' : 'admin'
    const label = newRole === 'admin' ? 'promover a administrador' : 'rebaixar a organizador'
    if (!confirm(`Deseja ${label}?`)) return
    setSaving(userId + 'role')
    await fetch(`/api/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: newRole }),
    })
    setUsers(prev => prev.map(u => u._id === userId ? { ...u, role: newRole } : u))
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

      {/* Gerar convite */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-300">Convidar representante de time</h2>
          <p className="text-xs text-slate-500 mt-0.5">Gere um link de cadastro e envie ao representante. Válido por 7 dias.</p>
        </div>
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="block text-xs text-slate-400 mb-1.5">Time (opcional)</label>
            <select value={inviteTeamId} onChange={e => setInviteTeamId(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500">
              <option value="">Sem time vinculado</option>
              {teams.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
            </select>
          </div>
          <button onClick={generateInvite} disabled={generating}
            className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white font-semibold px-4 py-2.5 rounded-lg text-sm transition-colors whitespace-nowrap">
            {generating ? 'Gerando...' : 'Gerar link'}
          </button>
        </div>

        {/* Links pendentes */}
        {invites.length > 0 && (
          <div className="border-t border-slate-800 pt-4 space-y-2">
            <p className="text-xs text-slate-500 uppercase tracking-wider">Links ativos</p>
            {invites.map(invite => (
              <div key={invite._id} className="flex items-center gap-3 bg-slate-800 rounded-lg px-3 py-2.5">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-300 truncate font-mono">
                    /registrar/{invite.token.slice(0, 16)}...
                  </p>
                  {invite.teamId && (
                    <p className="text-xs text-slate-500 mt-0.5">{invite.teamId.name}</p>
                  )}
                </div>
                <p className="text-xs text-slate-600 flex-shrink-0">
                  expira {new Date(invite.expiresAt).toLocaleDateString('pt-BR')}
                </p>
                <button onClick={() => copyLink(invite.token)}
                  className="text-xs px-3 py-1.5 rounded border border-slate-600 hover:border-blue-500 text-slate-300 hover:text-blue-300 transition-colors flex-shrink-0">
                  {copiedToken === invite.token ? 'Copiado!' : 'Copiar link'}
                </button>
                <button onClick={() => revokeInvite(invite._id)}
                  className="text-xs text-red-500 hover:text-red-400 transition-colors flex-shrink-0">
                  Revogar
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {others.length === 0 && (
        <p className="text-slate-500 text-sm">Nenhum organizador cadastrado ainda.</p>
      )}

      {/* Lista de organizadores */}
      <div className="space-y-4">
        {others.map(user => (
          <div key={user._id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-white">{user.name}</p>
                    {user.role === 'admin'
                      ? <span className="text-xs bg-blue-900/50 text-blue-300 border border-blue-800 px-1.5 py-0.5 rounded">Admin</span>
                      : <span className="text-xs bg-slate-800 text-slate-400 border border-slate-700 px-1.5 py-0.5 rounded">Organizador</span>
                    }
                  </div>
                  <p className="text-slate-500 text-xs">{user.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => toggleRole(user._id, user.role)}
                  disabled={saving === user._id + 'role'}
                  className={`text-xs px-2.5 py-1 rounded border transition-colors disabled:opacity-50 ${
                    user.role === 'admin'
                      ? 'text-slate-400 border-slate-700 hover:text-yellow-400 hover:border-yellow-800'
                      : 'text-blue-400 border-blue-900 hover:text-blue-300 hover:border-blue-700'
                  }`}>
                  {saving === user._id + 'role' ? '...' : user.role === 'admin' ? 'Tornar organizador' : 'Tornar admin'}
                </button>
                <button onClick={() => deleteUser(user._id, user.name)}
                  className="text-xs text-red-500 hover:text-red-400 transition-colors">
                  Remover
                </button>
              </div>
            </div>

            {/* Time vinculado — só para organizadores */}
            {user.role === 'organizer' && (
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
                  <select value={user.teamId?._id ?? ''} onChange={e => changeTeam(user._id, e.target.value)}
                    disabled={saving === user._id + 'team'}
                    className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500 disabled:opacity-50">
                    <option value="">Sem time vinculado</option>
                    {teams.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
                  </select>
                </div>
              </div>
            )}

            {/* Permissões — só para organizadores */}
            {user.role === 'organizer' && (
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
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
