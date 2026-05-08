'use client'

import { useEffect, useRef, useState } from 'react'

type Match = { _id: string; homeTeam: { name: string }; awayTeam: { name: string }; homeScore: number; awayScore: number; status: string }
type Media = { _id: string; url: string; type: string; description?: string; match?: Match; uploadedBy?: { name: string }; createdAt: string }

export default function AdminMidiasPage() {
  const [mediaList, setMediaList] = useState<Media[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [description, setDescription] = useState('')
  const [matchId, setMatchId] = useState('')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  async function load() {
    const [m, ms] = await Promise.all([
      fetch('/api/media').then(r => r.json()),
      fetch('/api/matches').then(r => r.json()),
    ])
    setMediaList(m)
    setMatches(ms.filter((m: any) => m.status === 'finished' || m.status === 'live'))
  }

  useEffect(() => { load() }, [])

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
    setError('')
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!file) return
    setUploading(true)
    setError('')

    try {
      const fd = new FormData()
      fd.append('file', file)
      const up = await fetch('/api/upload/media', { method: 'POST', body: fd })
      const { url, type, error: upErr } = await up.json()
      if (upErr) { setError(upErr); return }

      await fetch('/api/media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, type, description: description || undefined, match: matchId || undefined }),
      })

      setFile(null)
      setPreview(null)
      setDescription('')
      setMatchId('')
      if (inputRef.current) inputRef.current.value = ''
      await load()
    } finally {
      setUploading(false)
    }
  }

  async function remove(id: string) {
    if (!confirm('Remover esta mídia?')) return
    await fetch(`/api/media/${id}`, { method: 'DELETE' })
    setMediaList(prev => prev.filter(m => m._id !== id))
  }

  const isVideo = (url: string) => /\.(mp4|mov|avi|webm|mkv)$/i.test(url)

  const MEDIA_PAGE_SIZE = 12
  const [mediaPage, setMediaPage] = useState(0)
  const totalMediaPages = Math.ceil(mediaList.length / MEDIA_PAGE_SIZE)
  const paginatedMedia = mediaList.slice(mediaPage * MEDIA_PAGE_SIZE, (mediaPage + 1) * MEDIA_PAGE_SIZE)

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-white">Mídias</h1>

      {/* Upload */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-slate-300">Adicionar mídia</h2>
        <form onSubmit={handleUpload} className="space-y-3">
          <div
            className="border-2 border-dashed border-slate-700 rounded-xl p-6 text-center cursor-pointer hover:border-blue-500 transition-colors"
            onClick={() => inputRef.current?.click()}
          >
            {preview ? (
              isVideo(file?.name ?? '') ? (
                <video src={preview} className="max-h-48 mx-auto rounded-lg" controls />
              ) : (
                <img src={preview} className="max-h-48 mx-auto rounded-lg object-contain" alt="preview" />
              )
            ) : (
              <div className="text-slate-500 text-sm">
                <p className="text-2xl mb-1">📎</p>
                <p>Clique para selecionar foto ou vídeo</p>
                <p className="text-xs mt-1 text-slate-600">JPG, PNG, GIF, MP4, MOV e outros</p>
              </div>
            )}
            <input ref={inputRef} type="file" accept="image/*,video/*" className="hidden" onChange={onFileChange} />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Partida (opcional)</label>
            <select
              value={matchId}
              onChange={e => setMatchId(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
            >
              <option value="">Sem partida vinculada</option>
              {matches.map(m => (
                <option key={m._id} value={m._id}>
                  {m.homeTeam.name} {m.homeScore} × {m.awayScore} {m.awayTeam.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Descrição (opcional)</label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Ex: Gol do Silas no 2º tempo..."
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={!file || uploading}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors"
          >
            {uploading ? 'Enviando...' : 'Enviar'}
          </button>
        </form>
      </div>

      {/* Lista */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-slate-500">{mediaList.length} mídias</span>
        {totalMediaPages > 1 && (
          <div className="flex items-center gap-2">
            <button onClick={() => setMediaPage(p => Math.max(0, p - 1))} disabled={mediaPage === 0}
              className="px-2 py-1 rounded bg-slate-800 text-slate-400 text-xs hover:text-white disabled:opacity-30 transition-colors">←</button>
            <span className="text-slate-500 text-xs">{mediaPage + 1}/{totalMediaPages}</span>
            <button onClick={() => setMediaPage(p => Math.min(totalMediaPages - 1, p + 1))} disabled={mediaPage === totalMediaPages - 1}
              className="px-2 py-1 rounded bg-slate-800 text-slate-400 text-xs hover:text-white disabled:opacity-30 transition-colors">→</button>
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {paginatedMedia.map(m => (
          <div key={m._id} className="relative group bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            {isVideo(m.url) ? (
              <video src={m.url} className="w-full aspect-video object-cover" />
            ) : (
              <img src={m.url} alt={m.description ?? ''} className="w-full aspect-video object-cover" />
            )}
            <div className="p-2">
              {m.description && <p className="text-xs text-slate-300 truncate">{m.description}</p>}
              {m.match && (
                <p className="text-xs text-slate-500 truncate">{m.match.homeTeam.name} × {m.match.awayTeam.name}</p>
              )}
            </div>
            <button
              onClick={() => remove(m._id)}
              className="absolute top-2 right-2 bg-red-600 hover:bg-red-500 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
            >
              Remover
            </button>
          </div>
        ))}
        {paginatedMedia.length === 0 && mediaList.length === 0 && (
          <p className="col-span-3 text-slate-500 text-sm text-center py-10">Nenhuma mídia ainda.</p>
        )}
      </div>
    </div>
  )
}
