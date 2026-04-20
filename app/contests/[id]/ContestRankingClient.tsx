'use client'

import { useRouter } from 'next/navigation'

type Participant = {
  userId: string
  username: string
  totalSteps: number
  avgSteps: number
  isCurrentUser: boolean
}

type Contest = {
  id: string
  title: string
  start_date: string
  end_date: string
  status: 'upcoming' | 'active' | 'ended'
}

type Props = {
  contest: Contest
  ranking: Participant[]
  elapsed: number
}

const medals = ['🥇', '🥈', '🥉']

function fmt(n: number) {
  return n.toLocaleString('ja-JP')
}

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00+09:00').toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export default function ContestRankingClient({ contest, ranking, elapsed }: Props) {
  const router = useRouter()

  const me = ranking.find((r) => r.isCurrentUser)

  const statusLabel = {
    upcoming: '開始前',
    active: '開催中',
    ended: '終了',
  }[contest.status]

  const statusClass = {
    upcoming: 'bg-amber-100 text-amber-700',
    active: 'bg-brand-100 text-brand-700',
    ended: 'bg-gray-100 text-gray-500',
  }[contest.status]

  return (
    <div className="flex-1 px-4 py-6 max-w-2xl mx-auto w-full">
      {/* Back */}
      <button
        onClick={() => router.push('/contests')}
        className="text-xs text-gray-400 hover:text-gray-600 mb-4 flex items-center gap-1"
      >
        ← コンテスト一覧
      </button>

      {/* Contest header */}
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-1">
          <h2 className="text-xl font-bold text-gray-900">{contest.title}</h2>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusClass}`}>
            {statusLabel}
          </span>
        </div>
        <p className="text-xs text-gray-400">
          {fmtDate(contest.start_date)} 〜 {fmtDate(contest.end_date)}
          {elapsed > 0 && (
            <span className="ml-2 text-gray-300">（{elapsed}日経過）</span>
          )}
        </p>
      </div>

      {/* My summary card */}
      {me ? (
        <div className="bg-gradient-to-r from-brand-600 to-brand-500 text-white rounded-2xl p-5 mb-6 shadow-md">
          <p className="text-xs text-brand-100 mb-1">あなたの成績</p>
          <div className="flex items-end gap-4">
            <div>
              <p className="text-3xl font-bold">{fmt(me.avgSteps)}</p>
              <p className="text-xs text-brand-100 mt-0.5">歩 / 日（平均）</p>
            </div>
            <div className="border-l border-brand-400 pl-4">
              <p className="text-xl font-semibold">{fmt(me.totalSteps)}</p>
              <p className="text-xs text-brand-100 mt-0.5">歩（合計）</p>
            </div>
          </div>
          <p className="text-xs text-brand-100 mt-3">
            順位：{ranking.findIndex((r) => r.isCurrentUser) + 1} 位 / {ranking.length} 人
          </p>
        </div>
      ) : contest.status === 'upcoming' ? (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6">
          <p className="text-sm text-amber-700">コンテストはまだ開始していません</p>
          <p className="text-xs text-amber-500 mt-1">{fmtDate(contest.start_date)} から開始</p>
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6">
          <p className="text-sm text-amber-700 font-medium">まだあなたのデータがありません</p>
          <button
            onClick={() => router.push('/setup')}
            className="mt-2 text-xs text-amber-600 underline"
          >
            データ連携設定へ →
          </button>
        </div>
      )}

      {/* Ranking */}
      <h3 className="text-sm font-semibold text-gray-500 mb-3">
        ランキング（1日平均 = 合計歩数 ÷ {elapsed || '?'}日）
      </h3>

      <div className="space-y-2">
        {ranking.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-3xl mb-3">🚶</p>
            <p className="text-sm">データがありません</p>
          </div>
        ) : (
          ranking.map((entry, i) => (
            <button
              key={entry.userId}
              onClick={() =>
                router.push(`/contests/${contest.id}/participants/${entry.userId}`)
              }
              className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl border text-left transition-all hover:shadow-sm active:scale-[0.99] ${
                entry.isCurrentUser
                  ? 'bg-brand-50 border-brand-200'
                  : 'bg-white border-gray-200'
              }`}
            >
              <div className="w-8 text-center text-xl flex-shrink-0">
                {i < 3 ? (
                  medals[i]
                ) : (
                  <span className="text-sm font-bold text-gray-400">{i + 1}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm font-semibold truncate ${
                    entry.isCurrentUser ? 'text-brand-700' : 'text-gray-900'
                  }`}
                >
                  {entry.username}
                  {entry.isCurrentUser && (
                    <span className="ml-1 text-xs font-normal text-brand-400">（あなた）</span>
                  )}
                </p>
                <p className="text-xs text-gray-400">合計 {fmt(entry.totalSteps)} 歩</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-base font-bold text-gray-900">{fmt(entry.avgSteps)}</p>
                <p className="text-xs text-gray-400">歩 / 日</p>
              </div>
              <span className="text-gray-300 text-xs">›</span>
            </button>
          ))
        )}
      </div>

      <p className="text-center text-xs text-gray-300 mt-8">
        名前をタップすると日別の歩数を確認できます
      </p>
    </div>
  )
}
