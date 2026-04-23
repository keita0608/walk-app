'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import AuthGuard from '@/components/AuthGuard';
import StepForm from '@/components/StepForm';
import { WalkEvent } from '@/lib/types';
import { getEvent, getStep } from '@/lib/firebase/firestore';
import { getYesterdayJST } from '@/lib/utils/date';

export default function StepsPage({ params }: { params: { eventId: string } }) {
  const { eventId } = params;
  const { user } = useAuth();

  const [event, setEvent]                   = useState<WalkEvent | null>(null);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [loading, setLoading]               = useState(true);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [ev, existing] = await Promise.all([
        getEvent(eventId),
        getStep(user.id, eventId, getYesterdayJST()),
      ]);
      setEvent(ev);
      setAlreadySubmitted(!!existing);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [user, eventId]);

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
            <div>
              <h1 className="text-xl font-bold text-gray-800">{event.title}</h1>
              <p className="text-sm text-gray-500 mt-1">歩数提出</p>
            </div>

            {event.status !== 'active' && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-700">
                このイベントは現在{event.status === 'upcoming' ? '開催前' : '終了済み'}です。
              </div>
            )}

            {event.status === 'active' && (
              <StepForm
                eventId={eventId}
                alreadySubmitted={alreadySubmitted}
                onSubmitted={() => setAlreadySubmitted(true)}
              />
            )}

            <Link
              href={`/events/${eventId}/ranking`}
              className="block text-center text-sm text-indigo-600 hover:text-indigo-800 py-2"
            >
              ランキングを見る →
            </Link>
          </>
        )}
      </div>
    </AuthGuard>
  );
}
