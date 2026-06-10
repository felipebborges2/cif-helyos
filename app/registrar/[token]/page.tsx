'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

export default function RegistrarPage() {
  const { token } = useParams<{ token: string }>()
  const router = useRouter()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [teamName, setTeamName] = useState<string | null>(null)
  const [validating, setValidating] = useState(true)
  const [invalid, setInvalid] = useState(false)

  useEffect(() => {
    fetch(`/api/invites/validate?token=${token}`)
      .then(r => r.json())
      .then(data => {
        if (data.valid) {
          setTeamName(data.teamName ?? null)
        } else {
          setInvalid(true)
        }
      })
      .finally(() => setValidating(false))
  }, [token])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password !== confirm) {
      setError('As senhas não coincidem')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/invites/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, name, email, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Erro ao criar conta')
        return
      }
      setDone(true)
    } finally {
      setLoading(false)
    }
  }

  if (validating) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <p className="text-slate-500 text-sm">Verificando convite...</p>
      </div>
    )
  }

  if (invalid) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
        <div className="text-center space-y-3">
          <p className="text-white font-semibold">Link inválido ou expirado</p>
          <p className="text-slate-500 text-sm">Solicite um novo link ao administrador da Copa.</p>
        </div>
      </div>
    )
  }

  if (done) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
        <div className="text-center space-y-3">
          <p className="text-white font-semibold text-lg">Conta criada com sucesso!</p>
          <p className="text-slate-400 text-sm">Você já pode fazer login no painel.</p>
          <button onClick={() => router.push('/admin/login')}
            className="mt-4 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-6 py-2.5 rounded-lg text-sm transition-colors">
            Ir para o login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-xl font-bold text-white">Criar conta</h1>
          {teamName && (
            <p className="text-slate-400 text-sm">Representante de <span className="text-white font-medium">{teamName}</span></p>
          )}
          {!teamName && (
            <p className="text-slate-400 text-sm">Copa Interclasses Helyos</p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Nome completo</label>
            <input value={name} onChange={e => setName(e.target.value)} required
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
              placeholder="Seu nome" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Email</label>
            <input value={email} onChange={e => setEmail(e.target.value)} type="email" required
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
              placeholder="seu@email.com" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Senha</label>
            <input value={password} onChange={e => setPassword(e.target.value)} type="password" required minLength={6}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
              placeholder="Mínimo 6 caracteres" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Confirmar senha</label>
            <input value={confirm} onChange={e => setConfirm(e.target.value)} type="password" required
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
              placeholder="Repita a senha" />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button type="submit" disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors">
            {loading ? 'Criando conta...' : 'Criar conta'}
          </button>
        </form>
      </div>
    </div>
  )
}
