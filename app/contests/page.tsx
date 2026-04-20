import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getTodayJST } from '@/lib/google-fit'

type Contest = {
  id: string
  title: string
  start_date: string
  end_date: string
  participant_count: number
  status: 'upcoming' | 'active' | 'ended'
}

export default async function ContestsPage() {
  const supabase = createClient()
  const service = createServiceClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) redirect('/')
  const user = session.user

  const { data: profile } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', user.id)
    .single()
  if (!profile?.username) redirect('/register')

  const { data: rows } = await service
    .from('contests')
    .select('id, title, start_date, end_date, contest_participants(count)')
    .order('start_date', { ascending: false })

  const today = getTodayJST()

  const contests: Contest[] = (rows ?? []).map((r) => {
    const cnt = (r.contest_participants as unknown as { count: number }[])?.[0]?.count ?? 0
    let status: Contest['status'] = 'active'
    if (today < r.start_date) status = 'upcoming'
    else if (today > r.end_date) status = 'ended'
    return {
      id: r.id,
      title: r.title,
      start_date: r.start_date,
      end_date: r.end_date,
      participant_count: cnt,
      status,
    }
  })

  const active = contests.filter((c) => c.status === 'active')
  const upcoming = contests.filter((c) => c.status === 'upcoming')
  const ended = contests.filter((c) => c.status === 'ended')

  const isAdmin = user.email === process.env.ADMIN_EMAIL

  const fmtDate = (d: string) =>
    new Date(d + 'T00:00:00+09:00').toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })

  const statusBadge = (s: Contest['status']) => {
    if (s === 'active')
      return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse inline-block" />
          開催中
        </span>
      )
    if (s === 'upcoming')
      return (
        <span className="text-xs font-medium bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
          開始前
        </span>
      )
    return (
      <span className="text-xs font-medium bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
        終了
      </span>
    )
  }

  function ContestCard({ c }: { c: Contest }) {
    return (
      <Link href={`/contests/${c.id}`}>
        <div
          className={`bg-white rounded-2xl border p-5 hover:shadow-md transition-all cursor-pointer ${
            c.status === 'active' ? 'border-brand-200' : 'border-gray-200'
          }`}
        >
          <div className="flex items-start justify-between gap-2 mb-3">
            <h3 className="text-base font-bold text-gray-900 leading-snug flex-1">
              {c.title}
            </h3>
            {statusBadge(c.status)}
          </div>
          <p className="text-xs text-gray-500 mb-3">
            {fmtDate(c.start_date)} 〜 {fmtDate(c.end_date)}
          </p>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">
              参加者 {c.participant_count} 人
            </span>
            <span className="text-xs text-brand-600 font-medium">
              ランキングを見る →
            </span>
          </div>
        </div>
      </Link>
    )
  }

  return (
    <div className="flex-1 px-4 py-6 max-w-2xl mx-auto w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs text-gray-400">ようこそ、{profile.username} さん</p>
          <h2 className="text-xl font-bold text-gray-900">コンテスト一覧</h2>
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <Link
              href="/admin"
              className="text-xs text-white bg-brand-600 hover:bg-brand-700 px-3 py-1.5 rounded-full transition-colors font-medium"
            >
              管理者
            </Link>
          )}
          <Link
            href="/setup"
            className="text-xs text-gray-500 border border-gray-200 px-3 py-1.5 rounded-full hover:bg-gray-50 transition-colors"
          >
            設定
          </Link>
        </div>
      </div>

      {contests.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-4">🏁</p>
          <p className="text-sm font-medium text-gray-500">
            まだコンテストがありません
          </p>
          <p className="text-xs mt-1">管理者がコンテストを作成するまでお待ちください</p>
        </div>
      )}

      {active.length > 0 && (
        <section className="mb-6">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            開催中
          </h3>
          <div className="space-y-3">
            {active.map((c) => (
              <ContestCard key={c.id} c={c} />
            ))}
          </div>
        </section>
      )}

      {upcoming.length > 0 && (
        <section className="mb-6">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            開始前
          </h3>
          <div className="space-y-3">
            {upcoming.map((c) => (
              <ContestCard key={c.id} c={c} />
            ))}
          </div>
        </section>
      )}

      {ended.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            終了済み
          </h3>
          <div className="space-y-3 opacity-70">
            {ended.map((c) => (
              <ContestCard key={c.id} c={c} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
