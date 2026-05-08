import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { auth } from '@/lib/auth'
import Player from '@/models/Player'
import { handleYellowCard, handleRedCard } from '@/lib/suspension-logic'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  await connectDB()
  const { id } = await params
  const { action } = await req.json()

  if (action === 'add_yellow') {
    await handleYellowCard(id, 'group')
  } else if (action === 'remove_yellow') {
    const player = await Player.findById(id)
    if (player && player.yellowCardCount > 0) {
      await Player.findByIdAndUpdate(id, { $inc: { yellowCardCount: -1 } })
    }
  } else if (action === 'add_red') {
    await handleRedCard(id, 'group')
  } else {
    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
  }

  const updated = await Player.findById(id).populate('team')
  return NextResponse.json(updated)
}
