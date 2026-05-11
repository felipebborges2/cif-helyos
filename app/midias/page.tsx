export const revalidate = 60
import { connectDB } from '@/lib/db'
import Media from '@/models/Media'

export default async function MidiasPage() {
  await connectDB()
  const media = await Media.find()
    .populate({ path: 'match', populate: { path: 'homeTeam awayTeam', select: 'name' } })
    .sort({ createdAt: -1 })
    .lean() as unknown as any[]

  const isVideo = (url: string) => /\.(mp4|mov|avi|webm|mkv)$/i.test(url)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Mídias</h1>

      {media.length === 0 && (
        <p className="text-slate-500 text-center py-16">Nenhuma mídia publicada ainda.</p>
      )}

      <div className="columns-2 sm:columns-3 gap-3 space-y-3">
        {media.map((m: any) => (
          <div key={m._id} className="break-inside-avoid bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            {isVideo(m.url) ? (
              <video src={m.url} controls className="w-full" />
            ) : (
              <img src={m.url} alt={m.description ?? ''} className="w-full object-cover" />
            )}
            {(m.description || m.match) && (
              <div className="px-3 py-2">
                {m.description && <p className="text-sm text-slate-200">{m.description}</p>}
                {m.match && (
                  <p className="text-xs text-slate-500 mt-0.5">
                    {m.match.homeTeam.name} × {m.match.awayTeam.name}
                  </p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
