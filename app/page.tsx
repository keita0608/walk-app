'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import AuthGuard from '@/components/AuthGuard';
import EventCard from '@/components/EventCard';
import { WalkEvent } from '@/lib/types';
import { getEvents, getUserParticipations, getEventsByIds } from '@/lib/firebase/firestore';

export default function HomePage() {
  const { user } = useAuth();
  const [events, setEvents] = useState<WalkEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    load();
  }, [user]);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    try {
      if (user.role === 'admin') {
        const all = await getEvents();
        setEvents(sortEvents(all));
      } else {
        const participations = await getUserParticipations(user.id);
        const eventIds = participations.map((p) => p.eventId);
        const userEvents = await getEventsByIds(eventIds);
        setEvents(sortEvents(userEvents));
      }
    } finally {
      setLoading(false);
    }
  };

  const sortEvents = (evts: WalkEvent[]) => {
    const order: Record<WalkEvent['status'], number> = { active: 0, upcoming: 1, finished: 2 };
    return [...evts].sort((a, b) => order[a.status] - order[b.status]);
  };

  return (
    <AuthGuard>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-800">
            {user?.role === 'admin' ? 'すべてのイベント' : '参加中のイベント'}
          </h1>
          {user?.role === 'admin' && (
            <a
              href="/admin"
              className="text-sm px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              管理ダッシュボード
            </a>
          )}
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-3">
          <a
            href="/steps"
            className="flex flex-col items-center gap-1 p-4 bg-white rounded-xl border border-gray-100 shadow-sm hover:border-indigo-200 transition-colors"
          >
            <span className="text-2xl">👟</span>
            <span className="text-sm font-medium text-gray-700">歩数を入力</span>
          </a>
          <a
            href="/journey"
            className="flex flex-col items-center gap-1 p-4 bg-white rounded-xl border border-gray-100 shadow-sm hover:border-indigo-200 transition-colors"
          >
            <span className="text-2xl">🚅</span>
            <span className="text-sm font-medium text-gray-700">どこまでいける？</span>
          </a>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-indigo-500 border-t-transparent" />
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <div className="text-4xl mb-3">🏃</div>
            <p className="text-sm">参加しているイベントがありません</p>
            <p className="text-xs mt-1">管理者にイベントへの追加を依頼してください</p>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
