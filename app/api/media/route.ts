import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import Media from '@/models/Media'

export async function GET() {
  await connectDB()
  const media = await Media.find()
    .populate('match', 'homeTeam awayTeam homeScore awayScore status')
    .populate({ path: 'match', populate: { path: 'homeTeam awayTeam', select: 'name' } })
    .populate('uploadedBy', 'name')
    .sort({ createdAt: -1 })
    .lean()
  return NextResponse.json(media)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  await connectDB()
  const body = await req.json()

  const media = await Media.create({
    ...body,
    uploadedBy: (session.user as any).id,
  })

  return NextResponse.json(media, { status: 201 })
}
