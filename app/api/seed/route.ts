import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import User from '@/models/User'

// Rota para criar o primeiro usuário admin. Remover em produção.
export async function POST(req: Request) {
  const { secret } = await req.json()
  if (secret !== process.env.NEXTAUTH_SECRET) {
    return NextResponse.json({ error: 'Proibido' }, { status: 403 })
  }

  await connectDB()
  const existing = await User.findOne({ email: 'admin@copahelyos.com' })
  if (existing) return NextResponse.json({ message: 'Usuário já existe' })

  const user = await User.create({
    name: 'Administrador',
    email: 'admin@copahelyos.com',
    password: 'copahelyos2026',
    role: 'admin',
  })

  return NextResponse.json({ message: 'Criado', id: user._id })
}
