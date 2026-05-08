import { NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { auth } from '@/lib/auth'

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File
  if (!file) return NextResponse.json({ error: 'Nenhum arquivo' }, { status: 400 })

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'png'
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const dir = join(process.cwd(), 'public', 'logos')

  await mkdir(dir, { recursive: true })
  await writeFile(join(dir, filename), buffer)

  return NextResponse.json({ url: `/logos/${filename}` })
}
