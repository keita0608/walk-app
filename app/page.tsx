'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Step = 'email' | 'otp'

function AuthPageContent() {
  const supabase = createClient()
  const searchParams = useSearchParams()

  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const err = searchParams.get('error')
    const em = searchParams.get('email')
    if (err) setError(`認証エラー: ${err}`)
    if (em) setEmail(em)
  }, [searchParams])

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    })

    setLoading(false)
    if (error) {
      setError(`送信エラー: ${error.message}`)
      return
    }
    setMessage(`${email} に確認コードを送信しました`)
    setStep('otp')
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: 'email',
    })

    if (error) {
      setError(`認証エラー: ${error.message}`)
      setLoading(false)
      return
    }

    if (!data.session) {
      setError('セッションの取得に失敗しました。もう一度お試しください。')
      setLoading(false)
      return
    }

    window.location.href = '/contests'
  }

  return (
    <div className="flex-1 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">👟</div>
          <h2 className="text-2xl font-bold text-gray-900">歩数バトル</h2>
          <p className="mt-2 text-sm text-gray-500">
            部署内で毎日の歩数を競い合おう
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          {step === 'email' ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  メールアドレス
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm"
                />
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-semibold py-3 px-4 rounded-xl transition-colors text-sm"
              >
                {loading ? '送信中...' : '確認コードを送信'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <p className="text-sm text-gray-600 bg-brand-50 px-3 py-2 rounded-lg">
                {message}
              </p>
              <div>
                <label
                  htmlFor="otp"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  確認コード（6〜8桁）
                </label>
                <input
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6,8}"
                  maxLength={8}
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="12345678"
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm tracking-widest text-center text-lg font-mono"
                />
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-semibold py-3 px-4 rounded-xl transition-colors text-sm"
              >
                {loading ? '確認中...' : 'ログイン'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setStep('email')
                  setOtp('')
                  setError('')
                }}
                className="w-full text-sm text-gray-500 hover:text-gray-700 py-2"
              >
                メールアドレスを変更
              </button>
            </form>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-gray-400">
          初回アクセス時は自動的にアカウントが作成されます
        </p>
      </div>
    </div>
  )
}

export default function AuthPage() {
  return (
    <Suspense>
      <AuthPageContent />
    </Suspense>
  )
}
