'use client';

import { useState } from 'react';
import { RankingEntry } from '@/lib/types';
import { formatSteps } from '@/lib/utils/ranking';
import ShinkansenMap from '@/components/ShinkansenMap';

// Earthy warm-to-cool gradient: rust → sand → sage → teal
export const DOW_COLORS = [
  '#c7522a', // 0 日 (Sun)  – terracotta
  '#e5c185', // 1 月 (Mon)  – warm sand
  '#f0daa5', // 2 火 (Tue)  – light cream
  '#b8cdab', // 3 水 (Wed)  – sage green
  '#74a892', // 4 木 (Thu)  – muted teal
  '#008585', // 5 金 (Fri)  – deep teal
  '#004343', // 6 土 (Sat)  – dark teal
];

const DOW_LABELS = ['日', '月', '火', '水', '木', '金', '土'];

function shortDate(d: string) {
  const [, m, day] = d.split('-').map(Number);
  return `${m}/${day}`;
}

interface Props {
  entries: RankingEntry[];
  currentUserId?: string;
}

type View = 'gross' | 'net' | 'chart' | 'map';

function stepsToKm(steps: number) {
  return steps * 0.7 / 1000;
}

interface TooltipInfo {
  name: string;
  date: string;
  steps: number;
  dow: number;
}

export default function RankingTable({ entries, currentUserId }: Props) {
  const hasHandicap = entries.some((e) => e.handicapMultiplier > 1);
  const [view, setView] = useState<View>('gross');
  const [tooltip, setTooltip] = useState<TooltipInfo | null>(null);
  const defaultMapUser = currentUserId && entries.find(e => e.userId === currentUserId)
    ? currentUserId
    : entries[0]?.userId ?? '';
  const [mapUserId, setMapUserId] = useState<string>(defaultMapUser);

  const displayEntries = [...entries].sort((a, b) => {
    const diff = view === 'net'
      ? b.netAverageSteps - a.netAverageSteps
      : b.averageSteps - a.averageSteps;
    return diff !== 0 ? diff : a.name.localeCompare(b.name);
  });

  const maxVal = Math.max(
    ...displayEntries.map((e) => view === 'net' ? e.netAverageSteps : e.averageSteps),
    ...displayEntries.map((e) => {
      if (e.targetSteps === undefined) return 0;
      return view === 'net' ? Math.floor(e.targetSteps * e.handicapMultiplier) : e.targetSteps;
    }),
    1,
  );

  const chartEntries = [...entries].sort((a, b) =>
    b.totalSteps - a.totalSteps || a.name.localeCompare(b.name),
  );
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
      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={() => setView('gross')} className={btnClass('gross')}>グロス</button>
        {hasHandicap && (
          <button onClick={() => setView('net')} className={btnClass('net')}>ネット（ハンデ適用）</button>
        )}
        <button onClick={() => { setView('chart'); setTooltip(null); }} className={btnClass('chart')}>累計グラフ</button>
        <button onClick={() => { setView('map'); setTooltip(null); }} className={btnClass('map')}>どこまでいける？</button>
      </div>

      {/* ── Gross / Net ranking ── */}
      {view !== 'chart' && view !== 'map' && displayEntries.map((entry, idx) => {
        const displaySteps = view === 'net' ? entry.netAverageSteps : entry.averageSteps;
        // When showing net, scale target by the same handicap multiplier
        const effectiveTarget = entry.targetSteps !== undefined
          ? (view === 'net' ? Math.floor(entry.targetSteps * entry.handicapMultiplier) : entry.targetSteps)
          : undefined;
        const barPct = maxVal > 0 ? (displaySteps / maxVal) * 100 : 0;
        const targetPct = effectiveTarget !== undefined
          ? Math.min((effectiveTarget / maxVal) * 100, 100)
          : null;
        const achieved = effectiveTarget === undefined || displaySteps >= effectiveTarget;

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
                  <span
                    className="font-semibold truncate"
                    style={{
                      color: entry.gender === 'male' ? '#3B6FD4'
                           : entry.gender === 'female' ? '#C0588A'
                           : '#1F2937',
                    }}
                  >{entry.name}</span>
                  {entry.handicapMultiplier > 1 && view === 'net' && (
                    <span className="text-xs px-1.5 py-0.5 bg-pink-100 text-pink-600 rounded">
                      ×{entry.handicapMultiplier}
                    </span>
                  )}
                  {entry.hasMissingData && (
                    <span title="未提出の日があります" className="text-yellow-500 text-sm">⚠️</span>
                  )}
                </div>
                <span className="text-xs text-gray-400 font-mono">
                  合計 {formatSteps(entry.totalSteps)} 歩（{stepsToKm(entry.totalSteps).toFixed(1)} km） / {entry.submittedDays}日提出
                </span>
              </div>
              <div className="text-right shrink-0">
                <span className="text-lg font-bold font-mono text-indigo-600">{formatSteps(displaySteps)}</span>
                <span className="text-xs text-gray-400 ml-1">歩/日</span>
              </div>
            </div>
            <div className="relative w-full bg-gray-100 rounded-full h-3">
              <div
                className={`${achieved ? 'bg-indigo-500' : 'bg-gray-400'} h-3 rounded-full transition-all duration-500`}
                style={{ width: `${barPct}%` }}
              />
              {targetPct !== null && (
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-0.5 h-5 bg-red-500"
                  style={{ left: `${targetPct}%` }}
                  title={`目標: ${formatSteps(effectiveTarget!)} 歩`}
                />
              )}
            </div>
            {effectiveTarget !== undefined && (
              <p className="text-xs text-red-400 mt-1 text-right font-mono">目標 {formatSteps(effectiveTarget)} 歩</p>
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
                <span className="inline-block w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: DOW_COLORS[i] }} />
                <span className="text-xs text-gray-500">{label}曜</span>
              </div>
            ))}
          </div>

          {/* Tooltip banner */}
          {tooltip && (
            <div className="flex items-center justify-between bg-gray-800 text-white rounded-lg px-3 py-2 text-sm">
              <span>
                <span className="font-medium">{tooltip.name}</span>
                <span className="text-gray-300 mx-1.5">·</span>
                <span>{shortDate(tooltip.date)}（{DOW_LABELS[tooltip.dow]}曜）</span>
                <span className="text-gray-300 mx-1.5">·</span>
                <span className="font-bold font-mono">{formatSteps(tooltip.steps)} 歩</span>
              </span>
              <button onClick={() => setTooltip(null)} className="ml-3 text-gray-400 hover:text-white text-base leading-none">✕</button>
            </div>
          )}

          {/* Bars */}
          <div className="space-y-3" onClick={() => setTooltip(null)}>
            {chartEntries.map((entry) => (
              <div key={entry.userId}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-gray-700 w-24 truncate shrink-0">{entry.name}</span>
                  <span className="text-xs text-gray-400 font-mono">{formatSteps(entry.totalSteps)} 歩</span>
                </div>
                {/* Outer track (gray bg, full width, rounded) */}
                <div className="relative h-6 w-full rounded-full overflow-hidden">
                  {/* Inner bar: only as wide as this participant's total — gives rounded right end */}
                  <div
                    className="flex h-6 rounded-full overflow-hidden absolute inset-y-0 left-0"
                    style={{ width: `${(entry.totalSteps / maxTotal) * 100}%` }}
                  >
                    {entry.dailySteps.map((day) => {
                      const pct = entry.totalSteps > 0 ? (day.steps / entry.totalSteps) * 100 : 0;
                      return (
                        <div
                          key={day.date}
                          style={{ width: `${pct}%`, backgroundColor: DOW_COLORS[day.dow] }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setTooltip({ name: entry.name, date: day.date, steps: day.steps, dow: day.dow });
                          }}
                          className="cursor-pointer hover:brightness-90 transition-[filter]"
                        />
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Map view ── */}
      {view === 'map' && (() => {
        const mapEntry = entries.find(e => e.userId === mapUserId) ?? entries[0];
        if (!mapEntry) return null;
        const distKm = stepsToKm(mapEntry.totalSteps);
        return (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600 shrink-0">ユーザー</label>
              <select
                value={mapUserId}
                onChange={e => setMapUserId(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {[...entries]
                  .sort((a, b) => a.name.localeCompare(b.name, 'ja'))
                  .map(e => (
                    <option key={e.userId} value={e.userId}>{e.name}</option>
                  ))}
              </select>
            </div>
            <ShinkansenMap distKm={distKm} userName={mapEntry.name} />
          </div>
        );
      })()}

      <p className="text-xs text-gray-400 text-center pt-1">⚠️ = 未提出日あり（0歩として計算）</p>
    </div>
  );
}
