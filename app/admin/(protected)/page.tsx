export const dynamic = 'force-dynamic'
import { connectDB } from '@/lib/db'
import Team from '@/models/Team'
import Player from '@/models/Player'
import Match from '@/models/Match'
import Suspension from '@/models/Suspension'
import Link from 'next/link'
import AdminPhaseActions from '@/components/AdminPhaseActions'

export default async function AdminDashboard() {
  await connectDB()

  const [teams, players, matches, suspensions] = await Promise.all([
    Team.countDocuments(),
    Player.countDocuments(),
    Match.countDocuments(),
    Suspension.countDocuments({ status: 'pending' }),
  ])

  const liveMatch = await Match.findOne({ status: 'live' }).populate('homeTeam awayTeam').lean() as any

  const cards = [
    { label: 'Times', value: teams, href: '/admin/times', color: 'bg-blue-600' },
    { label: 'Jogadores', value: players, href: '/admin/jogadores', color: 'bg-purple-600' },
    { label: 'Partidas', value: matches, href: '/admin/partidas', color: 'bg-orange-600' },
    { label: 'Suspensões', value: suspensions, href: '/admin/suspensoes', color: 'bg-red-600' },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-white">Dashboard</h1>

      {liveMatch && (
        <div className="bg-red-950/30 border border-red-800 rounded-xl p-4">
          <p className="text-red-400 text-xs font-bold uppercase tracking-wider mb-2 animate-pulse">
            Partida ao vivo
          </p>
          <div className="flex items-center gap-4">
            <span className="font-semibold">{liveMatch.homeTeam.name}</span>
            <span className="text-2xl font-black">{liveMatch.homeScore} – {liveMatch.awayScore}</span>
            <span className="font-semibold">{liveMatch.awayTeam.name}</span>
            <Link
              href={`/admin/partidas/${liveMatch._id}`}
              className="ml-auto bg-red-600 hover:bg-red-500 text-white text-sm font-semibold px-4 py-1.5 rounded-lg transition-colors"
            >
              Gerenciar
            </Link>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {cards.map(card => (
          <Link
            key={card.label}
            href={card.href}
            className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-slate-600 transition-colors"
          >
            <p className="text-slate-400 text-xs">{card.label}</p>
            <p className="text-3xl font-black mt-1">{card.value}</p>
          </Link>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Link
          href="/admin/partidas"
          className="bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 px-4 rounded-xl text-center transition-colors"
        >
          + Nova Partida
        </Link>
        <Link
          href="/admin/suspensoes"
          className="bg-slate-800 hover:bg-slate-700 text-white font-semibold py-3 px-4 rounded-xl text-center transition-colors"
        >
          Gerenciar Suspensões
        </Link>
      </div>

      <AdminPhaseActions />
    </div>
  )
}
