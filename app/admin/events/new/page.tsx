'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AuthGuard from '@/components/AuthGuard';
import EventWizard from '@/components/admin/EventWizard';
import { AppUser } from '@/lib/types';
import { getUsers } from '@/lib/firebase/firestore';

export default function NewEventPage() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getUsers()
      .then((u) => setUsers(u.sort((a, b) => a.name.localeCompare(b.name, 'ja'))))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AuthGuard requireAdmin>
      <div className="space-y-6">
        <Link href="/admin" className="text-sm text-indigo-600 hover:text-indigo-800">
          ← 管理ダッシュボードに戻る
        </Link>
        <h1 className="text-xl font-bold text-gray-800">イベント作成</h1>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-indigo-500 border-t-transparent" />
          </div>
        ) : (
          <EventWizard users={users} />
        )}
      </div>
    </AuthGuard>
  );
}
