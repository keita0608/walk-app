'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AuthGuard from '@/components/AuthGuard';
import EventCard from '@/components/EventCard';
import { WalkEvent } from '@/lib/types';
import { getEvents } from '@/lib/firebase/firestore';

export default function AdminPage() {
  const [events, setEvents] = useState<WalkEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const all = await getEvents();
      const order: Record<WalkEvent['status'], number> = { active: 0, upcoming: 1, finished: 2 };
      setEvents([...all].sort((a, b) => order[a.status] - order[b.status]));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <AuthGuard requireAdmin>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-800">管理ダッシュボード</h1>
          <Link
            href="/admin/events/new"
            className="text-sm px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            + イベント作成
          </Link>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-indigo-500 border-t-transparent" />
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <div className="text-4xl mb-3">📋</div>
            <p className="text-sm">イベントがありません</p>
            <Link href="/admin/events/new" className="text-indigo-600 text-sm hover:underline mt-2 inline-block">
              最初のイベントを作成する
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((event) => (
              <EventCard key={event.id} event={event} isAdmin />
            ))}
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
