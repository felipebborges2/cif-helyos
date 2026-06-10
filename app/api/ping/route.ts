import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import Team from '@/models/Team'

export async function GET() {
  await connectDB()
  await Team.countDocuments()
  return NextResponse.json({ ok: true })
}
