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
  value: string;
  submitted: boolean; // has existing Firestore entry
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
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  const loadUser = async (userId: string) => {
    if (!userId) { setDays({}); setDirty(new Set()); return; }
    setLoading(true);
    setSaveError('');
    setSaveSuccess(false);
    try {
      const entries = await Promise.all(dates.map((d) => getStep(userId, eventId, d)));
      const next: Record<string, DayState> = {};
      dates.forEach((d, i) => {
        next[d] = {
          value: entries[i] ? String(entries[i]!.steps) : '',
          submitted: !!entries[i],
        };
      });
      setDays(next);
      setDirty(new Set());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUser(selectedUserId); }, [selectedUserId]);

  const handleChange = (date: string, value: string) => {
    setDays((prev) => ({ ...prev, [date]: { ...prev[date], value } }));
    setDirty((prev) => new Set(prev).add(date));
    setSaveSuccess(false);
  };

  const handleSave = async () => {
    const toSave = Array.from(dirty).filter((d) => days[d]?.value.trim() !== '');
    const invalid = toSave.find((d) => {
      const v = parseInt(days[d].value, 10);
      return isNaN(v) || v < 0 || v >= 100000;
    });
    if (invalid) {
      setSaveError(`${shortDate(invalid)}: 0〜99999の整数を入力してください`);
      return;
    }
    setSaving(true);
    setSaveError('');
    try {
      await Promise.all(
        toSave.map((d) =>
          adminUpdateStep(selectedUserId, eventId, d, parseInt(days[d].value, 10)),
        ),
      );
      setDirty(new Set());
      setSaveSuccess(true);
      onUpdated();
      // Reload to reflect submitted status
      await loadUser(selectedUserId);
    } catch (err: unknown) {
      setSaveError('保存に失敗しました: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setSaving(false);
    }
  };

  const hasDirty = dirty.size > 0;

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
        <>
          <div className="space-y-2">
            {dates.map((date) => {
              const day = days[date];
              if (!day) return null;
              const missing = !day.submitted && day.value === '';
              const isDirty = dirty.has(date);
              return (
                <div key={date} className="flex items-center gap-3">
                  <span className="text-sm text-gray-600 w-12 shrink-0 font-medium">{shortDate(date)}</span>
                  {missing ? (
                    <span className="text-base shrink-0" title="未入力">⚠️</span>
                  ) : (
                    <span className="w-5 shrink-0" />
                  )}
                  <input
                    type="number"
                    min={0}
                    max={99999}
                    value={day.value}
                    onChange={(e) => handleChange(date, e.target.value)}
                    placeholder="未入力"
                    className={`w-32 border rounded-lg px-3 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      missing
                        ? 'border-yellow-300 bg-yellow-50'
                        : isDirty
                        ? 'border-indigo-400 bg-indigo-50'
                        : 'border-gray-300'
                    }`}
                  />
                </div>
              );
            })}
          </div>

          <div className="space-y-2 pt-1">
            {saveError && <p className="text-sm text-red-600">{saveError}</p>}
            {saveSuccess && <p className="text-sm text-green-600">保存しました</p>}
            <button
              onClick={handleSave}
              disabled={!hasDirty || saving}
              className="w-full py-2.5 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:bg-gray-300 font-medium text-sm"
            >
              {saving ? '保存中…' : `保存する${hasDirty ? ` (${dirty.size}件)` : ''}`}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
