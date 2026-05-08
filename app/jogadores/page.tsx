export const dynamic = 'force-dynamic'
import { connectDB } from '@/lib/db'
import Player from '@/models/Player'
import Team from '@/models/Team'
import Suspension from '@/models/Suspension'
import Link from 'next/link'

export default async function JogadoresPage() {
  await connectDB()

  const [players, teams, pendingSuspensions] = await Promise.all([
    Player.find({ isActive: true }).populate('team').sort({ number: 1 }).lean() as Promise<any[]>,
    Team.find({ isActive: { $ne: false } }).sort({ name: 1 }).lean() as Promise<any[]>,
    Suspension.find({ status: { $in: ['pending', 'serving'] } }).select('player').lean() as Promise<any[]>,
  ])

  const suspendedIds = new Set(pendingSuspensions.map((s: any) => s.player.toString()))

  const byTeam = new Map<string, { team: any; players: any[] }>()
  for (const team of teams) {
    byTeam.set(team._id.toString(), { team, players: [] })
  }
  for (const player of players) {
    const tid = (player.team as any)?._id?.toString()
    if (tid && byTeam.has(tid)) byTeam.get(tid)!.players.push(player)
  }

  const groups = Array.from(byTeam.values()).filter(g => g.players.length > 0)

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-white">Jogadores</h1>

      {groups.map(({ team, players: teamPlayers }) => (
        <section key={team._id}>
          <div className="flex items-center gap-2 mb-3">
            {team.logo ? (
              <img src={team.logo} alt={team.name} className="w-5 h-5 rounded-full object-cover flex-shrink-0" />
            ) : (
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: team.color }} />
            )}
            <Link href={`/times/${team._id}`} className="text-xs font-semibold text-slate-400 uppercase tracking-wider hover:text-white transition-colors">
              {team.name}
            </Link>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <tbody>
                {teamPlayers.map((player: any) => {
                  const isSuspended = suspendedIds.has(player._id.toString())
                  const isWarned = !isSuspended && player.yellowCardCount === 2
                  return (
                    <tr key={player._id} className="border-b border-slate-800/50 last:border-0">
                      <td className="px-4 py-3 text-slate-500 text-xs w-10 tabular-nums text-right">{player.number}</td>
                      <td className="px-3 py-3 font-medium">
                        <Link href={`/jogadores/${player._id}`} className="hover:text-blue-400 transition-colors">
                          {player.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {isSuspended && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-red-900/50 text-red-400">Suspenso</span>
                        )}
                        {isWarned && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-900/40 text-yellow-400">2 amarelos</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      ))}

      {groups.length === 0 && (
        <p className="text-slate-500 text-center py-16">Nenhum jogador cadastrado ainda.</p>
      )}
    </div>
  )
}
