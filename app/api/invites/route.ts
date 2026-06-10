import { NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import Invite from '@/models/Invite'
import User from '@/models/User'

export async function GET() {
  const session = await auth()
  if ((session?.user as any)?.role !== 'admin') {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  await connectDB()
  const invites = await Invite.find({ usedAt: null, expiresAt: { $gt: new Date() } })
    .populate('teamId', 'name shortName color')
    .sort({ createdAt: -1 })
    .lean()

  return NextResponse.json(invites)
}

export async function POST(req: Request) {
  const session = await auth()
  if ((session?.user as any)?.role !== 'admin') {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  await connectDB()
  const { teamId } = await req.json()

  const creator = await User.findOne({ email: session!.user!.email }).select('_id')
  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 dias

  const invite = await Invite.create({
    token,
    teamId: teamId || null,
    createdBy: creator?._id,
    expiresAt,
  })

  const populated = await Invite.findById(invite._id).populate('teamId', 'name shortName color')
  return NextResponse.json(populated, { status: 201 })
}
