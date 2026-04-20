'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type User = { id: string; username: string }

type Props =
  | {
      mode: 'create'
      allUsers: User[]
      contestId?: never
      defaultValues?: never
    }
  | {
      mode: 'edit'
      contestId: string
      allUsers: User[]
      defaultValues: {
        title: string
        start_date: string
        end_date: string
        participantIds: string[]
      }
    }

export default function ContestForm({
  mode,
  contestId,
  allUsers,
  defaultValues,
}: Props) {
  const router = useRouter()

  const [title, setTitle] = useState(defaultValues?.title ?? '')
  const [startDate, setStartDate] = useState(defaultValues?.start_date ?? '')
  const [endDate, setEndDate] = useState(defaultValues?.end_date ?? '')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(defaultValues?.participantIds ?? [])
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function toggleUser(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selectAll() {
    setSelectedIds(new Set(allUsers.map((u) => u.id)))
  }

  function deselectAll() {
    setSelectedIds(new Set())
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (selectedIds.size === 0) {
      setError('参加者を1人以上選択してください')
      return
    }
    if (endDate < startDate) {
      setError('終了日は開始日以降にしてください')
      return
    }

    setLoading(true)

    const body = {
      title,
      start_date: startDate,
      end_date: endDate,
      participant_ids: Array.from(selectedIds),
    }

    const url =
      mode === 'create'
        ? '/api/admin/contests'
        : `/api/admin/contests/${contestId}`

    const res = await fetch(url, {
      method: mode === 'create' ? 'POST' : 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    setLoading(false)

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? '保存に失敗しました')
      return
    }

    router.push('/admin')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Title */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            コンテスト名
          </label>
          <input
            type="text"
            required
            maxLength={50}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例：4月の歩数バトル"
            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
          />
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              開始日
            </label>
            <input
              type="date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              終了日
            </label>
            <input
              type="date"
              required
              value={endDate}
              min={startDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
            />
          </div>
        </div>

        {startDate && endDate && endDate >= startDate && (
          <p className="text-xs text-gray-400">
            期間：
            {Math.floor(
              (new Date(endDate).getTime() - new Date(startDate).getTime()) /
                86400000
            ) + 1}
            日間
          </p>
        )}
      </div>

      {/* Participants */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-medium text-gray-700">
            参加者を選択
            <span className="ml-2 text-xs text-gray-400">
              {selectedIds.size} / {allUsers.length} 人
            </span>
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={selectAll}
              className="text-xs text-brand-600 hover:underline"
            >
              全選択
            </button>
            <span className="text-gray-200">|</span>
            <button
              type="button"
              onClick={deselectAll}
              className="text-xs text-gray-400 hover:underline"
            >
              解除
            </button>
          </div>
        </div>

        {allUsers.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">
            登録済みユーザーがいません
          </p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {allUsers.map((u) => (
              <label
                key={u.id}
                className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors ${
                  selectedIds.has(u.id)
                    ? 'bg-brand-50 border border-brand-200'
                    : 'bg-gray-50 border border-transparent'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedIds.has(u.id)}
                  onChange={() => toggleUser(u.id)}
                  className="w-4 h-4 accent-brand-600 flex-shrink-0"
                />
                <span className="text-sm font-medium text-gray-800">
                  {u.username}
                </span>
                {selectedIds.has(u.id) && (
                  <span className="ml-auto text-xs text-brand-500">✓</span>
                )}
              </label>
            ))}
          </div>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-xl">
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => router.push('/admin')}
          className="flex-1 border border-gray-200 text-gray-600 text-sm font-medium py-3 rounded-xl hover:bg-gray-50 transition-colors"
        >
          キャンセル
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-semibold py-3 rounded-xl transition-colors"
        >
          {loading ? '保存中...' : mode === 'create' ? 'コンテストを作成' : '変更を保存'}
        </button>
      </div>
    </form>
  )
}
