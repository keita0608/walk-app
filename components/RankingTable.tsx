'use client';

import { useState } from 'react';
import { RankingEntry } from '@/lib/types';
import { formatSteps } from '@/lib/utils/ranking';

// Gradient palette harmonised with base indigo #5A45E2
// Flows from royal blue → blue-indigo → indigo → purple → dusty purple → mauve
export const DOW_COLORS = [
  '#3055C8', // 0 日 (Sun)  – deep royal blue
  '#4548DC', // 1 月 (Mon)  – blue-indigo
  '#5A45E2', // 2 火 (Tue)  – base indigo
  '#7248DC', // 3 水 (Wed)  – indigo-purple
  '#8E58D4', // 4 木 (Thu)  – medium purple
  '#A870C8', // 5 金 (Fri)  – dusty purple
  '#BE90BC', // 6 土 (Sat)  – muted mauve
];

const DOW_LABELS = ['日', '月', '火', '水', '木', '金', '土'];

interface Props {
  entries: RankingEntry[];
}

type View = 'gross' | 'net' | 'chart';

export default function RankingTable({ entries }: Props) {
  const hasHandicap = entries.some((e) => e.handicapMultiplier > 1);
  const [view, setView] = useState<View>('gross');

  const displayEntries = [...entries].sort((a, b) =>
    view === 'net'
      ? b.netAverageSteps - a.netAverageSteps
      : b.averageSteps - a.averageSteps,
  );

  const maxVal = Math.max(
    ...displayEntries.map((e) => view === 'net' ? e.netAverageSteps : e.averageSteps),
    ...displayEntries.map((e) => e.targetSteps ?? 0),
    1,
  );

  // Chart: sorted by total steps descending
  const chartEntries = [...entries].sort((a, b) => b.totalSteps - a.totalSteps);
  const maxTotal = Math.max(...chartEntries.map((e) => e.totalSteps), 1);

  if (entries.length === 0) {
    return <p className="text-gray-500 text-sm text-center py-8">参加者がいません</p>;
  }

  const btnClass = (v: View) =>
    `px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
      view === v
        ? 'bg-indigo-600 text-white'
        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
    }`;

  return (
    <div className="space-y-3">
      {/* View toggle */}
      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={() => setView('gross')} className={btnClass('gross')}>グロス</button>
        {hasHandicap && (
          <button onClick={() => setView('net')} className={btnClass('net')}>ネット（ハンデ適用）</button>
        )}
        <button onClick={() => setView('chart')} className={btnClass('chart')}>累計グラフ</button>
      </div>

      {/* ── Gross / Net ranking ── */}
      {view !== 'chart' && displayEntries.map((entry, idx) => {
        const displaySteps = view === 'net' ? entry.netAverageSteps : entry.averageSteps;
        const barPct = maxVal > 0 ? (displaySteps / maxVal) * 100 : 0;
        const targetPct = entry.targetSteps !== undefined
          ? Math.min((entry.targetSteps / maxVal) * 100, 100)
          : null;

        return (
          <div key={entry.userId} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center gap-3 mb-2">
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
                  {entry.handicapMultiplier > 1 && view === 'net' && (
                    <span className="text-xs px-1.5 py-0.5 bg-pink-100 text-pink-600 rounded">
                      ×{entry.handicapMultiplier}
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

      {/* ── Cumulative stacked bar chart ── */}
      {view === 'chart' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-4">
          {/* Legend */}
          <div className="flex flex-wrap gap-3">
            {DOW_LABELS.map((label, i) => (
              <div key={i} className="flex items-center gap-1">
                <span
                  className="inline-block w-3 h-3 rounded-sm shrink-0"
                  style={{ backgroundColor: DOW_COLORS[i] }}
                />
                <span className="text-xs text-gray-500">{label}曜</span>
              </div>
            ))}
          </div>

          {/* Bars: one row per participant, each day = one segment */}
          <div className="space-y-3">
            {chartEntries.map((entry) => (
              <div key={entry.userId}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-gray-700 w-24 truncate shrink-0">
                    {entry.name}
                  </span>
                  <span className="text-xs text-gray-400">
                    {formatSteps(entry.totalSteps)} 歩
                  </span>
                </div>
                <div className="flex h-5 rounded-full overflow-hidden bg-gray-100">
                  {entry.dailySteps.map((day) => {
                    const pct = (day.steps / maxTotal) * 100;
                    return (
                      <div
                        key={day.date}
                        style={{ width: `${pct}%`, backgroundColor: DOW_COLORS[day.dow] }}
                        title={`${day.date}（${DOW_LABELS[day.dow]}）: ${formatSteps(day.steps)} 歩`}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-gray-400 text-center pt-1">
        ⚠️ = 未提出日あり（0歩として計算）
      </p>
    </div>
  );
}
