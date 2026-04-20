import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getTodayJST } from '@/lib/google-fit'

function createService() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  )
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const token = authHeader.slice(7)

  const service = createService()

  const { data: tokenRow } = await service
    .from('api_tokens')
    .select('user_id')
    .eq('token', token)
    .single()

  if (!tokenRow) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }

  let body: { steps?: unknown; date?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const steps = Number(body.steps)
  if (!Number.isInteger(steps) || steps < 0) {
    return NextResponse.json({ error: 'Invalid steps value' }, { status: 400 })
  }

  const today = getTodayJST()
  const date =
    typeof body.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.date)
      ? body.date
      : today

  const { error } = await service
    .from('daily_steps')
    .upsert(
      { user_id: tokenRow.user_id, date, steps, source: 'ios' },
      { onConflict: 'user_id,date' }
    )

  if (error) {
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, steps, date })
}
