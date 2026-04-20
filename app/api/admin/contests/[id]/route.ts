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

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

  const { error: updateErr } = await service
    .from('contests')
    .update({ title: title.trim(), start_date, end_date })
    .eq('id', params.id)

  if (updateErr) {
    return NextResponse.json({ error: 'Failed to update contest' }, { status: 500 })
  }

  // Replace participants: delete all, then insert new
  await service.from('contest_participants').delete().eq('contest_id', params.id)

  const participantRows = participant_ids.map((uid) => ({
    contest_id: params.id,
    user_id: uid,
  }))

  const { error: partErr } = await service
    .from('contest_participants')
    .insert(participantRows)

  if (partErr) {
    return NextResponse.json({ error: 'Failed to update participants' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await verifyAdmin()
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const service = createServiceClient()
  const { error } = await service
    .from('contests')
    .delete()
    .eq('id', params.id)

  if (error) {
    return NextResponse.json({ error: 'Failed to delete contest' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
