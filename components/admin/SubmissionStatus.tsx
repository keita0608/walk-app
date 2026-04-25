'use client';

import { useState, useMemo } from 'react';
import { AppUser, StepEntry } from '@/lib/types';
import { getDateRange, getYesterdayJST } from '@/lib/utils/date';

interface Props {
  participants: AppUser[];
  steps: StepEntry[];
  startDate: string;
  endDate: string;
}

function formatTime(d?: Date): string {
  if (!d) return '';
  const jst = new Date(d.getTime() + 9 * 3600000);
  const h = String(jst.getUTCHours()).padStart(2, '0');
  const m = String(jst.getUTCMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

export default function SubmissionStatus({ participants, steps, startDate, endDate }: Props) {
  const dates = useMemo(() => {
    const yesterday = getYesterdayJST();
    const effectiveEnd = endDate < yesterday ? endDate : yesterday;
    return getDateRange(startDate, effectiveEnd).reverse();
  }, [startDate, endDate]);

  const [selectedDate, setSelectedDate] = useState<string>(dates[0] ?? '');
  const [masked, setMasked] = useState(false);

  const stepMap = useMemo(() => {
    const map: Record<string, StepEntry> = {};
    for (const s of steps) {
      if (s.date === selectedDate) map[s.userId] = s;
    }
    return map;
  }, [steps, selectedDate]);

  const submitted = participants.filter((u) => stepMap[u.id] !== undefined);

  if (dates.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-8">表示できるデータがありません</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <label className="text-sm text-gray-600 shrink-0">日付を選択</label>
        <select
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {dates.map((d) => {
            const [, m, day] = d.split('-').map(Number);
            return <option key={d} value={d}>{m}/{day}</option>;
          })}
        </select>
        <span className="text-xs text-gray-400">
          提出 {submitted.length} / {participants.length} 名
        </span>
        <button
          onClick={() => setMasked((v) => !v)}
          className={`ml-auto text-xs px-3 py-1.5 rounded-lg border transition-colors ${
            masked
              ? 'bg-gray-800 text-white border-gray-800'
              : 'bg-white text-gray-500 border-gray-300 hover:bg-gray-50'
          }`}
        >
          {masked ? '👁 数字を表示' : '🙈 数字を隠す'}
        </button>
      </div>

      <div className="space-y-2">
        {participants
          .slice()
          .sort((a, b) => a.name.localeCompare(b.name, 'ja'))
          .map((user) => {
            const entry = stepMap[user.id];
            const isSubmitted = entry !== undefined;
            const time = formatTime(entry?.updatedAt);
            return (
              <div
                key={user.id}
                className={`flex items-center justify-between px-4 py-3 rounded-xl border text-sm ${
                  isSubmitted ? 'bg-white border-gray-100' : 'bg-gray-50 border-gray-100'
                }`}
              >
                <span className={`font-medium ${isSubmitted ? 'text-gray-800' : 'text-gray-400'}`}>
                  {user.name}
                </span>
                {isSubmitted ? (
                  <div className="flex items-center gap-3">
                    {!masked && time && (
                      <span className="text-xs text-gray-400 font-mono">{time}</span>
                    )}
                    <span className="text-indigo-600 font-medium font-mono tabular-nums">
                      {masked ? '*' : `${entry.steps.toLocaleString()} 歩`}
                    </span>
                  </div>
                ) : (
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                    未提出
                  </span>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
}
