import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { auth } from '@/lib/auth'
import Player from '@/models/Player'

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  await connectDB()
  const { id } = await params
  const body = await req.json()
  const player = await Player.findByIdAndUpdate(id, body, { new: true }).populate('team')
  return NextResponse.json(player)
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  await connectDB()
  const { id } = await params
  await Player.findByIdAndDelete(id)
  return NextResponse.json({ ok: true })
}
