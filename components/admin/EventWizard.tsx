'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppUser, EventType, EventStatus } from '@/lib/types';
import { createEvent, addParticipants, createTeams } from '@/lib/firebase/firestore';
import { getTodayJST } from '@/lib/utils/date';

interface Props {
  users: AppUser[];
}

interface Step1Data {
  title: string;
  startDate: string;
  endDate: string;
  type: EventType;
  status: EventStatus;
}

interface TeamDraft {
  name: string;
}

export default function EventWizard({ users }: Props) {
  const router = useRouter();
  const today = getTodayJST();

  const [step, setStep] = useState(1);
  const [step1, setStep1] = useState<Step1Data>({
    title: '',
    startDate: today,
    endDate: today,
    type: 'individual',
    status: 'upcoming',
  });
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [teams, setTeams] = useState<TeamDraft[]>([{ name: 'チームA' }, { name: 'チームB' }]);
  const [teamAssignments, setTeamAssignments] = useState<Record<string, number>>({}); // userId → teamIndex
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // ── Step 1 handlers ──
  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!step1.title.trim()) { setError('タイトルを入力してください'); return; }
    if (step1.endDate < step1.startDate) { setError('終了日は開始日以降にしてください'); return; }
    setError('');
    setStep(2);
  };

  // ── Step 2 handlers ──
  const toggleUser = (uid: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid],
    );
  };

  const handleStep2Submit = () => {
    if (selectedUserIds.length === 0) { setError('参加者を1人以上選択してください'); return; }
    setError('');
    setStep(step1.type === 'team' ? 3 : 4);
  };

  // ── Step 3 handlers ──
  const addTeam = () => setTeams((t) => [...t, { name: `チーム${t.length + 1}` }]);
  const removeTeam = (i: number) => setTeams((t) => t.filter((_, idx) => idx !== i));
  const updateTeamName = (i: number, name: string) =>
    setTeams((t) => t.map((team, idx) => (idx === i ? { name } : team)));

  const assignTeam = (userId: string, teamIndex: number) =>
    setTeamAssignments((prev) => ({ ...prev, [userId]: teamIndex }));

  const handleStep3Submit = () => {
    const unassigned = selectedUserIds.filter((uid) => teamAssignments[uid] === undefined);
    if (unassigned.length > 0) { setError('全員にチームを割り当ててください'); return; }
    setError('');
    setStep(4);
  };

  // ── Final submit ──
  const handleCreate = async () => {
    setSaving(true);
    setError('');
    try {
      const eventId = await createEvent({ ...step1 });

      let teamIdMap: Record<string, string> | undefined;
      if (step1.type === 'team' && teams.length > 0) {
        const createdTeams = await createTeams(eventId, teams.map((t) => t.name));
        teamIdMap = {};
        for (const [userId, teamIdx] of Object.entries(teamAssignments)) {
          teamIdMap[userId] = createdTeams[teamIdx]?.id ?? '';
        }
      }

      await addParticipants(eventId, selectedUserIds, teamIdMap);
      router.push(`/admin/events/${eventId}`);
    } catch (err: unknown) {
      setError('作成に失敗しました: ' + (err instanceof Error ? err.message : String(err)));
      setSaving(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto">
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-6">
        {[1, 2, step1.type === 'team' ? 3 : null, 4]
          .filter(Boolean)
          .map((s, i, arr) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  step >= (s as number)
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                {s}
              </div>
              {i < arr.length - 1 && (
                <div className={`flex-1 h-0.5 ${step > (s as number) ? 'bg-indigo-400' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {error}
        </div>
      )}

      {/* ── Step 1: Basic Info ── */}
      {step === 1 && (
        <form onSubmit={handleStep1Submit} className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">基本情報</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">タイトル</label>
            <input
              type="text"
              required
              value={step1.title}
              onChange={(e) => setStep1({ ...step1, title: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="例：2024年 春の歩数チャレンジ"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">開始日</label>
              <input
                type="date"
                required
                value={step1.startDate}
                onChange={(e) => setStep1({ ...step1, startDate: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">終了日</label>
              <input
                type="date"
                required
                value={step1.endDate}
                min={step1.startDate}
                onChange={(e) => setStep1({ ...step1, endDate: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">種別</label>
            <select
              value={step1.type}
              onChange={(e) => setStep1({ ...step1, type: e.target.value as EventType })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="individual">個人戦</option>
              <option value="team">チーム戦</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ステータス</label>
            <select
              value={step1.status}
              onChange={(e) => setStep1({ ...step1, status: e.target.value as EventStatus })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="upcoming">開催前</option>
              <option value="active">開催中</option>
              <option value="finished">終了</option>
            </select>
          </div>
          <button
            type="submit"
            className="w-full py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
          >
            次へ →
          </button>
        </form>
      )}

      {/* ── Step 2: Participants ── */}
      {step === 2 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">参加者を選択</h2>
          <div className="border border-gray-200 rounded-lg divide-y max-h-80 overflow-y-auto">
            {users.map((u) => (
              <label key={u.id} className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={selectedUserIds.includes(u.id)}
                  onChange={() => toggleUser(u.id)}
                  className="accent-indigo-600 w-4 h-4"
                />
                <div>
                  <span className="text-sm font-medium text-gray-800">{u.name}</span>
                  <span className="text-xs text-gray-400 ml-2">{u.email}</span>
                </div>
              </label>
            ))}
          </div>
          <p className="text-xs text-gray-500">{selectedUserIds.length} 人選択中</p>
          <div className="flex gap-2">
            <button
              onClick={() => setStep(1)}
              className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              ← 戻る
            </button>
            <button
              onClick={handleStep2Submit}
              className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
            >
              次へ →
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: Team Assignment ── */}
      {step === 3 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">チーム割り当て</h2>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">チーム一覧</label>
            {teams.map((team, i) => (
              <div key={i} className="flex gap-2 items-center">
                <input
                  type="text"
                  value={team.name}
                  onChange={(e) => updateTeamName(i, e.target.value)}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {teams.length > 2 && (
                  <button onClick={() => removeTeam(i)} className="text-red-400 hover:text-red-600 text-sm px-2">
                    削除
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={addTeam}
              className="text-sm text-indigo-600 hover:text-indigo-800"
            >
              + チームを追加
            </button>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">参加者のチーム</label>
            {selectedUserIds.map((uid) => {
              const u = users.find((x) => x.id === uid);
              return (
                <div key={uid} className="flex items-center gap-3">
                  <span className="text-sm text-gray-700 w-28 truncate">{u?.name}</span>
                  <select
                    value={teamAssignments[uid] ?? ''}
                    onChange={(e) => assignTeam(uid, parseInt(e.target.value))}
                    className="flex-1 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">-- 選択 --</option>
                    {teams.map((t, i) => (
                      <option key={i} value={i}>{t.name}</option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setStep(2)}
              className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              ← 戻る
            </button>
            <button
              onClick={handleStep3Submit}
              className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
            >
              次へ →
            </button>
          </div>
        </div>
      )}

      {/* ── Step 4: Confirmation ── */}
      {step === 4 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">確認</h2>
          <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">タイトル</span>
              <span className="font-medium text-gray-800">{step1.title}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">期間</span>
              <span className="font-medium text-gray-800">{step1.startDate} 〜 {step1.endDate}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">種別</span>
              <span className="font-medium text-gray-800">
                {step1.type === 'individual' ? '個人戦' : 'チーム戦'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">ステータス</span>
              <span className="font-medium text-gray-800">{step1.status}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">参加者数</span>
              <span className="font-medium text-gray-800">{selectedUserIds.length} 人</span>
            </div>
            {step1.type === 'team' && (
              <div className="flex justify-between">
                <span className="text-gray-500">チーム数</span>
                <span className="font-medium text-gray-800">{teams.length} チーム</span>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setStep(step1.type === 'team' ? 3 : 2)}
              className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              disabled={saving}
            >
              ← 戻る
            </button>
            <button
              onClick={handleCreate}
              disabled={saving}
              className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium disabled:bg-gray-300"
            >
              {saving ? '作成中…' : 'イベントを作成'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
