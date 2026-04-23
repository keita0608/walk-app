'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';
import RankingTable from '@/components/RankingTable';
import DataCorrection from '@/components/admin/DataCorrection';
import { WalkEvent, AppUser, EventParticipant, RankingEntry, Team } from '@/lib/types';
import {
  getEvent,
  getEventParticipants,
  getStepsByEvent,
  getUsers,
  getTeams,
  updateEvent,
  deleteEvent,
} from '@/lib/firebase/firestore';
import { computeRankings } from '@/lib/utils/ranking';
import { displayDate } from '@/lib/utils/date';
import { EventStatus } from '@/lib/types';

type Tab = 'ranking' | 'participants' | 'correction';

export default function AdminEventPage({ params }: { params: { eventId: string } }) {
  const { eventId } = params;
  const router = useRouter();

  const [event, setEvent]               = useState<WalkEvent | null>(null);
  const [participants, setParticipants] = useState<AppUser[]>([]);
  const [allParticipants, setAllParticipants] = useState<EventParticipant[]>([]);
  const [teams, setTeams]               = useState<Team[]>([]);
  const [entries, setEntries]           = useState<RankingEntry[]>([]);
  const [tab, setTab]                   = useState<Tab>('ranking');
  const [loading, setLoading]           = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting]         = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [ev, rawParticipants, steps, allUsers, eventTeams] = await Promise.all([
        getEvent(eventId),
        getEventParticipants(eventId),
        getStepsByEvent(eventId),
        getUsers(),
        getTeams(eventId),
      ]);

      if (!ev) return;
      setEvent(ev);
      setAllParticipants(rawParticipants);
      setTeams(eventTeams);

      const userMap = Object.fromEntries(allUsers.map((u) => [u.id, u]));
      const pUsers = rawParticipants
        .map((p) => userMap[p.userId])
        .filter(Boolean) as AppUser[];
      setParticipants(pUsers);
      setEntries(computeRankings(pUsers, steps, ev.startDate, ev.endDate));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [eventId]);

  const handleStatusChange = async (status: EventStatus) => {
    if (!event) return;
    setUpdatingStatus(true);
    try {
      await updateEvent(eventId, { status });
      setEvent({ ...event, status });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteEvent(eventId);
      router.replace('/admin');
    } catch {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const tabClass = (t: Tab) =>
    `px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
      tab === t
        ? 'border-indigo-600 text-indigo-600'
        : 'border-transparent text-gray-500 hover:text-gray-700'
    }`;

  return (
    <AuthGuard requireAdmin>
      <div className="space-y-5">
        <Link href="/admin" className="text-sm text-indigo-600 hover:text-indigo-800">
          ← 管理ダッシュボードに戻る
        </Link>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-indigo-500 border-t-transparent" />
          </div>
        ) : !event ? (
          <p className="text-gray-500">イベントが見つかりません</p>
        ) : (
          <>
            {/* Event header */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h1 className="text-lg font-bold text-gray-800">{event.title}</h1>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {displayDate(event.startDate)} 〜 {displayDate(event.endDate)} ／{' '}
                    {event.type === 'individual' ? '個人戦' : 'チーム戦'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={event.status}
                    onChange={(e) => handleStatusChange(e.target.value as EventStatus)}
                    disabled={updatingStatus}
                    className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                  >
                    <option value="upcoming">開催前</option>
                    <option value="active">開催中</option>
                    <option value="finished">終了</option>
                  </select>
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="text-sm px-3 py-1.5 border border-red-300 text-red-500 rounded-lg hover:bg-red-50"
                  >
                    削除
                  </button>
                </div>
              </div>
              <p className="text-xs text-gray-400">参加者 {participants.length} 名</p>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 -mb-2">
              <button className={tabClass('ranking')}      onClick={() => setTab('ranking')}>ランキング</button>
              <button className={tabClass('participants')} onClick={() => setTab('participants')}>参加者</button>
              <button className={tabClass('correction')}  onClick={() => setTab('correction')}>データ修正</button>
            </div>

            {/* Tab content */}
            {tab === 'ranking' && <RankingTable entries={entries} />}

            {tab === 'participants' && (
              <div className="space-y-3">
                {participants.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-8">参加者がいません</p>
                ) : (
                  participants.map((user) => {
                    const participation = allParticipants.find((p) => p.userId === user.id);
                    const team = teams.find((t) => t.id === participation?.teamId);
                    return (
                      <div key={user.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-800 truncate">{user.name}</p>
                          <p className="text-xs text-gray-400">{user.email}</p>
                        </div>
                        {team && (
                          <span className="text-xs px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full">
                            {team.name}
                          </span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {tab === 'correction' && (
              <DataCorrection
                eventId={eventId}
                participants={participants}
                startDate={event.startDate}
                endDate={event.endDate}
                onUpdated={load}
              />
            )}

            {/* Delete confirmation dialog */}
            {showDeleteConfirm && (
              <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full space-y-4">
                  <h3 className="font-semibold text-gray-800">イベントを削除しますか？</h3>
                  <p className="text-sm text-gray-600">
                    「<strong>{event.title}</strong>」を削除します。参加者・歩数データも含めてすべて削除されます。この操作は取り消せません。
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      disabled={deleting}
                      className="flex-1 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                    >
                      キャンセル
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={deleting}
                      className="flex-1 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:bg-gray-300 font-medium"
                    >
                      {deleting ? '削除中…' : '削除する'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AuthGuard>
  );
}
