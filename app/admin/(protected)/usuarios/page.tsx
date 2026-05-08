'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

const PERMISSIONS = [
  { key: 'createTeams',       label: 'Criar times' },
  { key: 'editTeams',         label: 'Editar times' },
  { key: 'createMatches',     label: 'Criar jogos' },
  { key: 'editMatches',       label: 'Editar jogos' },
  { key: 'editLive',          label: 'Editar ao vivo' },
  { key: 'managePlayers',     label: 'Gerenciar jogadores' },
  { key: 'manageSuspensions', label: 'Gerenciar suspensões' },
]

type User = {
  _id: string
  name: string
  email: string
  role: string
  organizerNumber?: string
  permissions?: Record<string, boolean>
}

export default function UsuariosPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [saving, setSaving] = useState<string | null>(null)

  const isAdmin = (session?.user as any)?.role === 'admin'

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/admin/login')
    if (status === 'authenticated' && !isAdmin) router.push('/admin')
  }, [status, isAdmin, router])

  useEffect(() => {
    if (!isAdmin) return
    fetch('/api/users').then(r => r.json()).then(setUsers)
  }, [isAdmin])

  async function togglePermission(userId: string, key: string, current: boolean) {
    setSaving(userId + key)
    const res = await fetch(`/api/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [`permissions.${key}`]: !current }),
    })
    const updated = await res.json()
    setUsers(prev => prev.map(u => u._id === userId ? updated : u))
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
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-white">Gerenciar Organizadores</h1>

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
              <div className="flex items-center gap-3">
                {user.organizerNumber && (
                  <span className="text-slate-600 text-xs font-mono">#{user.organizerNumber}</span>
                )}
                <button
                  onClick={() => deleteUser(user._id, user.name)}
                  className="text-xs text-red-500 hover:text-red-400 transition-colors"
                >
                  Remover
                </button>
              </div>
            </div>

            <div className="border-t border-slate-800 pt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PERMISSIONS.map(({ key, label }) => {
                const granted = user.permissions?.[key] === true
                const isSaving = saving === user._id + key
                return (
                  <button
                    key={key}
                    onClick={() => togglePermission(user._id, key, granted)}
                    disabled={isSaving}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                      granted
                        ? 'bg-green-950/50 border border-green-800 text-green-300'
                        : 'bg-slate-800 border border-slate-700 text-slate-500 hover:border-slate-500'
                    }`}
                  >
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
