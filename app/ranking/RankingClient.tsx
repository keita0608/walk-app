'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type DailyEntry = {
  username: string
  steps: number
  source: string
  isCurrentUser: boolean
}

type WeeklyEntry = {
  username: string
  avgSteps: number
  isCurrentUser: boolean
}

type Props = {
  today: string
  username: string
  ranking: DailyEntry[]
  weeklyRanking: WeeklyEntry[]
}

const medals = ['🥇', '🥈', '🥉']

function formatSteps(n: number): string {
  return n.toLocaleString('ja-JP')
}

function sourceLabel(source: string) {
  return source === 'ios' ? '🍎' : '🤖'
}

export default function RankingClient({ today, username, ranking, weeklyRanking }: Props) {
  const [tab, setTab] = useState<'today' | 'weekly'>('today')
  const router = useRouter()

  const todayFormatted = new Date(today + 'T00:00:00+09:00').toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  })

  return (
    <div className="flex-1 px-4 py-6 max-w-2xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs text-gray-400">{todayFormatted}</p>
          <h2 className="text-xl font-bold text-gray-900">歩数ランキング</h2>
        </div>
        <button
          onClick={() => router.push('/setup')}
          className="text-xs text-gray-500 border border-gray-200 px-3 py-1.5 rounded-full hover:bg-gray-50 transition-colors"
        >
          設定
        </button>
      </div>

      {/* My steps summary */}
      {ranking.find((r) => r.isCurrentUser) ? (
        <div className="bg-gradient-to-r from-brand-600 to-brand-500 text-white rounded-2xl p-5 mb-6 shadow-md">
          <p className="text-xs text-brand-100 mb-1">今日の {username} さんの歩数</p>
          <p className="text-4xl font-bold tracking-tight">
            {formatSteps(ranking.find((r) => r.isCurrentUser)!.steps)}
            <span className="text-lg font-normal ml-2">歩</span>
          </p>
          <p className="text-xs text-brand-100 mt-2">
            順位：{ranking.findIndex((r) => r.isCurrentUser) + 1} 位 / {ranking.length} 人
          </p>
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6">
          <p className="text-sm text-amber-700 font-medium mb-2">まだ今日のデータがありません</p>
          <p className="text-xs text-amber-600">
            iOSはショートカット、AndroidはGoogle Fit 連携後にランキングが更新されます。
          </p>
          <button
            onClick={() => router.push('/setup')}
            className="mt-3 text-xs font-medium text-amber-700 underline"
          >
            連携設定へ →
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex rounded-xl overflow-hidden border border-gray-200 mb-5">
        <button
          onClick={() => setTab('today')}
          className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
            tab === 'today' ? 'bg-brand-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
          }`}
        >
          今日
        </button>
        <button
          onClick={() => setTab('weekly')}
          className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
            tab === 'weekly' ? 'bg-brand-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
          }`}
        >
          7日間平均
        </button>
      </div>

      {/* Ranking list */}
      {tab === 'today' && (
        <div className="space-y-2">
          {ranking.length === 0 ? (
            <div className="text-center text-gray-400 text-sm py-12">
              <p className="text-3xl mb-3">🚶</p>
              <p>まだ今日のデータがありません</p>
              <p className="text-xs mt-1">みんなが歩き始めるのを待っています...</p>
            </div>
          ) : (
            ranking.map((entry, i) => (
              <div
                key={entry.username}
                className={`flex items-center gap-4 px-4 py-3 rounded-2xl border transition-all ${
                  entry.isCurrentUser
                    ? 'bg-brand-50 border-brand-200 shadow-sm'
                    : 'bg-white border-gray-200'
                }`}
              >
                <div className="w-8 text-center text-xl flex-shrink-0">
                  {i < 3 ? medals[i] : <span className="text-sm font-bold text-gray-400">{i + 1}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold truncate ${entry.isCurrentUser ? 'text-brand-700' : 'text-gray-900'}`}>
                    {entry.username}
                    {entry.isCurrentUser && <span className="ml-1 text-xs font-normal text-brand-400">（あなた）</span>}
                  </p>
                  <p className="text-xs text-gray-400">{sourceLabel(entry.source)}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-base font-bold text-gray-900">{formatSteps(entry.steps)}</p>
                  <p className="text-xs text-gray-400">歩</p>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'weekly' && (
        <div className="space-y-2">
          {weeklyRanking.length === 0 ? (
            <div className="text-center text-gray-400 text-sm py-12">
              <p className="text-3xl mb-3">📊</p>
              <p>まだデータが蓄積されていません</p>
            </div>
          ) : (
            weeklyRanking.map((entry, i) => (
              <div
                key={entry.username}
                className={`flex items-center gap-4 px-4 py-3 rounded-2xl border ${
                  entry.isCurrentUser
                    ? 'bg-brand-50 border-brand-200 shadow-sm'
                    : 'bg-white border-gray-200'
                }`}
              >
                <div className="w-8 text-center text-xl flex-shrink-0">
                  {i < 3 ? medals[i] : <span className="text-sm font-bold text-gray-400">{i + 1}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold truncate ${entry.isCurrentUser ? 'text-brand-700' : 'text-gray-900'}`}>
                    {entry.username}
                    {entry.isCurrentUser && <span className="ml-1 text-xs font-normal text-brand-400">（あなた）</span>}
                  </p>
                  <p className="text-xs text-gray-400">7日間平均</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-base font-bold text-gray-900">{formatSteps(entry.avgSteps)}</p>
                  <p className="text-xs text-gray-400">歩 / 日</p>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      <p className="text-center text-xs text-gray-300 mt-8">
        最終更新：{new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
      </p>
    </div>
  )
}
