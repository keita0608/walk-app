'use client';

import { useState } from 'react';
import { RankingEntry } from '@/lib/types';
import { formatSteps } from '@/lib/utils/ranking';

interface Props {
  entries: RankingEntry[];
  handicapMultiplier?: number;
}

export default function RankingTable({ entries, handicapMultiplier = 1 }: Props) {
  const hasHandicap = handicapMultiplier > 1 &&
    entries.some((e) => e.gender === 'female');

  const [showNet, setShowNet] = useState(false);

  const displayEntries = [...entries].sort((a, b) =>
    showNet
      ? b.netAverageSteps - a.netAverageSteps
      : b.averageSteps - a.averageSteps,
  );

  const maxVal = Math.max(
    ...displayEntries.map((e) => showNet ? e.netAverageSteps : e.averageSteps),
    ...displayEntries.map((e) => e.targetSteps ?? 0),
    1,
  );

  if (entries.length === 0) {
    return <p className="text-gray-500 text-sm text-center py-8">参加者がいません</p>;
  }

  return (
    <div className="space-y-3">
      {/* Gross / Net toggle */}
      {hasHandicap && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowNet(false)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              !showNet
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            グロス
          </button>
          <button
            onClick={() => setShowNet(true)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              showNet
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            ネット（ハンデ適用）
          </button>
          <span className="text-xs text-gray-400">ハンデ係数 ×{handicapMultiplier}（女性）</span>
        </div>
      )}

      {displayEntries.map((entry, idx) => {
        const displaySteps = showNet ? entry.netAverageSteps : entry.averageSteps;
        const barPct = maxVal > 0 ? (displaySteps / maxVal) * 100 : 0;
        const targetPct = entry.targetSteps !== undefined
          ? Math.min((entry.targetSteps / maxVal) * 100, 100)
          : null;

        return (
          <div key={entry.userId} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center gap-3 mb-2">
              {/* Rank badge */}
              <span className={
                idx === 0 ? 'text-yellow-500 font-bold text-lg w-7 text-center' :
                idx === 1 ? 'text-gray-400 font-bold text-lg w-7 text-center' :
                idx === 2 ? 'text-amber-600 font-bold text-lg w-7 text-center' :
                'text-gray-400 text-sm w-7 text-center'
              }>
                {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}`}
              </span>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-semibold text-gray-800 truncate">{entry.name}</span>
                  {entry.gender === 'female' && showNet && (
                    <span className="text-xs px-1.5 py-0.5 bg-pink-100 text-pink-600 rounded">
                      ×{handicapMultiplier}
                    </span>
                  )}
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
                  {formatSteps(displaySteps)}
                </span>
                <span className="text-xs text-gray-400 ml-1">歩/日</span>
              </div>
            </div>

            {/* Bar chart with optional target line */}
            <div className="relative w-full bg-gray-100 rounded-full h-3">
              <div
                className="bg-indigo-500 h-3 rounded-full transition-all duration-500"
                style={{ width: `${barPct}%` }}
              />
              {targetPct !== null && (
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-0.5 h-5 bg-red-500"
                  style={{ left: `${targetPct}%` }}
                  title={`目標: ${formatSteps(entry.targetSteps!)} 歩`}
                />
              )}
            </div>
            {entry.targetSteps !== undefined && (
              <p className="text-xs text-red-400 mt-1 text-right">
                目標 {formatSteps(entry.targetSteps)} 歩
              </p>
            )}
          </div>
        );
      })}

      <p className="text-xs text-gray-400 text-center pt-1">
        ⚠️ = 未提出日あり（0歩として計算）
      </p>
    </div>
  );
}
