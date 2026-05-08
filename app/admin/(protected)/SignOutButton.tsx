'use client'

import { signOut } from 'next-auth/react'

export function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: '/admin/login' })}
      className="text-xs text-slate-500 hover:text-red-400 transition-colors"
    >
      Sair
    </button>
  )
}
