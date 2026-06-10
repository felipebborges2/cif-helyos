import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { SignOutButton } from './SignOutButton'

const adminLinks = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/times', label: 'Times' },
  { href: '/admin/jogadores', label: 'Jogadores' },
  { href: '/admin/partidas', label: 'Partidas' },
  { href: '/admin/suspensoes', label: 'Suspensões' },
  { href: '/admin/midias', label: 'Mídias' },
  { href: '/admin/perfil', label: 'Perfil' },
]

const organizerLinks = [
  { href: '/admin/jogadores', label: 'Jogadores' },
  { href: '/admin/perfil', label: 'Perfil' },
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()

  if (!session) redirect('/admin/login')

  const isAdmin = (session.user as any)?.role === 'admin'
  const links = isAdmin ? adminLinks : organizerLinks

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-4 flex-wrap">
          {links.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-slate-400 hover:text-white transition-colors"
            >
              {link.label}
            </Link>
          ))}
          {isAdmin && (
            <Link href="/admin/usuarios" className="text-sm text-blue-400 hover:text-blue-300 transition-colors">
              Organizadores
            </Link>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-slate-500 text-xs">{session.user?.name}</span>
          <SignOutButton />
        </div>
      </div>
      {children}
    </div>
  )
}
