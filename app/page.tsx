'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Step = 'email' | 'sent'

export default function AuthPage() {
  const supabase = createClient()

  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSendLink(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    setLoading(false)
    if (error) {
      setError(`送信エラー: ${error.message}`)
      return
    }
    setStep('sent')
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
            <form onSubmit={handleSendLink} className="space-y-4">
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
                {loading ? '送信中...' : 'ログインリンクを送信'}
              </button>
            </form>
          ) : (
            <div className="space-y-4 text-center">
              <div className="text-4xl">📬</div>
              <p className="text-sm font-medium text-gray-900">
                メールを確認してください
              </p>
              <p className="text-sm text-gray-500 leading-relaxed">
                <span className="font-medium text-gray-700">{email}</span>{' '}
                にメールを送信しました。
              </p>
              <div className="bg-brand-50 rounded-xl px-4 py-3 text-sm text-brand-800 text-left">
                <p className="font-semibold mb-1">ログイン方法：</p>
                <p>メール内の <strong>「Log In」ボタン</strong> または<strong>リンク</strong>をタップしてください。</p>
                <p className="mt-1 text-xs text-brand-600">※ 数字コードは使いません</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setStep('email')
                  setError('')
                }}
                className="w-full text-sm text-gray-500 hover:text-gray-700 py-2"
              >
                メールアドレスを変更
              </button>
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-gray-400">
          初回アクセス時は自動的にアカウントが作成されます
        </p>
      </div>
    </div>
  )
}
