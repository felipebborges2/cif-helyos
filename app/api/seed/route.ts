import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import User from '@/models/User'

export async function PATCH(req: Request) {
  const { secret, email } = await req.json()
  if (secret !== process.env.NEXTAUTH_SECRET) {
    return NextResponse.json({ error: 'Proibido' }, { status: 403 })
  }

  await connectDB()

  const user = await User.findOneAndUpdate(
    { email },
    { role: 'admin' },
    { new: true }
  )

  if (!user) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })

  return NextResponse.json({ message: 'Promovido a admin', email: user.email })
}

export async function POST(req: Request) {
  const { secret, name, email, password } = await req.json()
  if (secret !== process.env.NEXTAUTH_SECRET) {
    return NextResponse.json({ error: 'Proibido' }, { status: 403 })
  }

  const adminName = name ?? 'Administrador'
  const adminEmail = email ?? 'admin@copahelyos.com'
  const adminPassword = password ?? 'copahelyos2026'

  await connectDB()

  await User.deleteOne({ role: 'admin' })

  const user = await User.create({
    name: adminName,
    email: adminEmail,
    password: adminPassword,
    role: 'admin',
  })

  return NextResponse.json({ message: 'Admin criado', id: user._id })
}
