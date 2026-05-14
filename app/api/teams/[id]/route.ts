import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { connectDB } from '@/lib/db'
import { auth } from '@/lib/auth'
import Team from '@/models/Team'

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  await connectDB()
  const { id } = await params
  const body = await req.json()
  const team = await Team.findByIdAndUpdate(id, body, { new: true })

  revalidatePath('/')
  revalidatePath('/times')

  return NextResponse.json(team)
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  await connectDB()
  const { id } = await params
  await Team.findByIdAndDelete(id)
  return NextResponse.json({ ok: true })
}
