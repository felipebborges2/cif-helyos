import { NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { auth } from '@/lib/auth'

const IMAGE_TYPES = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif']
const VIDEO_TYPES = ['mp4', 'mov', 'avi', 'webm', 'mkv']

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File
  if (!file) return NextResponse.json({ error: 'Nenhum arquivo' }, { status: 400 })

  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  const isImage = IMAGE_TYPES.includes(ext)
  const isVideo = VIDEO_TYPES.includes(ext)

  if (!isImage && !isVideo) {
    return NextResponse.json({ error: 'Formato não suportado' }, { status: 400 })
  }

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const dir = join(process.cwd(), 'public', 'midias')

  await mkdir(dir, { recursive: true })
  await writeFile(join(dir, filename), buffer)

  return NextResponse.json({
    url: `/midias/${filename}`,
    type: isVideo ? 'video' : 'photo',
  })
}
