import { redirect, notFound } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import {
  getTodayJST,
  daysElapsed,
  effectiveEndDate,
  fetchStepsForRange,
  refreshAccessToken,
} from '@/lib/google-fit'
import ContestRankingClient from './ContestRankingClient'

type Participant = {
  userId: string
  username: string
  totalSteps: number
  avgSteps: number
  isCurrentUser: boolean
}

async function syncGoogleFitForContest(
  userId: string,
  startDate: string,
  endDate: string
) {
  const service = createServiceClient()

  const { data: tokenRow } = await service
    .from('google_fit_tokens')
    .select('access_token, refresh_token, expires_at')
    .eq('user_id', userId)
    .single()

  if (!tokenRow) return

  let accessToken = tokenRow.access_token
  if (new Date(tokenRow.expires_at) <= new Date()) {
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
    const end = today <= endDate ? today : endDate
    if (today < startDate) return

    const stepsMap = await fetchStepsForRange(accessToken, startDate, end)
    const toUpsert = Array.from(stepsMap.entries()).map(([date, steps]) => ({
      user_id: userId,
      date,
      steps,
      source: 'google_fit',
    }))
    if (toUpsert.length > 0) {
      await service
        .from('daily_steps')
        .upsert(toUpsert, { onConflict: 'user_id,date' })
    }
  } catch {}
}

export default async function ContestRankingPage({
  params,
}: {
  params: { id: string }
}) {
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

  // Load contest
  const { data: contest } = await service
    .from('contests')
    .select('id, title, start_date, end_date')
    .eq('id', params.id)
    .single()

  if (!contest) notFound()

  // Sync current user's Google Fit data for the entire contest period
  await syncGoogleFitForContest(user.id, contest.start_date, contest.end_date)

  // Load all participants
  const { data: participantRows } = await service
    .from('contest_participants')
    .select('user_id, profiles!inner(username)')
    .eq('contest_id', contest.id)

  if (!participantRows || participantRows.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
        参加者がいません
      </div>
    )
  }

  const participantIds = participantRows.map((p) => p.user_id)

  // Load steps for the contest period
  const end = effectiveEndDate(contest.end_date)
  const today = getTodayJST()
  const { data: stepsRows } = await service
    .from('daily_steps')
    .select('user_id, steps')
    .in('user_id', participantIds)
    .gte('date', contest.start_date)
    .lte('date', end)

  // Aggregate totals per user
  const totalsMap = new Map<string, number>()
  for (const row of stepsRows ?? []) {
    totalsMap.set(row.user_id, (totalsMap.get(row.user_id) ?? 0) + row.steps)
  }

  const elapsed = daysElapsed(contest.start_date, contest.end_date)

  const ranking: Participant[] = participantRows
    .map((p) => {
      const profiles = p.profiles as unknown as { username: string } | { username: string }[]
      const username = Array.isArray(profiles) ? profiles[0]?.username : profiles?.username
      const total = totalsMap.get(p.user_id) ?? 0
      return {
        userId: p.user_id,
        username: username ?? '不明',
        totalSteps: total,
        avgSteps: elapsed > 0 ? Math.round(total / elapsed) : 0,
        isCurrentUser: p.user_id === user.id,
      }
    })
    .sort((a, b) => b.avgSteps - a.avgSteps)

  let status: 'upcoming' | 'active' | 'ended' = 'active'
  if (today < contest.start_date) status = 'upcoming'
  else if (today > contest.end_date) status = 'ended'

  return (
    <ContestRankingClient
      contest={{ ...contest, status }}
      ranking={ranking}
      elapsed={elapsed}
    />
  )
}
