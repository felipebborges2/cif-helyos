export const dynamic = 'force-dynamic'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import User from '@/models/User'
import { redirect } from 'next/navigation'

const PERMISSIONS = [
  { key: 'createTeams',       label: 'Criar times' },
  { key: 'editTeams',         label: 'Editar times' },
  { key: 'createMatches',     label: 'Criar jogos' },
  { key: 'editMatches',       label: 'Editar jogos' },
  { key: 'editLive',          label: 'Editar partida ao vivo' },
  { key: 'managePlayers',     label: 'Gerenciar jogadores' },
  { key: 'manageSuspensions', label: 'Gerenciar suspensões' },
]

export default async function PerfilPage() {
  const session = await auth()
  if (!session?.user?.email) redirect('/admin/login')

  await connectDB()
  const user = await User.findOne({ email: session.user.email }).lean() as any
  if (!user) redirect('/admin/login')

  const perms = user.permissions ?? {}
  const isAdmin = user.role === 'admin'

  return (
    <div className="max-w-md space-y-6">
      <h1 className="text-xl font-bold text-white">Perfil do Organizador</h1>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-blue-600 flex items-center justify-center text-white font-black text-xl flex-shrink-0">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-bold text-white text-lg leading-tight">{user.name}</p>
            <p className="text-slate-500 text-sm">{user.email}</p>
            {isAdmin && (
              <span className="inline-block mt-1 text-xs font-semibold text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 rounded-full px-2 py-0.5">
                Administrador
              </span>
            )}
          </div>
        </div>

        <div className="border-t border-slate-800 pt-5">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Número do organizador</p>
          <p className="text-3xl font-black text-white tracking-widest">
            {user.organizerNumber ?? '—'}
          </p>
        </div>

        <div className="border-t border-slate-800 pt-5">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">Autorizações</p>
          {isAdmin ? (
            <p className="text-sm text-green-400 font-medium">Acesso total — administrador do sistema</p>
          ) : (
            <ul className="space-y-2">
              {PERMISSIONS.map(({ key, label }) => {
                const granted = perms[key] === true
                return (
                  <li key={key} className="flex items-center gap-3">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${granted ? 'bg-green-500' : 'bg-slate-700'}`} />
                    <span className={`text-sm ${granted ? 'text-slate-200' : 'text-slate-500'}`}>
                      {label}
                    </span>
                    {granted ? (
                      <span className="ml-auto text-xs text-green-500 font-medium">Permitido</span>
                    ) : (
                      <span className="ml-auto text-xs text-slate-600">Sem acesso</span>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
