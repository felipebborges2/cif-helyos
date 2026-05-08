import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import User from '@/models/User'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if ((session?.user as any)?.role !== 'admin') {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json()
  await connectDB()

  const user = await User.findByIdAndUpdate(id, { $set: body }, { new: true, select: '-password' })
  if (!user) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })

  return NextResponse.json(user)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if ((session?.user as any)?.role !== 'admin') {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const { id } = await params
  await connectDB()
  await User.findByIdAndDelete(id)
  return NextResponse.json({ ok: true })
}
