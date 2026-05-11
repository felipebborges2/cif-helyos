export const revalidate = 30
import { connectDB } from '@/lib/db'
import MatchEvent from '@/models/MatchEvent'
import Suspension from '@/models/Suspension'
import Player from '@/models/Player'
import Team from '@/models/Team'
import SuspensionBadge from '@/components/SuspensionBadge'

async function getEstatisticas() {
  await connectDB()

  const goalsAgg = await MatchEvent.aggregate([
    { $match: { type: 'goal' } },
    { $group: { _id: '$player', goals: { $sum: 1 } } },
    { $sort: { goals: -1 } },
  ])

  const assistsAgg = await MatchEvent.aggregate([
    { $match: { type: 'goal', assistPlayer: { $exists: true, $ne: null } } },
    { $group: { _id: '$assistPlayer', assists: { $sum: 1 } } },
  ])

  const yellowAgg = await MatchEvent.aggregate([
    { $match: { type: 'yellow_card' } },
    { $group: { _id: '$player', yellowCards: { $sum: 1 } } },
    { $sort: { yellowCards: -1 } },
  ])

  const redAgg = await MatchEvent.aggregate([
    { $match: { type: 'red_card' } },
    { $group: { _id: '$player', redCards: { $sum: 1 } } },
  ])

  const savesAgg = await MatchEvent.aggregate([
    { $match: { type: 'difficult_save' } },
    { $group: { _id: '$player', saves: { $sum: 1 } } },
    { $sort: { saves: -1 } },
  ])

  // Fair play por time: agrupa cartões por team field no evento
  const fairPlayAgg = await MatchEvent.aggregate([
    { $match: { type: { $in: ['yellow_card', 'red_card'] } } },
    {
      $group: {
        _id: '$team',
        yellowCards: { $sum: { $cond: [{ $eq: ['$type', 'yellow_card'] }, 1, 0] } },
        redCards: { $sum: { $cond: [{ $eq: ['$type', 'red_card'] }, 1, 0] } },
      },
    },
  ])

  const allTeams = await Team.find().lean() as unknown as any[]
  const fairPlayMap = new Map(fairPlayAgg.map((f: any) => [f._id.toString(), f]))
  const fairPlay = allTeams
    .map(team => {
      const stats = fairPlayMap.get(team._id.toString())
      const yellow = stats?.yellowCards ?? 0
      const red = stats?.redCards ?? 0
      return { team, yellowCards: yellow, redCards: red, score: yellow + red * 3 }
    })
    .sort((a, b) => a.score - b.score)

  const assistMap = new Map(assistsAgg.map((a: any) => [a._id.toString(), a.assists]))
  const yellowMap = new Map(yellowAgg.map((y: any) => [y._id.toString(), y.yellowCards]))
  const redMap = new Map(redAgg.map((r: any) => [r._id.toString(), r.redCards]))

  const pendingSuspensions = await Suspension.find({ status: 'pending' }).select('player')
  const suspendedIds = new Set(pendingSuspensions.map((s: any) => s.player.toString()))

  const allPlayerIds = [
    ...goalsAgg.map((g: any) => g._id),
    ...yellowAgg.map((y: any) => y._id),
    ...savesAgg.map((s: any) => s._id),
  ]
  const players = await Player.find({ _id: { $in: allPlayerIds } }).populate('team').lean()
  const playerMap = new Map(players.map((p: any) => [p._id.toString(), p]))

  const gols = goalsAgg.map((g: any) => {
    const pid = g._id.toString()
    const player = playerMap.get(pid) as any
    return {
      player,
      goals: g.goals,
      assists: assistMap.get(pid) ?? 0,
      isSuspended: suspendedIds.has(pid),
      isWarned: !suspendedIds.has(pid) && (player?.yellowCardCount ?? 0) === 2,
    }
  })

  const cardPlayerIds = new Set([
    ...yellowAgg.map((y: any) => y._id.toString()),
    ...redAgg.map((r: any) => r._id.toString()),
  ])
  const cartoes = Array.from(cardPlayerIds)
    .map(pid => {
      const player = playerMap.get(pid) as any
      return {
        player,
        yellowCards: yellowMap.get(pid) ?? 0,
        redCards: redMap.get(pid) ?? 0,
        isSuspended: suspendedIds.has(pid),
        isWarned: !suspendedIds.has(pid) && (player?.yellowCardCount ?? 0) === 2,
      }
    })
    .sort((a, b) => b.yellowCards - a.yellowCards || b.redCards - a.redCards)

  const defesas = savesAgg.map((s: any) => {
    const pid = s._id.toString()
    const player = playerMap.get(pid) as any
    return { player, saves: s.saves }
  })

  return { gols, cartoes, defesas, fairPlay }
}

function TeamCell({ team }: { team: any }) {
  return (
    <span
      className="text-slate-400 text-xs pl-2 border-l-2"
      style={{ borderColor: team?.color ?? '#475569' }}
    >
      {team?.name ?? '—'}
    </span>
  )
}

export default async function EstatisticasPage() {
  const { gols, cartoes, defesas, fairPlay } = await getEstatisticas()

  return (
    <div className="space-y-10">
      <h1 className="text-2xl font-bold text-white">Estatísticas</h1>

      {/* Gols */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Gols</h2>
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500 text-xs uppercase">
                <th className="text-left px-4 py-3 w-8">#</th>
                <th className="text-left px-2 py-3">Jogador</th>
                <th className="text-left px-2 py-3 hidden sm:table-cell">Time</th>
                <th className="text-center px-2 py-3">Gols</th>
                <th className="text-center px-2 py-3 hidden sm:table-cell">Assist.</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {gols.map((row, idx) => (
                <tr key={row.player?._id ?? idx} className="border-b border-slate-800/50 last:border-0">
                  <td className="px-4 py-3 text-slate-500 text-xs">{idx + 1}º</td>
                  <td className="px-2 py-3 font-medium">
                    <a href={`/jogadores/${row.player?._id}`} className="hover:text-blue-400 transition-colors">
                      {row.player?.name ?? '—'}
                    </a>
                  </td>
                  <td className="px-2 py-3 hidden sm:table-cell">
                    <TeamCell team={row.player?.team} />
                  </td>
                  <td className="text-center px-2 py-3 font-bold text-blue-400 text-base">{row.goals}</td>
                  <td className="text-center px-2 py-3 text-slate-300 hidden sm:table-cell">{row.assists}</td>
                  <td className="px-4 py-3">
                    <SuspensionBadge isSuspended={row.isSuspended} isWarned={row.isWarned} />
                  </td>
                </tr>
              ))}
              {gols.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-500">
                    Nenhum gol registrado ainda
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Cartões */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Cartões</h2>
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500 text-xs uppercase">
                <th className="text-left px-4 py-3 w-8">#</th>
                <th className="text-left px-2 py-3">Jogador</th>
                <th className="text-left px-2 py-3 hidden sm:table-cell">Time</th>
                <th className="text-center px-2 py-3">🟨</th>
                <th className="text-center px-2 py-3">🟥</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {cartoes.map((row, idx) => (
                <tr key={row.player?._id ?? idx} className="border-b border-slate-800/50 last:border-0">
                  <td className="px-4 py-3 text-slate-500 text-xs">{idx + 1}º</td>
                  <td className="px-2 py-3 font-medium">
                    <a href={`/jogadores/${row.player?._id}`} className="hover:text-blue-400 transition-colors">
                      {row.player?.name ?? '—'}
                    </a>
                  </td>
                  <td className="px-2 py-3 hidden sm:table-cell">
                    <TeamCell team={row.player?.team} />
                  </td>
                  <td className="text-center px-2 py-3 font-bold text-yellow-400">{row.yellowCards}</td>
                  <td className="text-center px-2 py-3 font-bold text-red-400">{row.redCards}</td>
                  <td className="px-4 py-3">
                    <SuspensionBadge isSuspended={row.isSuspended} isWarned={row.isWarned} />
                  </td>
                </tr>
              ))}
              {cartoes.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-500">
                    Nenhum cartão registrado ainda
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Defesas Difíceis */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Defesas Difíceis</h2>
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500 text-xs uppercase">
                <th className="text-left px-4 py-3 w-8">#</th>
                <th className="text-left px-2 py-3">Jogador</th>
                <th className="text-left px-2 py-3 hidden sm:table-cell">Time</th>
                <th className="text-center px-2 py-3">Defesas</th>
              </tr>
            </thead>
            <tbody>
              {defesas.map((row, idx) => (
                <tr key={row.player?._id ?? idx} className="border-b border-slate-800/50 last:border-0">
                  <td className="px-4 py-3 text-slate-500 text-xs">{idx + 1}º</td>
                  <td className="px-2 py-3 font-medium">
                    <a href={`/jogadores/${row.player?._id}`} className="hover:text-blue-400 transition-colors">
                      {row.player?.name ?? '—'}
                    </a>
                  </td>
                  <td className="px-2 py-3 hidden sm:table-cell">
                    <TeamCell team={row.player?.team} />
                  </td>
                  <td className="text-center px-2 py-3 font-bold text-emerald-400 text-base">{row.saves}</td>
                </tr>
              ))}
              {defesas.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center py-10 text-slate-500">
                    Nenhuma defesa difícil registrada ainda
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Fair Play */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Fair Play</h2>
        <p className="text-xs text-slate-600">Pontuação: 1 pt por amarelo · 3 pts por vermelho. Menos é melhor.</p>
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500 text-xs uppercase">
                <th className="text-left px-4 py-3 w-8">#</th>
                <th className="text-left px-2 py-3">Time</th>
                <th className="text-center px-2 py-3">🟨</th>
                <th className="text-center px-2 py-3">🟥</th>
                <th className="text-center px-4 py-3">Pts</th>
              </tr>
            </thead>
            <tbody>
              {fairPlay.map((row, idx) => (
                <tr
                  key={(row.team as any)._id}
                  className={`border-b border-slate-800/50 last:border-0 ${idx === 0 ? 'bg-emerald-950/20' : ''}`}
                >
                  <td className="px-4 py-3 text-xs">
                    <span className={idx === 0 ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                      {idx + 1}º
                    </span>
                  </td>
                  <td className="px-2 py-3">
                    <div className="flex items-center gap-2">
                      {(row.team as any).logo ? (
                        <img src={(row.team as any).logo} alt={(row.team as any).name} className="w-6 h-6 rounded-full object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-6 h-6 rounded-full flex-shrink-0" style={{ backgroundColor: (row.team as any).color }} />
                      )}
                      <span className="font-medium">{(row.team as any).name}</span>
                      {idx === 0 && <span className="text-emerald-400 text-xs ml-1">✓ mais limpo</span>}
                    </div>
                  </td>
                  <td className="text-center px-2 py-3 text-yellow-400 font-semibold">{row.yellowCards}</td>
                  <td className="text-center px-2 py-3 text-red-400 font-semibold">{row.redCards}</td>
                  <td className="text-center px-4 py-3 font-bold text-white">{row.score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
