'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useState } from 'react'

const links = [
  { href: '/', label: 'Início' },
  { href: '/jogos', label: 'Jogos' },
  { href: '/times', label: 'Times' },
  { href: '/jogadores', label: 'Jogadores' },
  { href: '/estatisticas', label: 'Estatísticas' },
  { href: '/bracket', label: 'Mata-Mata' },
  { href: '/midias', label: 'Mídias' },
]

export default function Navbar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [open, setOpen] = useState(false)

  return (
    <nav className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 flex-shrink-0" onClick={() => setOpen(false)}>
            <Image src="/logos/interclasses-logo.png" alt="Copa Interclasses Helyos" width={32} height={32} className="rounded-full" />
            <span className="font-bold text-white text-sm hidden sm:block">CIF: Colégio Helyos</span>
            <span className="font-bold text-white text-sm sm:hidden">Copa Helyos</span>
          </Link>

          {/* Links desktop */}
          <div className="hidden md:flex items-center gap-1">
            {links.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  pathname === link.href ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {link.label}
              </Link>
            ))}
            {session ? (
              <Link href="/admin/perfil" className="ml-2 px-3 py-1.5 rounded-md text-xs font-medium bg-blue-600 text-white hover:bg-blue-500 transition-colors">
                Perfil do organizador
              </Link>
            ) : (
              <Link href="/admin/login" className="ml-2 px-3 py-1.5 rounded-md text-xs font-medium bg-blue-600 text-white hover:bg-blue-500 transition-colors">
                Sou organizador
              </Link>
            )}
          </div>

          {/* Hamburguer mobile */}
          <button
            className="md:hidden p-2 text-slate-400 hover:text-white transition-colors"
            onClick={() => setOpen(o => !o)}
            aria-label="Menu"
          >
            {open ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Menu mobile dropdown */}
      {open && (
        <div className="md:hidden border-t border-slate-800 px-4 py-3 space-y-1">
          {links.map(link => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className={`block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                pathname === link.href ? 'bg-blue-600 text-white' : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              {link.label}
            </Link>
          ))}
          <div className="pt-1 border-t border-slate-800 mt-2">
            {session ? (
              <Link href="/admin/perfil" onClick={() => setOpen(false)}
                className="block px-3 py-2.5 rounded-lg text-sm font-medium text-blue-400 hover:bg-slate-800 transition-colors">
                Perfil do organizador
              </Link>
            ) : (
              <Link href="/admin/login" onClick={() => setOpen(false)}
                className="block px-3 py-2.5 rounded-lg text-sm font-medium text-blue-400 hover:bg-slate-800 transition-colors">
                Sou organizador
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}
