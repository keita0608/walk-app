'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Suspense } from 'react'

type Tab = 'ios' | 'android'

function SetupContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [tab, setTab] = useState<Tab>('ios')
  const [apiToken, setApiToken] = useState<string | null>(null)
  const [googleConnected, setGoogleConnected] = useState(false)
  const [iosConnected, setIosConnected] = useState(false)
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(true)

  const googleSuccess = searchParams.get('google') === 'success'
  const googleError = searchParams.get('error')

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      // Load or create API token for iOS
      const { data: tokenRow } = await supabase
        .from('api_tokens')
        .select('token')
        .eq('user_id', user.id)
        .single()

      if (tokenRow) {
        setApiToken(tokenRow.token)
      } else {
        const newToken = crypto.randomUUID()
        await supabase
          .from('api_tokens')
          .insert({ user_id: user.id, token: newToken })
        setApiToken(newToken)
      }

      // Check if Google Fit is connected
      const { data: fitToken } = await supabase
        .from('google_fit_tokens')
        .select('user_id')
        .eq('user_id', user.id)
        .single()
      setGoogleConnected(!!fitToken)

      // Check if iOS data has been sent
      const today = new Date().toLocaleDateString('en-CA', {
        timeZone: 'Asia/Tokyo',
      })
      const { data: iosSteps } = await supabase
        .from('daily_steps')
        .select('id')
        .eq('user_id', user.id)
        .eq('source', 'ios')
        .gte('date', today)
        .single()
      setIosConnected(!!iosSteps)

      setLoading(false)
    }
    load()
  }, [])

  async function copyToken() {
    if (!apiToken) return
    await navigator.clipboard.writeText(apiToken)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function connectGoogleFit() {
    const res = await fetch('/api/google-fit/auth')
    const { url } = await res.json()
    window.location.href = url
  }

  const appUrl =
    typeof window !== 'undefined'
      ? window.location.origin
      : 'https://your-app.vercel.app'

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-gray-400 text-sm">読み込み中...</div>
      </div>
    )
  }

  return (
    <div className="flex-1 px-4 py-8 max-w-2xl mx-auto w-full">
      <div className="text-center mb-6">
        <div className="text-4xl mb-3">🔗</div>
        <h2 className="text-xl font-bold text-gray-900">データ連携の設定</h2>
        <p className="mt-2 text-sm text-gray-500">
          あなたのスマートフォンと歩数を連携させましょう
        </p>
      </div>

      {/* Status summary */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-6 grid grid-cols-2 gap-3">
        <div className={`rounded-xl p-3 text-center ${iosConnected ? 'bg-brand-50' : 'bg-gray-50'}`}>
          <div className="text-xl mb-1">🍎</div>
          <div className="text-xs font-medium text-gray-700">iOS</div>
          <div className={`text-xs mt-1 font-semibold ${iosConnected ? 'text-brand-600' : 'text-gray-400'}`}>
            {iosConnected ? '連携済み' : '未連携'}
          </div>
        </div>
        <div className={`rounded-xl p-3 text-center ${googleConnected || googleSuccess ? 'bg-brand-50' : 'bg-gray-50'}`}>
          <div className="text-xl mb-1">🤖</div>
          <div className="text-xs font-medium text-gray-700">Android</div>
          <div className={`text-xs mt-1 font-semibold ${googleConnected || googleSuccess ? 'text-brand-600' : 'text-gray-400'}`}>
            {googleConnected || googleSuccess ? '連携済み' : '未連携'}
          </div>
        </div>
      </div>

      {googleSuccess && (
        <div className="mb-4 bg-brand-50 border border-brand-200 text-brand-700 text-sm px-4 py-3 rounded-xl">
          Google Fit との連携が完了しました！
        </div>
      )}
      {googleError && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
          Google Fit 連携に失敗しました。もう一度お試しください。
        </div>
      )}

      {/* Tabs */}
      <div className="flex rounded-xl overflow-hidden border border-gray-200 mb-6">
        <button
          onClick={() => setTab('ios')}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            tab === 'ios'
              ? 'bg-brand-600 text-white'
              : 'bg-white text-gray-600 hover:bg-gray-50'
          }`}
        >
          🍎 iPhone (iOS)
        </button>
        <button
          onClick={() => setTab('android')}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            tab === 'android'
              ? 'bg-brand-600 text-white'
              : 'bg-white text-gray-600 hover:bg-gray-50'
          }`}
        >
          🤖 Android
        </button>
      </div>

      {tab === 'ios' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-1">
              あなたの APIトークン
            </h3>
            <p className="text-xs text-gray-500 mb-3">
              ショートカット設定時にこのトークンを使用します
            </p>
            <div className="bg-gray-50 rounded-xl px-4 py-3 font-mono text-xs text-gray-700 break-all mb-3">
              {apiToken}
            </div>
            <button
              onClick={copyToken}
              className="w-full bg-gray-900 hover:bg-gray-700 text-white text-sm font-medium py-2.5 px-4 rounded-xl transition-colors"
            >
              {copied ? 'コピーしました！' : 'トークンをコピー'}
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
            <h3 className="font-semibold text-gray-900">
              ショートカット設定手順
            </h3>

            {[
              {
                step: 1,
                title: 'ショートカットアプリを開く',
                detail: 'iPhoneで「ショートカット」アプリを開き、「オートメーション」タブをタップしてください。',
              },
              {
                step: 2,
                title: '新しいオートメーションを作成',
                detail: '右上の「＋」→「個人用オートメーション」→「時刻」を選択し、毎日 23:00 に設定して「次へ」をタップ。',
              },
              {
                step: 3,
                title: '歩数を取得するアクションを追加',
                detail: '「アクションを追加」→「ヘルスケア」→「ヘルスケアサンプルを検索」を選択。タイプを「歩数」、並べ替えを「作成日」の降順、上限を「1」に設定。',
              },
              {
                step: 4,
                title: '歩数を変数に保存',
                detail: '「アクションを追加」→「変数を設定」を選択し、変数名を「steps」にして、値に前のステップの「ヘルスケアサンプル.数量」を設定。',
              },
              {
                step: 5,
                title: 'APIエンドポイントを設定',
                detail: '「アクションを追加」→「URLの内容を取得」を選択し、以下の設定を行います：',
                extra: (
                  <div className="mt-2 bg-gray-50 rounded-xl p-3 text-xs space-y-1">
                    <p><span className="text-gray-400">URL：</span><span className="font-mono text-gray-700">{appUrl}/api/steps</span></p>
                    <p><span className="text-gray-400">方法：</span>POST</p>
                    <p><span className="text-gray-400">ヘッダー：</span><span className="font-mono">Authorization: Bearer {apiToken?.slice(0, 8)}...</span></p>
                    <p><span className="text-gray-400">本文：</span>JSON</p>
                    <p className="pl-2"><span className="text-gray-400">steps：</span>steps（変数）</p>
                    <p className="pl-2"><span className="text-gray-400">date：</span>現在の日付（YYYY-MM-DD形式）</p>
                  </div>
                ),
              },
              {
                step: 6,
                title: '完了・実行確認',
                detail: '「次へ」→「完了」でオートメーションを保存。手動で一度実行して、ランキングに歩数が反映されるか確認してください。',
              },
            ].map(({ step, title, detail, extra }) => (
              <div key={step} className="flex gap-3">
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold">
                  {step}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{detail}</p>
                  {extra}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'android' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-1">Google Fit 連携</h3>
            <p className="text-sm text-gray-500 mb-4">
              Google Fit と連携することで、毎日ランキングページを開くたびに自動的に歩数が更新されます。
            </p>

            <div className="space-y-3 mb-5">
              {[
                'Google Fit アプリがインストール済みで歩数を記録していること',
                'Googleアカウントにログインしていること',
                '連携後、ランキングページにアクセスするたびに歩数が同期されます',
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-brand-500 mt-0.5">✓</span>
                  <span className="text-sm text-gray-600">{item}</span>
                </div>
              ))}
            </div>

            {googleConnected || googleSuccess ? (
              <div className="space-y-3">
                <div className="bg-brand-50 border border-brand-200 text-brand-700 text-sm px-4 py-3 rounded-xl text-center font-medium">
                  Google Fit と連携済みです
                </div>
                <button
                  onClick={connectGoogleFit}
                  className="w-full border border-gray-300 text-gray-700 text-sm font-medium py-2.5 px-4 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  再連携する
                </button>
              </div>
            ) : (
              <button
                onClick={connectGoogleFit}
                className="w-full bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Google Fit と連携する
              </button>
            )}
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <p className="text-xs text-amber-700">
              <strong>注意：</strong>Google Fit がインストールされていない場合は、Play ストアからインストールして歩数の記録を開始してください。Samsung Health などの歩数アプリを使っている場合は、Google Fit への連携が必要です。
            </p>
          </div>
        </div>
      )}

      <div className="mt-8">
        <button
          onClick={() => router.push('/ranking')}
          className="w-full bg-gray-900 hover:bg-gray-700 text-white font-semibold py-3 px-4 rounded-xl transition-colors text-sm"
        >
          ランキングを見る →
        </button>
        <p className="text-center text-xs text-gray-400 mt-2">
          連携が完了していなくてもランキングは確認できます
        </p>
      </div>

      <div className="mt-4 flex justify-center gap-2">
        <span className="w-2 h-2 rounded-full bg-gray-200"></span>
        <span className="w-2 h-2 rounded-full bg-brand-500"></span>
        <span className="w-2 h-2 rounded-full bg-gray-200"></span>
      </div>
    </div>
  )
}

export default function SetupPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center">
          <div className="text-gray-400 text-sm">読み込み中...</div>
        </div>
      }
    >
      <SetupContent />
    </Suspense>
  )
}
