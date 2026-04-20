import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getTodayJST, dateRange, daysElapsed } from '@/lib/google-fit'

export default async function ParticipantDetailPage({
  params,
}: {
  params: { id: string; userId: string }
}) {
  const supabase = createClient()
  const service = createServiceClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: myProfile } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', user.id)
    .single()
  if (!myProfile?.username) redirect('/register')

  // Load contest
  const { data: contest } = await service
    .from('contests')
    .select('id, title, start_date, end_date')
    .eq('id', params.id)
    .single()
  if (!contest) notFound()

  // Verify the target user is a participant
  const { data: participation } = await service
    .from('contest_participants')
    .select('user_id')
    .eq('contest_id', params.id)
    .eq('user_id', params.userId)
    .single()
  if (!participation) notFound()

  // Load target user's profile
  const { data: targetProfile } = await service
    .from('profiles')
    .select('username')
    .eq('id', params.userId)
    .single()
  if (!targetProfile) notFound()

  const today = getTodayJST()
  const end = today <= contest.end_date ? today : contest.end_date

  // Load all step records for this user in the contest period
  const { data: stepsRows } = await service
    .from('daily_steps')
    .select('date, steps, source')
    .eq('user_id', params.userId)
    .gte('date', contest.start_date)
    .lte('date', end)

  const stepsMap = new Map<string, { steps: number; source: string }>(
    (stepsRows ?? []).map((r) => [r.date, { steps: r.steps, source: r.source }])
  )

  // Generate full date range up to today/end
  const allDates = today >= contest.start_date ? dateRange(contest.start_date, end) : []

  const totalSteps = Array.from(stepsMap.values()).reduce((s, v) => s + v.steps, 0)
  const elapsed = daysElapsed(contest.start_date, contest.end_date)
  const avgSteps = elapsed > 0 ? Math.round(totalSteps / elapsed) : 0
  const daysWithData = stepsMap.size
  const participationRate =
    allDates.length > 0 ? Math.round((daysWithData / allDates.length) * 100) : 0

  const maxSteps = Math.max(...Array.from(stepsMap.values()).map((v) => v.steps), 1)

  function fmtDate(d: string) {
    return new Date(d + 'T00:00:00+09:00').toLocaleDateString('ja-JP', {
      month: 'numeric',
      day: 'numeric',
      weekday: 'short',
    })
  }

  const isSelf = params.userId === user.id

  return (
    <div className="flex-1 px-4 py-6 max-w-2xl mx-auto w-full">
      {/* Back */}
      <Link
        href={`/contests/${params.id}`}
        className="text-xs text-gray-400 hover:text-gray-600 mb-4 flex items-center gap-1"
      >
        ← ランキングへ戻る
      </Link>

      {/* Header */}
      <div className="mb-5">
        <p className="text-xs text-gray-400 mb-0.5">{contest.title}</p>
        <h2 className="text-xl font-bold text-gray-900">
          {targetProfile.username}
          {isSelf && <span className="ml-2 text-sm font-normal text-gray-400">（あなた）</span>}
        </h2>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white rounded-2xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">
            {totalSteps.toLocaleString('ja-JP')}
          </p>
          <p className="text-xs text-gray-400 mt-1">合計歩数</p>
        </div>
        <div className="bg-brand-50 rounded-2xl border border-brand-100 p-4 text-center">
          <p className="text-2xl font-bold text-brand-700">
            {avgSteps.toLocaleString('ja-JP')}
          </p>
          <p className="text-xs text-brand-400 mt-1">1日平均</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{participationRate}%</p>
          <p className="text-xs text-gray-400 mt-1">記録率</p>
        </div>
      </div>

      {/* Daily breakdown */}
      <h3 className="text-sm font-semibold text-gray-500 mb-3">日別の歩数</h3>

      {allDates.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">
          コンテストがまだ開始していません
        </div>
      ) : (
        <div className="space-y-2">
          {[...allDates].reverse().map((date) => {
            const entry = stepsMap.get(date)
            const steps = entry?.steps ?? 0
            const barWidth = steps > 0 ? Math.max(4, Math.round((steps / maxSteps) * 100)) : 0

            return (
              <div
                key={date}
                className={`bg-white rounded-xl border px-4 py-3 ${
                  entry ? 'border-gray-200' : 'border-gray-100'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs font-medium ${entry ? 'text-gray-700' : 'text-gray-300'}`}>
                    {fmtDate(date)}
                  </span>
                  <div className="flex items-center gap-2">
                    {entry && (
                      <span className="text-xs text-gray-300">
                        {entry.source === 'ios' ? '🍎' : '🤖'}
                      </span>
                    )}
                    <span
                      className={`text-sm font-bold ${
                        entry ? 'text-gray-900' : 'text-gray-300'
                      }`}
                    >
                      {entry ? steps.toLocaleString('ja-JP') : '—'}
                    </span>
                    {entry && <span className="text-xs text-gray-400">歩</span>}
                  </div>
                </div>
                {/* Bar */}
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  {barWidth > 0 && (
                    <div
                      className="h-full bg-brand-500 rounded-full"
                      style={{ width: `${barWidth}%` }}
                    />
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
