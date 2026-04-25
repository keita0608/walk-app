'use client';

import { useState } from 'react';
import { adminUpdateStep, getStep } from '@/lib/firebase/firestore';
import { getDateRange, getYesterdayJST } from '@/lib/utils/date';

interface Props {
  userId: string;
  onClose: () => void;
}

function nDaysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

function shortDate(d: string) {
  const [, m, day] = d.split('-').map(Number);
  return `${m}/${day}`;
}

export default function UserDataCorrection({ userId, onClose }: Props) {
  const [startDate, setStartDate] = useState(nDaysAgo(29));
  const [endDate, setEndDate]     = useState(getYesterdayJST());
  const [loaded, setLoaded]       = useState(false);
  const [loading, setLoading]     = useState(false);
  const [days, setDays]           = useState<Record<string, { value: string; submitted: boolean }>>({});
  const [dirty, setDirty]         = useState<Set<string>>(new Set());
  const [saving, setSaving]       = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  const dates = getDateRange(startDate, endDate);

  const loadDates = async () => {
    if (!startDate || !endDate || startDate > endDate) return;
    setLoading(true);
    setLoaded(false);
    setSaveError('');
    setSaveSuccess(false);
    try {
      const entries = await Promise.all(dates.map((d) => getStep(userId, d)));
      const next: Record<string, { value: string; submitted: boolean }> = {};
      dates.forEach((d, i) => {
        next[d] = { value: entries[i] ? String(entries[i]!.steps) : '', submitted: !!entries[i] };
      });
      setDays(next);
      setDirty(new Set());
      setLoaded(true);
    } finally {
      setLoading(false);
    }
  };

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
    if (invalid) { setSaveError(`${shortDate(invalid)}: 0〜99999の整数を入力してください`); return; }
    setSaving(true);
    setSaveError('');
    try {
      await Promise.all(toSave.map((d) => adminUpdateStep(userId, d, parseInt(days[d].value, 10))));
      setDirty(new Set());
      setSaveSuccess(true);
      await loadDates();
    } catch (err) {
      setSaveError('保存に失敗しました: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 pt-3 border-t border-gray-100 mt-3">
      <p className="text-xs font-medium text-gray-600">データ修正</p>

      {/* Date range */}
      <div className="flex items-center gap-2 flex-wrap">
        <input
          type="date" value={startDate}
          onChange={(e) => { setStartDate(e.target.value); setLoaded(false); }}
          className="border border-gray-300 rounded-lg px-2 py-1 text-sm"
        />
        <span className="text-gray-400 text-sm">〜</span>
        <input
          type="date" value={endDate}
          onChange={(e) => { setEndDate(e.target.value); setLoaded(false); }}
          className="border border-gray-300 rounded-lg px-2 py-1 text-sm"
        />
        <button
          onClick={loadDates}
          className="px-3 py-1 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700"
        >
          読み込む
        </button>
      </div>

      {loading && (
        <div className="flex justify-center py-4">
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-indigo-500 border-t-transparent" />
        </div>
      )}

      {loaded && !loading && (
        <>
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {dates.map((date) => {
              const day = days[date];
              if (!day) return null;
              const isDirty = dirty.has(date);
              return (
                <div key={date} className="flex items-center gap-3">
                  <span className="text-sm text-gray-600 w-12 shrink-0">{shortDate(date)}</span>
                  <span className="w-4 shrink-0 text-sm">
                    {!day.submitted && day.value === '' ? '⚠️' : day.submitted ? '✅' : ''}
                  </span>
                  <input
                    type="number" min={0} max={99999}
                    value={day.value}
                    onChange={(e) => handleChange(date, e.target.value)}
                    placeholder="未入力"
                    className={`w-28 border rounded-lg px-3 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      isDirty ? 'border-indigo-400 bg-indigo-50' : 'border-gray-300'
                    }`}
                  />
                </div>
              );
            })}
          </div>

          {saveError && <p className="text-sm text-red-600">{saveError}</p>}
          {saveSuccess && <p className="text-sm text-green-600">保存しました</p>}

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50"
            >
              閉じる
            </button>
            <button
              onClick={handleSave}
              disabled={dirty.size === 0 || saving}
              className="flex-1 py-2 bg-amber-500 text-white rounded-lg text-sm hover:bg-amber-600 disabled:bg-gray-300 font-medium"
            >
              {saving ? '保存中…' : `保存${dirty.size > 0 ? `（${dirty.size}件）` : ''}`}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
