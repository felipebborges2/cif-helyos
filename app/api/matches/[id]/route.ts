import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { auth } from '@/lib/auth'
import Match from '@/models/Match'

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await connectDB()
  const { id } = await params
  const match = await Match.findById(id).populate('homeTeam awayTeam')
  if (!match) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
  return NextResponse.json(match)
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  await connectDB()
  const { id } = await params
  const body = await req.json()
  const match = await Match.findByIdAndUpdate(id, body, { new: true }).populate('homeTeam awayTeam')
  return NextResponse.json(match)
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  await connectDB()
  const { id } = await params
  await Match.findByIdAndDelete(id)
  return NextResponse.json({ ok: true })
}
