import type { Metadata } from 'next'
import './globals.css'
import Navbar from '@/components/Navbar'
import Providers from '@/components/Providers'

export const metadata: Metadata = {
  title: 'Copa Interclasses Helyos',
  description: 'Torneio de Futsal — Colégio Helyos, Feira de Santana',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased">
        <Providers>
          <Navbar />
          <main className="max-w-5xl mx-auto px-4 py-6">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  )
}
