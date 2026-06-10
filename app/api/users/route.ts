import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import User from '@/models/User'

export async function GET() {
  const session = await auth()
  if ((session?.user as any)?.role !== 'admin') {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  await connectDB()
  const users = await User.find({}, '-password').populate('teamId', 'name shortName color').lean()
  return NextResponse.json(users)
}

export async function POST(req: Request) {
  const session = await auth()
  if ((session?.user as any)?.role !== 'admin') {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  await connectDB()
  const { name, email, password, teamId } = await req.json()

  if (!name || !email || !password) {
    return NextResponse.json({ error: 'Preencha todos os campos' }, { status: 400 })
  }
  if (password.length < 6) {
    return NextResponse.json({ error: 'Senha deve ter pelo menos 6 caracteres' }, { status: 400 })
  }

  const existing = await User.findOne({ email })
  if (existing) {
    return NextResponse.json({ error: 'Email já cadastrado' }, { status: 409 })
  }

  const user = await User.create({
    name,
    email,
    password,
    role: 'organizer',
    teamId: teamId || null,
  })

  const populated = await User.findById(user._id, '-password').populate('teamId', 'name shortName color')
  return NextResponse.json(populated, { status: 201 })
}
