import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import Media from '@/models/Media'
import { unlink } from 'fs/promises'
import { join } from 'path'

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await params
  await connectDB()

  const media = await Media.findById(id)
  if (!media) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })

  try {
    await unlink(join(process.cwd(), 'public', media.url))
  } catch {}

  await media.deleteOne()
  return NextResponse.json({ ok: true })
}
