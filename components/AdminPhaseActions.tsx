'use client'

import { useState } from 'react'

export default function AdminPhaseActions() {
  const [loadingBracket, setLoadingBracket] = useState(false)
  const [loadingTransition, setLoadingTransition] = useState(false)
  const [msg, setMsg] = useState('')

  async function generateBracket() {
    if (!confirm('Gerar o chaveamento do mata-mata com base na classificação atual?')) return
    setLoadingBracket(true)
    setMsg('')
    try {
      const res = await fetch('/api/bracket/generate', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) { setMsg('Erro: ' + (data.error ?? res.status)); return }
      setMsg('Chaveamento gerado com sucesso!')
    } finally {
      setLoadingBracket(false)
    }
  }

  async function transitionToKnockout() {
    if (!confirm('Iniciar o mata-mata? Isso zerará os cartões amarelos de todos os jogadores (suspensões pendentes são mantidas).')) return
    setLoadingTransition(true)
    setMsg('')
    try {
      const res = await fetch('/api/transition', { method: 'POST' })
      if (!res.ok) { setMsg('Erro ao fazer transição'); return }
      setMsg('Transição concluída! Cartões amarelos zerados.')
    } finally {
      setLoadingTransition(false)
    }
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
      <h2 className="text-sm font-semibold text-slate-300">Virada de Fase</h2>
      <p className="text-xs text-slate-500">Use após encerrar toda a fase de grupos.</p>
      <div className="flex flex-col sm:flex-row gap-2">
        <button
          onClick={generateBracket}
          disabled={loadingBracket}
          className="flex-1 bg-blue-700 hover:bg-blue-600 disabled:bg-slate-700 text-white font-semibold py-2.5 px-4 rounded-lg text-sm transition-colors"
        >
          {loadingBracket ? 'Gerando...' : 'Gerar Chaveamento'}
        </button>
        <button
          onClick={transitionToKnockout}
          disabled={loadingTransition}
          className="flex-1 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-700 text-white font-semibold py-2.5 px-4 rounded-lg text-sm transition-colors"
        >
          {loadingTransition ? 'Processando...' : 'Zerar Amarelos (Mata-Mata)'}
        </button>
      </div>
      {msg && <p className="text-xs text-emerald-400">{msg}</p>}
    </div>
  )
}
