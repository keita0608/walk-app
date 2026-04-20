'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function RegisterPage() {
  const router = useRouter()
  const supabase = createClient()

  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function checkProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .single()

      if (profile?.username) {
        router.push('/contests')
        return
      }
      setChecking(false)
    }
    checkProfile()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const trimmed = username.trim()
    if (trimmed.length < 1 || trimmed.length > 20) {
      setError('ユーザー名は1〜20文字で入力してください')
      setLoading(false)
      return
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      router.push('/')
      return
    }

    const { error } = await supabase
      .from('profiles')
      .insert({ id: user.id, username: trimmed })

    setLoading(false)
    if (error) {
      if (error.code === '23505') {
        setError('そのユーザー名はすでに使われています。別の名前を選んでください。')
      } else {
        setError('登録に失敗しました。もう一度お試しください。')
      }
      return
    }

    router.push('/setup')
  }

  if (checking) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-gray-400 text-sm">読み込み中...</div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">✏️</div>
          <h2 className="text-xl font-bold text-gray-900">ユーザー名を設定</h2>
          <p className="mt-2 text-sm text-gray-500">
            ランキングに表示される名前を決めましょう
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                ユーザー名
              </label>
              <input
                id="username"
                type="text"
                required
                maxLength={20}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="例：田中たろう"
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm"
              />
              <p className="mt-1 text-xs text-gray-400">
                {username.trim().length} / 20文字
              </p>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || username.trim().length === 0}
              className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-semibold py-3 px-4 rounded-xl transition-colors text-sm"
            >
              {loading ? '登録中...' : '次へ進む'}
            </button>
          </form>
        </div>

        <div className="mt-4 flex justify-center gap-2">
          <span className="w-2 h-2 rounded-full bg-brand-500"></span>
          <span className="w-2 h-2 rounded-full bg-gray-200"></span>
          <span className="w-2 h-2 rounded-full bg-gray-200"></span>
        </div>
      </div>
    </div>
  )
}
