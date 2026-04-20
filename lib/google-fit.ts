const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_FIT_URL =
  'https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate'

export function getOAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/google-fit/callback`,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/fitness.activity.read',
    access_type: 'offline',
    prompt: 'consent',
    state,
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`
}

export async function exchangeCodeForTokens(code: string): Promise<{
  access_token: string
  refresh_token: string
  expires_in: number
}> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/google-fit/callback`,
      grant_type: 'authorization_code',
    }),
  })
  if (!res.ok) throw new Error('Token exchange failed')
  return res.json()
}

export async function refreshAccessToken(refreshToken: string): Promise<{
  access_token: string
  expires_in: number
}> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: 'refresh_token',
    }),
  })
  if (!res.ok) throw new Error('Token refresh failed')
  return res.json()
}

export async function fetchTodaySteps(
  accessToken: string,
  dateJST: string
): Promise<number> {
  const [year, month, day] = dateJST.split('-').map(Number)
  const startMs = Date.UTC(year, month - 1, day) - 9 * 60 * 60 * 1000
  const endMs = startMs + 24 * 60 * 60 * 1000

  const res = await fetch(GOOGLE_FIT_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      aggregateBy: [
        {
          dataTypeName: 'com.google.step_count.delta',
          dataSourceId:
            'derived:com.google.step_count.delta:com.google.android.gms:estimated_steps',
        },
      ],
      bucketByTime: { durationMillis: 86400000 },
      startTimeMillis: startMs,
      endTimeMillis: endMs,
    }),
  })

  if (!res.ok) throw new Error('Google Fit API error')

  const data = await res.json()
  const points: { value: { intVal?: number }[] }[] =
    data?.bucket?.[0]?.dataset?.[0]?.point ?? []
  return points.reduce((sum, p) => sum + (p.value[0]?.intVal ?? 0), 0)
}

// Fetch steps for a date range in one API call. Returns Map<YYYY-MM-DD, steps>.
export async function fetchStepsForRange(
  accessToken: string,
  startDateJST: string,
  endDateJST: string
): Promise<Map<string, number>> {
  const [sy, sm, sd] = startDateJST.split('-').map(Number)
  const [ey, em, ed] = endDateJST.split('-').map(Number)
  const startMs = Date.UTC(sy, sm - 1, sd) - 9 * 60 * 60 * 1000
  const endMs = Date.UTC(ey, em - 1, ed) - 9 * 60 * 60 * 1000 + 24 * 60 * 60 * 1000

  const res = await fetch(GOOGLE_FIT_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      aggregateBy: [
        {
          dataTypeName: 'com.google.step_count.delta',
          dataSourceId:
            'derived:com.google.step_count.delta:com.google.android.gms:estimated_steps',
        },
      ],
      bucketByTime: { durationMillis: 86400000 },
      startTimeMillis: startMs,
      endTimeMillis: endMs,
    }),
  })

  if (!res.ok) throw new Error('Google Fit API error')

  const data = await res.json()
  const result = new Map<string, number>()
  for (const bucket of data?.bucket ?? []) {
    const bucketStartMs = Number(bucket.startTimeMillis)
    // Convert UTC ms → JST date string
    const jstMs = bucketStartMs + 9 * 60 * 60 * 1000
    const d = new Date(jstMs)
    const dateStr = d.toISOString().split('T')[0]
    const points: { value: { intVal?: number }[] }[] =
      bucket?.dataset?.[0]?.point ?? []
    const steps = points.reduce((sum, p) => sum + (p.value[0]?.intVal ?? 0), 0)
    if (steps > 0) result.set(dateStr, steps)
  }
  return result
}

export function getTodayJST(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Tokyo' })
}

// Returns the effective end date for ranking: min(today, contestEndDate)
export function effectiveEndDate(contestEndDate: string): string {
  const today = getTodayJST()
  return today <= contestEndDate ? today : contestEndDate
}

// Days elapsed from start to effectiveEnd (inclusive), minimum 1
export function daysElapsed(startDate: string, endDate: string): number {
  const today = getTodayJST()
  if (today < startDate) return 0
  const end = today <= endDate ? today : endDate
  const diffMs =
    new Date(end + 'T00:00:00').getTime() -
    new Date(startDate + 'T00:00:00').getTime()
  return Math.floor(diffMs / 86400000) + 1
}

// All YYYY-MM-DD dates from start to end (inclusive)
export function dateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = []
  const cur = new Date(startDate + 'T00:00:00')
  const last = new Date(endDate + 'T00:00:00')
  while (cur <= last) {
    dates.push(cur.toLocaleDateString('en-CA'))
    cur.setDate(cur.getDate() + 1)
  }
  return dates
}
