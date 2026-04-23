'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AuthGuard from '@/components/AuthGuard';
import RankingTable from '@/components/RankingTable';
import { WalkEvent, AppUser, RankingEntry } from '@/lib/types';
import { getEvent, getEventParticipants, getStepsByEvent, getUsers } from '@/lib/firebase/firestore';
import { computeRankings } from '@/lib/utils/ranking';
import { displayDate } from '@/lib/utils/date';

export default function RankingPage({ params }: { params: { eventId: string } }) {
  const { eventId } = params;
  const [event, setEvent]       = useState<WalkEvent | null>(null);
  const [entries, setEntries]   = useState<RankingEntry[]>([]);
  const [loading, setLoading]   = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [ev, participants, steps, allUsers] = await Promise.all([
        getEvent(eventId),
        getEventParticipants(eventId),
        getStepsByEvent(eventId),
        getUsers(),
      ]);
      if (!ev) return;
      setEvent(ev);

      const userMap = Object.fromEntries(allUsers.map((u) => [u.id, u]));
      const participantUsers: AppUser[] = participants
        .map((p) => userMap[p.userId])
        .filter(Boolean) as AppUser[];

      setEntries(computeRankings(participantUsers, steps, ev.startDate, ev.endDate));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [eventId]);

  return (
    <AuthGuard>
      <div className="space-y-5">
        <Link href="/" className="text-sm text-indigo-600 hover:text-indigo-800">
          ← イベント一覧に戻る
        </Link>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-indigo-500 border-t-transparent" />
          </div>
        ) : !event ? (
          <p className="text-gray-500">イベントが見つかりません</p>
        ) : (
          <>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-xl font-bold text-gray-800">{event.title}</h1>
                <p className="text-xs text-gray-400 mt-1">
                  {displayDate(event.startDate)} 〜 {displayDate(event.endDate)}
                </p>
              </div>
              {event.status === 'active' && (
                <Link
                  href={`/events/${eventId}/steps`}
                  className="shrink-0 text-sm px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  歩数を入力
                </Link>
              )}
            </div>

            <RankingTable entries={entries} />
          </>
        )}
      </div>
    </AuthGuard>
  );
}
