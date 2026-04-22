'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AuthGuard from '@/components/AuthGuard';
import UserList from '@/components/admin/UserList';
import { AppUser } from '@/lib/types';
import { getUsers } from '@/lib/firebase/firestore';

export default function UsersPage() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);

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
      </div>
    </AuthGuard>
  );
}
