import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getTodayJST } from '@/lib/google-fit'

export default async function AdminPage() {
  const supabase = createClient()
  const service = createServiceClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/')
  if (user.email !== process.env.ADMIN_EMAIL) redirect('/contests')

  const { data: contests } = await service
    .from('contests')
    .select('id, title, start_date, end_date, contest_participants(count)')
    .order('start_date', { ascending: false })

  const today = getTodayJST()

  const statusOf = (start: string, end: string) => {
    if (today < start) return { label: '開始前', cls: 'bg-amber-100 text-amber-700' }
    if (today > end) return { label: '終了', cls: 'bg-gray-100 text-gray-500' }
    return { label: '開催中', cls: 'bg-brand-100 text-brand-700' }
  }

  const fmtDate = (d: string) =>
    new Date(d + 'T00:00:00+09:00').toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })

  return (
    <div className="flex-1 px-4 py-6 max-w-2xl mx-auto w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link
            href="/contests"
            className="text-xs text-gray-400 hover:text-gray-600 mb-1 flex items-center gap-1"
          >
            ← コンテスト一覧
          </Link>
          <h2 className="text-xl font-bold text-gray-900">管理者パネル</h2>
        </div>
        <Link
          href="/admin/contests/new"
          className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
        >
          + 新規作成
        </Link>
      </div>

      {contests?.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-4">🏁</p>
          <p className="text-sm">コンテストがありません</p>
          <Link
            href="/admin/contests/new"
            className="mt-4 inline-block text-brand-600 text-sm underline"
          >
            最初のコンテストを作成する
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {(contests ?? []).map((c) => {
            const cnt =
              (c.contest_participants as unknown as { count: number }[])?.[0]?.count ?? 0
            const { label, cls } = statusOf(c.start_date, c.end_date)
            return (
              <div
                key={c.id}
                className="bg-white rounded-2xl border border-gray-200 p-5"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="text-base font-bold text-gray-900">{c.title}</h3>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${cls}`}>
                    {label}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mb-3">
                  {fmtDate(c.start_date)} 〜 {fmtDate(c.end_date)}
                  <span className="ml-2 text-gray-400">参加者 {cnt} 人</span>
                </p>
                <div className="flex gap-2">
                  <Link
                    href={`/contests/${c.id}`}
                    className="flex-1 text-center text-xs font-medium text-gray-600 border border-gray-200 py-2 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    ランキングを見る
                  </Link>
                  <Link
                    href={`/admin/contests/${c.id}/edit`}
                    className="flex-1 text-center text-xs font-medium text-brand-600 border border-brand-200 py-2 rounded-xl hover:bg-brand-50 transition-colors"
                  >
                    編集
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
