'use client';

import { useState } from 'react';
import { AppUser, StepEntry } from '@/lib/types';
import { adminUpdateStep, getStep } from '@/lib/firebase/firestore';
import { getDateRange, displayDate } from '@/lib/utils/date';

interface Props {
  eventId: string;
  participants: AppUser[];
  startDate: string;
  endDate: string;
  onUpdated: () => void;
}

export default function DataCorrection({
  eventId,
  participants,
  startDate,
  endDate,
  onUpdated,
}: Props) {
  const dates = getDateRange(startDate, endDate);

  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [newSteps, setNewSteps] = useState('');
  const [existingEntry, setExistingEntry] = useState<StepEntry | null>(null);
  const [loadingEntry, setLoadingEntry] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleUserDateChange = async (userId: string, date: string) => {
    setSelectedUserId(userId);
    setSelectedDate(date);
    setNewSteps('');
    setExistingEntry(null);
    setError('');
    setSuccess('');

    if (!userId || !date) return;

    setLoadingEntry(true);
    try {
      const entry = await getStep(userId, eventId, date);
      setExistingEntry(entry);
      if (entry) setNewSteps(String(entry.steps));
    } catch {
      setError('データ取得に失敗しました');
    } finally {
      setLoadingEntry(false);
    }
  };

  const handleSave = async () => {
    const val = parseInt(newSteps, 10);
    if (isNaN(val) || val < 0 || val >= 100000) {
      setError('0〜99999の整数を入力してください');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await adminUpdateStep(selectedUserId, eventId, selectedDate, val);
      setSuccess('更新しました');
      setShowConfirm(false);
      onUpdated();
    } catch (err: unknown) {
      setError('更新に失敗しました: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setSaving(false);
    }
  };

  const selectedUser = participants.find((u) => u.id === selectedUserId);

  return (
    <div className="space-y-5">
      <h3 className="font-semibold text-gray-800">データ修正</h3>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">ユーザーを選択</label>
          <select
            value={selectedUserId}
            onChange={(e) => handleUserDateChange(e.target.value, selectedDate)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">-- 選択 --</option>
            {participants.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">日付を選択</label>
          <select
            value={selectedDate}
            onChange={(e) => handleUserDateChange(selectedUserId, e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            disabled={!selectedUserId}
          >
            <option value="">-- 選択 --</option>
            {dates.map((d) => (
              <option key={d} value={d}>{displayDate(d)}</option>
            ))}
          </select>
        </div>
      </div>

      {loadingEntry && (
        <p className="text-sm text-gray-400">読み込み中…</p>
      )}

      {selectedUserId && selectedDate && !loadingEntry && (
        <div className="bg-gray-50 rounded-xl p-4 space-y-4">
          <div className="text-sm text-gray-600">
            <span className="font-medium">{selectedUser?.name}</span> ／ {displayDate(selectedDate)}
            {existingEntry ? (
              <span className="ml-2 text-green-600">（提出済み：{existingEntry.steps.toLocaleString()} 歩）</span>
            ) : (
              <span className="ml-2 text-yellow-600">（未提出）</span>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">修正後の歩数</label>
            <input
              type="number"
              min={0}
              max={99999}
              value={newSteps}
              onChange={(e) => setNewSteps(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="例：7500"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {success && <p className="text-sm text-green-600">{success}</p>}

          <button
            onClick={() => { setShowConfirm(true); setError(''); setSuccess(''); }}
            disabled={!newSteps}
            className="w-full py-2.5 bg-amber-500 text-white rounded-lg hover:bg-amber-600 font-medium disabled:bg-gray-300"
          >
            修正する
          </button>
        </div>
      )}

      {/* Confirmation dialog */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full space-y-4">
            <h3 className="font-semibold text-gray-800">修正を確認</h3>
            <p className="text-sm text-gray-600">
              <strong>{selectedUser?.name}</strong> の {displayDate(selectedDate)} の歩数を{' '}
              <strong>{parseInt(newSteps).toLocaleString()} 歩</strong> に修正します。よろしいですか？
            </p>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                disabled={saving}
                className="flex-1 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                キャンセル
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:bg-gray-300 font-medium"
              >
                {saving ? '更新中…' : '確定'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
