import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import {
  fetchTodaySteps,
  getTodayJST,
  refreshAccessToken,
} from '@/lib/google-fit'
import RankingClient from './RankingClient'

type RankEntry = {
  username: string
  steps: number
  source: string
  isCurrentUser: boolean
}

async function syncGoogleFitForUser(userId: string) {
  const service = createServiceClient()

  const { data: tokenRow } = await service
    .from('google_fit_tokens')
    .select('access_token, refresh_token, expires_at')
    .eq('user_id', userId)
    .single()

  if (!tokenRow) return

  let accessToken = tokenRow.access_token
  const expiresAt = new Date(tokenRow.expires_at)

  if (expiresAt <= new Date()) {
    try {
      const refreshed = await refreshAccessToken(tokenRow.refresh_token)
      accessToken = refreshed.access_token
      const newExpiry = new Date(Date.now() + refreshed.expires_in * 1000)
      await service
        .from('google_fit_tokens')
        .update({ access_token: accessToken, expires_at: newExpiry.toISOString() })
        .eq('user_id', userId)
    } catch {
      return
    }
  }

  try {
    const today = getTodayJST()
    const steps = await fetchTodaySteps(accessToken, today)
    await service
      .from('daily_steps')
      .upsert(
        { user_id: userId, date: today, steps, source: 'google_fit' },
        { onConflict: 'user_id,date' }
      )
  } catch {}
}

export default async function RankingPage() {
  const supabase = createClient()
  const service = createServiceClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/')

  const { data: profile } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', user.id)
    .single()

  if (!profile?.username) redirect('/register')

  // Sync Google Fit for the current user in the background
  await syncGoogleFitForUser(user.id)

  const today = getTodayJST()

  // Fetch all users' steps for today joined with profiles
  const { data: rows } = await service
    .from('daily_steps')
    .select('steps, source, date, user_id, profiles!inner(username)')
    .eq('date', today)
    .order('steps', { ascending: false })

  const ranking: RankEntry[] = (rows ?? []).map((row) => {
    const profiles = row.profiles as unknown as { username: string } | { username: string }[]
    const username = Array.isArray(profiles) ? profiles[0]?.username : profiles?.username
    return {
      username: username ?? '不明',
      steps: row.steps,
      source: row.source,
      isCurrentUser: row.user_id === user.id,
    }
  })

  // Fetch 7-day average
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
  const weekStart = sevenDaysAgo.toLocaleDateString('en-CA', { timeZone: 'Asia/Tokyo' })

  const { data: weekRows } = await service
    .from('daily_steps')
    .select('steps, user_id, profiles!inner(username)')
    .gte('date', weekStart)
    .lte('date', today)

  const weeklyMap = new Map<string, { username: string; total: number; count: number }>()
  for (const row of weekRows ?? []) {
    const profiles = row.profiles as unknown as { username: string } | { username: string }[]
    const username = Array.isArray(profiles) ? profiles[0]?.username : profiles?.username
    if (!username) continue
    const key = row.user_id
    const existing = weeklyMap.get(key) ?? { username, total: 0, count: 0 }
    weeklyMap.set(key, {
      username,
      total: existing.total + row.steps,
      count: existing.count + 1,
    })
  }

  const weeklyRanking = Array.from(weeklyMap.entries())
    .map(([uid, v]) => ({
      username: v.username,
      avgSteps: Math.round(v.total / v.count),
      isCurrentUser: uid === user.id,
    }))
    .sort((a, b) => b.avgSteps - a.avgSteps)

  return (
    <RankingClient
      today={today}
      username={profile.username}
      ranking={ranking}
      weeklyRanking={weeklyRanking}
    />
  )
}
