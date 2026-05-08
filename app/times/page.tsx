export const dynamic = 'force-dynamic'
import { connectDB } from '@/lib/db'
import Team from '@/models/Team'
import Player from '@/models/Player'
import Link from 'next/link'
import Image from 'next/image'

export default async function TimesPage() {
  await connectDB()

  const teams = await Team.find().sort({ name: 1 }).lean() as unknown as any[]

  const playerCounts = await Player.aggregate([
    { $match: { isActive: true } },
    { $group: { _id: '$team', count: { $sum: 1 } } },
  ])

  const playerCountMap = new Map(playerCounts.map((p: any) => [p._id.toString(), p.count]))

  const activeTeams = teams.filter(t => t.isActive !== false)
  const inactiveTeams = teams.filter(t => t.isActive === false)

  function TeamCard({ team, dimmed = false }: { team: any; dimmed?: boolean }) {
    const players = playerCountMap.get(team._id.toString()) ?? 0
    return (
      <Link
        href={`/times/${team._id}`}
        className={`bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-blue-500 transition-colors group ${dimmed ? 'opacity-60 hover:opacity-100' : ''}`}
      >
        <div className="flex items-center gap-4 mb-4">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center font-black text-white text-lg overflow-hidden relative flex-shrink-0"
            style={{ backgroundColor: team.color }}
          >
            {team.logo ? (
              <Image src={team.logo} alt={team.name} fill className="object-cover" unoptimized />
            ) : team.shortName}
          </div>
          <div className="min-w-0">
            <h2 className="font-bold text-white text-base group-hover:text-blue-400 transition-colors truncate">
              {team.name}
            </h2>
            {team.description && (
              <p className="text-slate-500 text-xs italic truncate">"{team.description}"</p>
            )}
            <div className="flex flex-col gap-0.5 mt-1">
              {team.foundingYear && (
                <span className="text-slate-500 text-xs">Fundado em {team.foundingYear}</span>
              )}
              {team.titles > 0 && (
                <span className="text-slate-500 text-xs">
                  {team.titles} {team.titles === 1 ? 'título' : 'títulos'}
                  {team.titleYears?.length > 0 && ` (${team.titleYears.join(', ')})`}
                </span>
              )}
            </div>
          </div>
        </div>
        {!dimmed && (
          <div className="border-t border-slate-800 pt-3">
            <span className="text-slate-500 text-xs">{players} jogador{players !== 1 ? 'es' : ''}</span>
          </div>
        )}
      </Link>
    )
  }

  return (
    <div className="space-y-10">
      <section>
        <h1 className="text-2xl font-bold text-white mb-1">Times</h1>
        <p className="text-slate-400 text-sm">{activeTeams.length} times participantes</p>
      </section>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {activeTeams.map(team => <TeamCard key={team._id} team={team} />)}
      </div>

      {inactiveTeams.length > 0 && (
        <section className="space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Times Históricos</h2>
            <p className="text-xs text-slate-600 mt-1">Times que participaram de edições anteriores da CIF</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {inactiveTeams.map(team => <TeamCard key={team._id} team={team} dimmed />)}
          </div>
        </section>
      )}
    </div>
  )
}
