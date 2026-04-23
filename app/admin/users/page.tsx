'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AuthGuard from '@/components/AuthGuard';
import UserList from '@/components/admin/UserList';
import { AppUser } from '@/lib/types';
import { getUsers } from '@/lib/firebase/firestore';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://your-app.vercel.app';

export default function UsersPage() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showGuide, setShowGuide] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const all = await getUsers();
      setUsers(all.sort((a, b) => a.name.localeCompare(b.name, 'ja')));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <AuthGuard requireAdmin>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Link href="/admin" className="text-sm text-indigo-600 hover:text-indigo-800">
              ← 管理ダッシュボードに戻る
            </Link>
            <h1 className="text-xl font-bold text-gray-800 mt-2">ユーザー管理</h1>
          </div>
        </div>

        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-sm text-indigo-700">
          <p className="font-medium mb-1">💡 ユーザーの登録方法</p>
          <p className="text-indigo-600">
            ユーザーにアプリへのログインを依頼してください。ログイン後、このページに表示されます。
            管理者はここでロールや名前を変更できます。
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-indigo-500 border-t-transparent" />
          </div>
        ) : (
          <UserList users={users} onUpdated={load} />
        )}

        {/* iOS Shortcuts Setup Guide */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <button
            onClick={() => setShowGuide((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 text-left"
          >
            <span className="font-medium text-gray-800 text-sm">📱 iOS ショートカット設定ガイド</span>
            <span className="text-gray-400 text-sm">{showGuide ? '▲ 閉じる' : '▼ 開く'}</span>
          </button>

          {showGuide && (
            <div className="px-4 pb-5 space-y-5 text-sm border-t border-gray-100">

              <div className="pt-4 space-y-1">
                <p className="font-medium text-gray-700">概要</p>
                <p className="text-gray-500">
                  iOSのショートカットアプリを使って、Apple Healthの歩数を毎朝自動送信できます。
                  ユーザーが一度設定すれば、以降は手入力不要になります。
                </p>
              </div>

              {/* Step 1 */}
              <div className="space-y-1">
                <p className="font-semibold text-gray-700">① 管理者：トークンを発行する</p>
                <p className="text-gray-500">
                  上のユーザー一覧から対象ユーザーの「トークンを発行」をタップし、表示されたトークンをコピーしてユーザーに共有してください。
                </p>
              </div>

              {/* Step 2 */}
              <div className="space-y-2">
                <p className="font-semibold text-gray-700">② ユーザー：ショートカットを作成する</p>
                <ol className="space-y-2 text-gray-500 list-decimal list-inside">
                  <li>iPhone の「ショートカット」アプリを開く</li>
                  <li>右上の <strong>＋</strong> をタップ → 「アクションを追加」</li>
                  <li>「<strong>ヘルスケアサンプルを検索</strong>」を検索して追加
                    <ul className="list-disc list-inside ml-4 mt-1 text-xs text-gray-400">
                      <li>種類：<strong>歩数</strong></li>
                      <li>期間：<strong>昨日</strong></li>
                      <li>並び替え・上限などはデフォルトのまま</li>
                    </ul>
                  </li>
                  <li>「<strong>統計を計算</strong>」アクションを追加（前のステップの結果が自動で入力に入ります）
                    <ul className="list-disc list-inside ml-4 mt-1 text-xs text-gray-400">
                      <li>統計：<strong>合計</strong></li>
                      <li>入力：ヘルスケアサンプルの「<strong>値</strong>」</li>
                    </ul>
                  </li>
                  <li>「<strong>URLの内容を取得</strong>」アクションを追加
                    <ul className="list-disc list-inside ml-4 mt-1 text-xs text-gray-400">
                      <li>URL：<code className="bg-gray-100 px-1 rounded">{APP_URL}/api/steps</code></li>
                      <li>メソッド：<strong>POST</strong></li>
                      <li>本文：<strong>JSON</strong> を選択</li>
                      <li>JSONキーを追加：<br />
                        <code className="bg-gray-100 px-1 rounded">token</code> → 発行されたトークン（文字列）<br />
                        <code className="bg-gray-100 px-1 rounded">steps</code> → 「統計を計算」の結果（数値）
                      </li>
                    </ul>
                  </li>
                </ol>
              </div>

              {/* Step 3 */}
              <div className="space-y-2">
                <p className="font-semibold text-gray-700">③ 自動化に設定する（毎朝11時前に実行）</p>
                <ol className="space-y-1 text-gray-500 list-decimal list-inside">
                  <li>ショートカットアプリの「オートメーション」タブを開く</li>
                  <li>「＋」→「時刻」→ 毎朝 <strong>10:30</strong> に設定</li>
                  <li>作成したショートカットを選択</li>
                  <li>「すぐに実行」をオン（確認なしで自動実行）</li>
                </ol>
                <p className="text-xs text-amber-600 mt-1">⚠️ 締め切りは11:30 JST のため、10:30 ごろの実行を推奨します</p>
              </div>

              {/* Endpoint info */}
              <div className="bg-gray-50 rounded-lg p-3 space-y-1">
                <p className="font-medium text-gray-600 text-xs">エンドポイント情報</p>
                <p className="text-xs text-gray-500">URL: <code className="bg-white px-1 rounded border">{APP_URL}/api/steps</code></p>
                <p className="text-xs text-gray-500">メソッド: POST</p>
                <p className="text-xs text-gray-500">Content-Type: application/json</p>
                <pre className="text-xs bg-white border rounded p-2 mt-1 overflow-x-auto">{`{
  "token": "ユーザーのトークン",
  "steps": 8500,
  "date": "2026-04-23"  // 省略可（省略時は昨日）
}`}</pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
