import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { auth } from '@/lib/auth'
import Suspension from '@/models/Suspension'

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  await connectDB()
  const { id } = await params
  const body = await req.json()
  const suspension = await Suspension.findByIdAndUpdate(id, body, { new: true })
    .populate({ path: 'player', populate: { path: 'team' } })
  return NextResponse.json(suspension)
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  await connectDB()
  const { id } = await params
  await Suspension.findByIdAndDelete(id)
  return NextResponse.json({ ok: true })
}
