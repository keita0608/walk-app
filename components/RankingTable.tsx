'use client';

import { RankingEntry } from '@/lib/types';
import { formatSteps } from '@/lib/utils/ranking';

interface Props {
  entries: RankingEntry[];
}

export default function RankingTable({ entries }: Props) {
  const maxAvg = Math.max(...entries.map((e) => e.averageSteps), 1);

  if (entries.length === 0) {
    return <p className="text-gray-500 text-sm text-center py-8">参加者がいません</p>;
  }

  return (
    <div className="space-y-3">
      {entries.map((entry, idx) => (
        <div key={entry.userId} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center gap-3 mb-2">
            {/* Rank badge */}
            <span
              className={
                idx === 0
                  ? 'text-yellow-500 font-bold text-lg w-7 text-center'
                  : idx === 1
                  ? 'text-gray-400 font-bold text-lg w-7 text-center'
                  : idx === 2
                  ? 'text-amber-600 font-bold text-lg w-7 text-center'
                  : 'text-gray-400 text-sm w-7 text-center'
              }
            >
              {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}`}
            </span>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-gray-800 truncate">{entry.name}</span>
                {entry.hasMissingData && (
                  <span title="未提出の日があります" className="text-yellow-500 text-sm">⚠️</span>
                )}
              </div>
              <span className="text-xs text-gray-400">
                合計 {formatSteps(entry.totalSteps)} 歩 / {entry.submittedDays}日提出
              </span>
            </div>

            <div className="text-right shrink-0">
              <span className="text-lg font-bold text-indigo-600">
                {formatSteps(entry.averageSteps)}
              </span>
              <span className="text-xs text-gray-400 ml-1">歩/日</span>
            </div>
          </div>

          {/* Bar chart */}
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div
              className="bg-indigo-500 h-2 rounded-full transition-all duration-500"
              style={{
                width: `${maxAvg > 0 ? (entry.averageSteps / maxAvg) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
      ))}

      <p className="text-xs text-gray-400 text-center pt-1">
        ⚠️ = 未提出日あり（0歩として計算）
      </p>
    </div>
  );
}
