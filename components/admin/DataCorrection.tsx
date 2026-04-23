'use client';

import { useState, useEffect } from 'react';
import { AppUser } from '@/lib/types';
import { adminUpdateStep, getStep } from '@/lib/firebase/firestore';
import { getDateRange } from '@/lib/utils/date';

interface Props {
  eventId: string;
  participants: AppUser[];
  startDate: string;
  endDate: string;
  onUpdated: () => void;
}

interface DayState {
  value: string;       // current input value
  submitted: boolean;  // has a Firestore entry
  saving: boolean;
  error: string;
  saved: boolean;      // flash after save
}

function shortDate(d: string) {
  const [, m, day] = d.split('-').map(Number);
  return `${m}/${day}`;
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
  const [loading, setLoading] = useState(false);
  const [days, setDays] = useState<Record<string, DayState>>({});

  const loadUser = async (userId: string) => {
    if (!userId) { setDays({}); return; }
    setLoading(true);
    try {
      const entries = await Promise.all(dates.map((d) => getStep(userId, eventId, d)));
      const next: Record<string, DayState> = {};
      dates.forEach((d, i) => {
        next[d] = {
          value: entries[i] ? String(entries[i]!.steps) : '',
          submitted: !!entries[i],
          saving: false,
          error: '',
          saved: false,
        };
      });
      setDays(next);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUser(selectedUserId); }, [selectedUserId]);

  const update = (date: string, patch: Partial<DayState>) =>
    setDays((prev) => ({ ...prev, [date]: { ...prev[date], ...patch } }));

  const handleBlur = async (date: string) => {
    const day = days[date];
    if (!day || !selectedUserId) return;
    const raw = day.value.trim();
    if (raw === '') return; // don't save empty on blur
    const val = parseInt(raw, 10);
    if (isNaN(val) || val < 0 || val >= 100000) {
      update(date, { error: '0〜99999の整数' });
      return;
    }
    update(date, { saving: true, error: '' });
    try {
      await adminUpdateStep(selectedUserId, eventId, date, val);
      update(date, { saving: false, submitted: true, saved: true });
      setTimeout(() => update(date, { saved: false }), 1500);
      onUpdated();
    } catch {
      update(date, { saving: false, error: '保存失敗' });
    }
  };

  return (
    <div className="space-y-5">
      <h3 className="font-semibold text-gray-800">データ修正</h3>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">ユーザーを選択</label>
        <select
          value={selectedUserId}
          onChange={(e) => setSelectedUserId(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">-- 選択 --</option>
          {participants.map((u) => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>
      </div>

      {loading && (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-4 border-indigo-500 border-t-transparent" />
        </div>
      )}

      {!loading && selectedUserId && dates.length > 0 && (
        <div className="space-y-2">
          {dates.map((date) => {
            const day = days[date];
            if (!day) return null;
            const missing = !day.submitted && day.value === '';
            return (
              <div key={date} className="flex items-center gap-3">
                <span className="text-sm text-gray-600 w-12 shrink-0 font-medium">
                  {shortDate(date)}
                </span>
                {missing ? (
                  <span className="text-red-500 text-base shrink-0" title="未入力">⚠️</span>
                ) : (
                  <span className="w-5 shrink-0" />
                )}
                <div className="flex items-center gap-2 flex-1">
                  <input
                    type="number"
                    min={0}
                    max={99999}
                    value={day.value}
                    onChange={(e) => update(date, { value: e.target.value, error: '', saved: false })}
                    onBlur={() => handleBlur(date)}
                    placeholder="未入力"
                    className={`w-32 border rounded-lg px-3 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      day.error ? 'border-red-400' : missing ? 'border-yellow-300 bg-yellow-50' : 'border-gray-300'
                    }`}
                  />
                  {day.saving && <span className="text-xs text-gray-400">保存中…</span>}
                  {day.saved && <span className="text-xs text-green-500">✓</span>}
                  {day.error && <span className="text-xs text-red-500">{day.error}</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && selectedUserId && dates.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-6">対象日がありません</p>
      )}
    </div>
  );
}
