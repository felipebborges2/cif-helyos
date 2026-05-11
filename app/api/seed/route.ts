import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import User from '@/models/User'

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
