'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'

interface Team {
  _id: string
  name: string
  shortName: string
  color: string
  logo?: string
  isActive: boolean
}

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899',
  '#ffffff', '#94a3b8',
]

function extractDominantColor(file: File): Promise<string> {
  return new Promise(resolve => {
    const img = new window.Image()
    const url = URL.createObjectURL(file)
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const size = 80
      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, size, size)
      const { data } = ctx.getImageData(0, 0, size, size)

      const colorMap: Record<string, { count: number; r: number; g: number; b: number; sat: number }> = {}

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3]
        if (a < 100) continue

        const qr = Math.round(r / 32) * 32
        const qg = Math.round(g / 32) * 32
        const qb = Math.round(b / 32) * 32

        const max = Math.max(qr, qg, qb)
        const min = Math.min(qr, qg, qb)
        const lightness = (max + min) / 510
        const saturation = max === 0 ? 0 : (max - min) / max
        if (saturation < 0.25) continue
        if (lightness < 0.08 || lightness > 0.92) continue

        const key = `${qr},${qg},${qb}`
        if (!colorMap[key]) colorMap[key] = { count: 0, r: qr, g: qg, b: qb, sat: saturation }
        colorMap[key].count++
      }

      const entries = Object.values(colorMap)
        .sort((a, b) => (b.sat * Math.log(b.count + 1)) - (a.sat * Math.log(a.count + 1)))

      if (entries.length === 0) {
        URL.revokeObjectURL(url)
        resolve('#3b82f6')
        return
      }

      const { r, g, b: bl } = entries[0]
      URL.revokeObjectURL(url)
      const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${bl.toString(16).padStart(2, '0')}`
      resolve(hex)
    }
    img.onerror = () => { URL.revokeObjectURL(url); resolve('#3b82f6') }
    img.src = url
  })
}

export default function TimesPage() {
  const [teams, setTeams] = useState<Team[]>([])
  const [name, setName] = useState('')
  const [shortName, setShortName] = useState('')
  const [color, setColor] = useState('#3b82f6')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string>('')
  const [foundingYear, setFoundingYear] = useState('')
  const [description, setDescription] = useState('')
  const [titleYears, setTitleYears] = useState('')
  const [editing, setEditing] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function fetchTeams() {
    const res = await fetch('/api/teams?all=true')
    setTeams(await res.json())
  }

  useEffect(() => { fetchTeams() }, [])

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
    setExtracting(true)
    const extracted = await extractDominantColor(file)
    setColor(extracted)
    setExtracting(false)
  }

  function startEdit(team: Team) {
    setEditing(team._id)
    setName(team.name)
    setShortName(team.shortName)
    setColor(team.color)
    setLogoFile(null)
    setLogoPreview(team.logo ?? '')
    setFoundingYear((team as any).foundingYear?.toString() ?? '')
    setDescription((team as any).description ?? '')
    setTitleYears(((team as any).titleYears as number[] ?? []).join(', '))
  }

  function cancelEdit() {
    setEditing(null)
    setName('')
    setShortName('')
    setColor('#3b82f6')
    setLogoFile(null)
    setLogoPreview('')
    setFoundingYear('')
    setDescription('')
    setTitleYears('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      let logoUrl: string | undefined
      if (logoFile) {
        const fd = new FormData()
        fd.append('file', logoFile)
        const uploadRes = await fetch('/api/upload', { method: 'POST', body: fd })
        if (!uploadRes.ok) throw new Error('Falha ao fazer upload da logo')
        const uploadData = await uploadRes.json()
        logoUrl = uploadData.url
      }

      const parsedYears = titleYears
        .split(',')
        .map(s => parseInt(s.trim()))
        .filter(n => !isNaN(n) && n > 1900 && n < 2100)
        .sort()

      const body: any = {
        name,
        shortName: shortName.toUpperCase().slice(0, 4),
        color,
        ...(logoUrl ? { logo: logoUrl } : {}),
        foundingYear: foundingYear ? parseInt(foundingYear) : null,
        description: description || null,
        titleYears: parsedYears,
        titles: parsedYears.length,
      }

      const url = editing ? `/api/teams/${editing}` : '/api/teams'
      const method = editing ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? `Erro ${res.status}`)
      }

      cancelEdit()
      fetchTeams()
    } catch (err: any) {
      alert('Erro ao salvar: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  async function toggleActive(team: Team) {
    await fetch(`/api/teams/${team._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !team.isActive }),
    })
    fetchTeams()
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir este time?')) return
    await fetch(`/api/teams/${id}`, { method: 'DELETE' })
    fetchTeams()
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-white">Times</h1>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-slate-300 mb-5">
          {editing ? 'Editar Time' : 'Novo Time'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Logo + cor lado a lado */}
          <div className="flex items-start gap-5">
            {/* Preview da logo */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-20 h-20 rounded-xl border-2 border-dashed flex items-center justify-center flex-shrink-0 overflow-hidden hover:opacity-80 transition-opacity relative"
              style={{ borderColor: logoPreview ? color : '#334155' }}
              title="Clique para selecionar logo"
            >
              {logoPreview ? (
                <Image src={logoPreview} alt="Logo" fill className="object-cover" unoptimized />
              ) : (
                <div className="text-center px-1">
                  <p className="text-slate-600 text-xs leading-tight">Clique para</p>
                  <p className="text-slate-600 text-xs leading-tight">add logo</p>
                </div>
              )}
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />

            <div className="flex-1 space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Logo do time</label>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-sm text-slate-400 hover:text-white border border-slate-700 hover:border-slate-500 px-3 py-1.5 rounded-lg transition-colors"
                >
                  {logoPreview ? 'Trocar logo' : 'Selecionar imagem'}
                </button>
                {extracting && <span className="ml-2 text-xs text-blue-400 animate-pulse">Extraindo cor da logo...</span>}
                {logoFile && !extracting && <span className="ml-2 text-xs text-slate-500 truncate">{logoFile.name}</span>}
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1.5">
                  Cor do time
                  {logoFile && !extracting && (
                    <span className="ml-1 text-blue-400">· extraída automaticamente da logo</span>
                  )}
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {PRESET_COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`w-6 h-6 rounded-full flex-shrink-0 transition-transform ${color === c ? 'scale-125 ring-2 ring-white ring-offset-1 ring-offset-slate-900' : 'hover:scale-110'}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                  <input
                    type="color"
                    value={color}
                    onChange={e => setColor(e.target.value)}
                    className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                    title="Cor personalizada"
                  />
                  <div className="w-6 h-6 rounded-full border-2 border-white/20 ml-1" style={{ backgroundColor: color }} />
                  <span className="text-xs text-slate-500 font-mono">{color}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Nome e sigla */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Nome completo</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                placeholder="Ex: Os Crias da 9B"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Sigla (até 4 letras)</label>
              <input
                value={shortName}
                onChange={e => setShortName(e.target.value.toUpperCase().slice(0, 4))}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 uppercase"
                placeholder="Ex: 9B"
                required
                maxLength={4}
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Ano de fundação</label>
              <input
                value={foundingYear}
                onChange={e => setFoundingYear(e.target.value)}
                type="number"
                min="1900"
                max="2099"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                placeholder="Ex: 2018"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Anos de título (separados por vírgula)</label>
              <input
                value={titleYears}
                onChange={e => setTitleYears(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                placeholder="Ex: 2019, 2022"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Descrição / apelido</label>
              <input
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                placeholder="Ex: Os Guerreiros"
              />
            </div>
          </div>

          {/* Preview do cartão */}
          {name && (
            <div className="flex items-center gap-3 p-3 bg-slate-800 rounded-lg w-fit">
              <div
                className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center font-black text-xs text-white flex-shrink-0 relative"
                style={{ backgroundColor: color }}
              >
                {logoPreview ? (
                  <Image src={logoPreview} alt="" fill className="object-cover" unoptimized />
                ) : (
                  shortName || '?'
                )}
              </div>
              <div>
                <p className="font-semibold text-sm text-white">{name}</p>
                <p className="text-xs text-slate-400">{shortName}</p>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading || extracting}
              className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
            >
              {loading ? 'Salvando...' : editing ? 'Salvar Alterações' : 'Adicionar Time'}
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

      {/* Lista */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        {teams.length === 0 ? (
          <p className="text-slate-500 text-center py-10 text-sm">Nenhum time cadastrado</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500 text-xs uppercase">
                <th className="text-left px-4 py-3">Time</th>
                <th className="text-left px-2 py-3">Sigla</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {teams.map(team => (
                <tr key={team._id} className="border-b border-slate-800/50 last:border-0">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center font-black text-xs text-white flex-shrink-0 relative"
                        style={{ backgroundColor: team.color }}
                      >
                        {team.logo ? (
                          <Image src={team.logo} alt={team.name} fill className="object-cover" unoptimized />
                        ) : (
                          team.shortName
                        )}
                      </div>
                      <span className="font-medium">{team.name}</span>
                    </div>
                  </td>
                  <td className="px-2 py-3 text-slate-400 font-mono">{team.shortName}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 justify-end items-center">
                      {!team.isActive && (
                        <span className="text-xs text-slate-600 italic mr-1">Inativo</span>
                      )}
                      <button onClick={() => toggleActive(team)}
                        className={`text-xs px-2 py-1 rounded border transition-colors ${team.isActive
                          ? 'text-slate-400 hover:text-yellow-400 border-slate-700 hover:border-yellow-800'
                          : 'text-emerald-400 hover:text-emerald-300 border-emerald-900 hover:border-emerald-700'}`}>
                        {team.isActive ? 'Desativar' : 'Ativar'}
                      </button>
                      <button onClick={() => startEdit(team)}
                        className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded border border-slate-700 hover:border-slate-500 transition-colors">
                        Editar
                      </button>
                      <button onClick={() => handleDelete(team._id)}
                        className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded border border-red-900 hover:border-red-700 transition-colors">
                        Excluir
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
  )
}
