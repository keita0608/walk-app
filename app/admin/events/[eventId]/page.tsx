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
  removeParticipant,
  addParticipants,
  updateParticipant,
} from '@/lib/firebase/firestore';
import { computeRankings } from '@/lib/utils/ranking';
import { displayDate, getRankingCutoffDate } from '@/lib/utils/date';
import { EventStatus } from '@/lib/types';
import { exportRankingAsImage } from '@/lib/utils/exportRanking';

type Tab = 'ranking' | 'participants' | 'correction';

export default function AdminEventPage({ params }: { params: { eventId: string } }) {
  const { eventId } = params;
  const router = useRouter();

  const [event, setEvent]               = useState<WalkEvent | null>(null);
  const [allUsers, setAllUsers]         = useState<AppUser[]>([]);
  const [participants, setParticipants] = useState<AppUser[]>([]);
  const [allParticipants, setAllParticipants] = useState<EventParticipant[]>([]);
  const [teams, setTeams]               = useState<Team[]>([]);
  const [entries, setEntries]           = useState<RankingEntry[]>([]);
  const [tab, setTab]                   = useState<Tab>('ranking');
  const [loading, setLoading]           = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Event delete
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting]         = useState(false);

  // Participant remove
  const [removingId, setRemovingId]     = useState<string | null>(null);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState<EventParticipant | null>(null);

  // Participant add
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [addSelected, setAddSelected]   = useState<string[]>([]);
  const [adding, setAdding]             = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [ev, rawParticipants, steps, users, eventTeams] = await Promise.all([
        getEvent(eventId),
        getEventParticipants(eventId),
        getStepsByEvent(eventId),
        getUsers(),
        getTeams(eventId),
      ]);

      if (!ev) return;
      setEvent(ev);
      setAllParticipants(rawParticipants);
      setAllUsers(users);
      setTeams(eventTeams);

      const userMap = Object.fromEntries(users.map((u) => [u.id, u]));
      const pUsers = rawParticipants.map((p) => userMap[p.userId]).filter(Boolean) as AppUser[];
      setParticipants(pUsers);
      setEntries(computeRankings(pUsers, rawParticipants, steps, ev.startDate, ev.endDate, getRankingCutoffDate()));
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

  const handleDeleteEvent = async () => {
    setDeleting(true);
    try {
      await deleteEvent(eventId);
      router.replace('/admin');
    } catch {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleRemoveParticipant = async () => {
    if (!showRemoveConfirm) return;
    setRemovingId(showRemoveConfirm.id);
    try {
      await removeParticipant(showRemoveConfirm.id);
      setShowRemoveConfirm(null);
      await load();
    } finally {
      setRemovingId(null);
    }
  };

  const handleAddParticipants = async () => {
    if (addSelected.length === 0) return;
    setAdding(true);
    try {
      await addParticipants(eventId, addSelected);
      setAddSelected([]);
      setShowAddPanel(false);
      await load();
    } finally {
      setAdding(false);
    }
  };

  const handleParticipantField = async (
    participantId: string,
    field: 'targetSteps' | 'handicapMultiplier',
    raw: string,
  ) => {
    const val = raw === '' ? undefined : parseFloat(raw);
    if (raw !== '' && (isNaN(val!) || val! < 0)) return;
    if (field === 'targetSteps' && val !== undefined && !Number.isInteger(val)) return;
    const update = field === 'targetSteps'
      ? { targetSteps: val as number | undefined }
      : { handicapMultiplier: val as number | undefined };
    await updateParticipant(participantId, update);
    setAllParticipants((prev) =>
      prev.map((p) => p.id === participantId ? { ...p, ...update } : p),
    );
  };

  // Users not yet in this event
  const participantIds = new Set(allParticipants.map((p) => p.userId));
  const nonParticipants = allUsers.filter((u) => !participantIds.has(u.id));

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

            {/* ── Ranking tab ── */}
            {tab === 'ranking' && (
              <div className="space-y-3">
                <div className="flex justify-end">
                  <button
                    onClick={() => exportRankingAsImage(entries, event.title, event.startDate, event.endDate)}
                    disabled={entries.length === 0}
                    className="text-sm px-3 py-1.5 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 disabled:opacity-40"
                  >
                    📷 画像を保存
                  </button>
                </div>
                <RankingTable entries={entries} />
              </div>
            )}

            {/* ── Participants tab ── */}
            {tab === 'participants' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  {participants.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-6">参加者がいません</p>
                  ) : (
                    participants.map((user) => {
                      const participation = allParticipants.find((p) => p.userId === user.id);
                      const team = teams.find((t) => t.id === participation?.teamId);
                      return (
                        <div key={user.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-2">
                          <div className="flex items-center gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-800 truncate">{user.name}</p>
                              <p className="text-xs text-gray-400">{user.email}</p>
                            </div>
                            {team && (
                              <span className="text-xs px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full">
                                {team.name}
                              </span>
                            )}
                            <button
                              onClick={() => participation && setShowRemoveConfirm(participation)}
                              disabled={removingId === participation?.id}
                              className="text-xs text-red-400 hover:text-red-600 shrink-0"
                            >
                              削除
                            </button>
                          </div>
                          {participation && (
                            <div className="flex flex-wrap gap-3 pt-1 border-t border-gray-50">
                              <div className="flex items-center gap-1.5">
                                <label className="text-xs text-gray-500 whitespace-nowrap">目標歩数：</label>
                                <input
                                  type="number"
                                  min={0}
                                  step={100}
                                  defaultValue={participation.targetSteps ?? ''}
                                  placeholder="例：10000"
                                  onBlur={(e) => handleParticipantField(participation.id, 'targetSteps', e.target.value)}
                                  className="w-24 border border-gray-300 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                                <span className="text-xs text-gray-400">歩/日</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <label className="text-xs text-gray-500 whitespace-nowrap">ハンデ係数：</label>
                                <input
                                  type="number"
                                  min={1}
                                  step={0.1}
                                  defaultValue={participation.handicapMultiplier ?? 1}
                                  onBlur={(e) => handleParticipantField(participation.id, 'handicapMultiplier', e.target.value)}
                                  className="w-16 border border-gray-300 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                                <span className="text-xs text-gray-400">倍（1=なし）</span>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Add participants */}
                {nonParticipants.length > 0 && (
                  <div>
                    {!showAddPanel ? (
                      <button
                        onClick={() => setShowAddPanel(true)}
                        className="w-full py-2.5 border-2 border-dashed border-indigo-300 text-indigo-600 rounded-xl text-sm hover:bg-indigo-50"
                      >
                        + 参加者を追加
                      </button>
                    ) : (
                      <div className="bg-white rounded-xl border border-indigo-100 shadow-sm p-4 space-y-3">
                        <p className="text-sm font-medium text-gray-700">追加するユーザーを選択</p>
                        <p className="text-xs text-gray-400">
                          ※ 途中参加でも平均はイベント開始日（{displayDate(event.startDate)}）基準で計算されます
                        </p>
                        <div className="border border-gray-200 rounded-lg divide-y max-h-60 overflow-y-auto">
                          {nonParticipants.map((u) => (
                            <label key={u.id} className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50">
                              <input
                                type="checkbox"
                                checked={addSelected.includes(u.id)}
                                onChange={() =>
                                  setAddSelected((prev) =>
                                    prev.includes(u.id)
                                      ? prev.filter((id) => id !== u.id)
                                      : [...prev, u.id],
                                  )
                                }
                                className="accent-indigo-600 w-4 h-4"
                              />
                              <div>
                                <span className="text-sm font-medium text-gray-800">{u.name}</span>
                                <span className="text-xs text-gray-400 ml-2">{u.email}</span>
                              </div>
                            </label>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => { setShowAddPanel(false); setAddSelected([]); }}
                            disabled={adding}
                            className="flex-1 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50"
                          >
                            キャンセル
                          </button>
                          <button
                            onClick={handleAddParticipants}
                            disabled={adding || addSelected.length === 0}
                            className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:bg-gray-300 font-medium"
                          >
                            {adding ? '追加中…' : `${addSelected.length}名を追加`}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ── Data correction tab ── */}
            {tab === 'correction' && (
              <DataCorrection
                eventId={eventId}
                participants={participants}
                startDate={event.startDate}
                endDate={event.endDate}
                onUpdated={load}
              />
            )}

            {/* Remove participant confirmation */}
            {showRemoveConfirm && (
              <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full space-y-4">
                  <h3 className="font-semibold text-gray-800">参加者を削除しますか？</h3>
                  <p className="text-sm text-gray-600">
                    <strong>{participants.find((u) => u.id === showRemoveConfirm.userId)?.name}</strong> をイベントから削除します。
                    歩数データは残ります。ランキングからは除外されます。
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowRemoveConfirm(null)}
                      className="flex-1 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                    >
                      キャンセル
                    </button>
                    <button
                      onClick={handleRemoveParticipant}
                      className="flex-1 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 font-medium"
                    >
                      削除する
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Delete event confirmation */}
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
                      onClick={handleDeleteEvent}
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
