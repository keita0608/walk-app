'use client';

import { useState, useMemo } from 'react';
import { AppUser } from '@/lib/types';
import { StepEntry } from '@/lib/types';
import { getDateRange, getYesterdayJST } from '@/lib/utils/date';

interface Props {
  participants: AppUser[];
  steps: StepEntry[];
  startDate: string;
  endDate: string;
}

export default function SubmissionStatus({ participants, steps, startDate, endDate }: Props) {
  const dates = useMemo(() => {
    const yesterday = getYesterdayJST();
    const effectiveEnd = endDate < yesterday ? endDate : yesterday;
    return getDateRange(startDate, effectiveEnd).reverse();
  }, [startDate, endDate]);

  const [selectedDate, setSelectedDate] = useState<string>(dates[0] ?? '');

  const stepMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const s of steps) {
      if (s.date === selectedDate) map[s.userId] = s.steps;
    }
    return map;
  }, [steps, selectedDate]);

  const submitted = participants.filter((u) => stepMap[u.id] !== undefined);
  const notSubmitted = participants.filter((u) => stepMap[u.id] === undefined);

  if (dates.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-8">表示できるデータがありません</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
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
      </div>

      <div className="space-y-2">
        {participants
          .slice()
          .sort((a, b) => {
            const aSteps = stepMap[a.id];
            const bSteps = stepMap[b.id];
            if (aSteps !== undefined && bSteps !== undefined) return bSteps - aSteps;
            if (aSteps !== undefined) return -1;
            if (bSteps !== undefined) return 1;
            return a.name.localeCompare(b.name, 'ja');
          })
          .map((user) => {
            const steps = stepMap[user.id];
            const submitted = steps !== undefined;
            return (
              <div
                key={user.id}
                className={`flex items-center justify-between px-4 py-3 rounded-xl border text-sm ${
                  submitted
                    ? 'bg-white border-gray-100'
                    : 'bg-gray-50 border-gray-100'
                }`}
              >
                <span className={`font-medium ${submitted ? 'text-gray-800' : 'text-gray-400'}`}>
                  {user.name}
                </span>
                {submitted ? (
                  <span className="text-indigo-600 font-medium font-mono tabular-nums">
                    {steps.toLocaleString()} 歩
                  </span>
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
