import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import User from '@/models/User'

export async function POST(req: NextRequest) {
  const { name, email, password, inviteCode } = await req.json()

  if (inviteCode !== process.env.INVITE_CODE) {
    return NextResponse.json({ error: 'Código de convite inválido' }, { status: 401 })
  }

  if (!name || !email || !password) {
    return NextResponse.json({ error: 'Preencha todos os campos' }, { status: 400 })
  }

  if (password.length < 6) {
    return NextResponse.json({ error: 'A senha deve ter pelo menos 6 caracteres' }, { status: 400 })
  }

  await connectDB()

  const existing = await User.findOne({ email })
  if (existing) {
    return NextResponse.json({ error: 'Este email já está cadastrado' }, { status: 409 })
  }

  let organizerNumber: string
  do {
    organizerNumber = String(Math.floor(1000 + Math.random() * 9000))
  } while (await User.findOne({ organizerNumber }))

  await User.create({ name, email, password, organizerNumber })

  return NextResponse.json({ ok: true })
}
