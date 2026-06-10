import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import Invite from '@/models/Invite'
import User from '@/models/User'

export async function POST(req: Request) {
  await connectDB()
  const { token, name, email, password } = await req.json()

  if (!token || !name || !email || !password) {
    return NextResponse.json({ error: 'Preencha todos os campos' }, { status: 400 })
  }
  if (password.length < 6) {
    return NextResponse.json({ error: 'Senha deve ter pelo menos 6 caracteres' }, { status: 400 })
  }

  const invite = await Invite.findOne({ token, usedAt: null, expiresAt: { $gt: new Date() } })
  if (!invite) {
    return NextResponse.json({ error: 'Link inválido ou expirado' }, { status: 400 })
  }

  const existing = await User.findOne({ email })
  if (existing) {
    return NextResponse.json({ error: 'Este email já está cadastrado' }, { status: 409 })
  }

  const user = await User.create({
    name,
    email,
    password,
    role: 'organizer',
    teamId: invite.teamId ?? null,
  })

  invite.usedAt = new Date()
  invite.usedBy = user._id
  await invite.save()

  return NextResponse.json({ ok: true })
}
