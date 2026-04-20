import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

async function verifyAdmin() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) return null
  return user
}

export async function POST(request: NextRequest) {
  const admin = await verifyAdmin()
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: {
    title?: string
    start_date?: string
    end_date?: string
    participant_ids?: string[]
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { title, start_date, end_date, participant_ids } = body

  if (!title?.trim() || !start_date || !end_date || !participant_ids?.length) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  if (end_date < start_date) {
    return NextResponse.json({ error: 'end_date must be >= start_date' }, { status: 400 })
  }

  const service = createServiceClient()

  const { data: contest, error: contestErr } = await service
    .from('contests')
    .insert({
      title: title.trim(),
      start_date,
      end_date,
      created_by: admin.id,
    })
    .select('id')
    .single()

  if (contestErr || !contest) {
    return NextResponse.json({ error: 'Failed to create contest' }, { status: 500 })
  }

  const participantRows = participant_ids.map((uid) => ({
    contest_id: contest.id,
    user_id: uid,
  }))

  const { error: partErr } = await service
    .from('contest_participants')
    .insert(participantRows)

  if (partErr) {
    return NextResponse.json({ error: 'Failed to add participants' }, { status: 500 })
  }

  return NextResponse.json({ id: contest.id }, { status: 201 })
}
