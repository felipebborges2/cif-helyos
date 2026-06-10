import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import Invite from '@/models/Invite'

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.json({ valid: false })

  await connectDB()
  const invite = await Invite.findOne({ token, usedAt: null, expiresAt: { $gt: new Date() } })
    .populate('teamId', 'name')
    .lean() as any

  if (!invite) return NextResponse.json({ valid: false })

  return NextResponse.json({ valid: true, teamName: invite.teamId?.name ?? null })
}
