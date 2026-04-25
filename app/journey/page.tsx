'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import AuthGuard from '@/components/AuthGuard';
import { getStepsByUser } from '@/lib/firebase/firestore';
import { computePosition, stepsToKm, JourneyPosition } from '@/lib/utils/journey';
import { TOKAIDO } from '@/lib/data/routes';

function fmt(km: number) {
  return km.toFixed(1);
}

export default function JourneyPage() {
  const { user } = useAuth();
  const [position, setPosition] = useState<JourneyPosition | null>(null);
  const [totalSteps, setTotalSteps] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    getStepsByUser(user.id).then((steps) => {
      const sum = steps.reduce((acc, s) => acc + s.steps, 0);
      setTotalSteps(sum);
      setPosition(computePosition(stepsToKm(sum), TOKAIDO));
    }).finally(() => setLoading(false));
  }, [user]);

  const route = TOKAIDO;
  const routeKm = route.stations[route.stations.length - 1].km;

  return (
    <AuthGuard>
      <div className="space-y-5">
        <Link href="/" className="text-sm text-indigo-600 hover:text-indigo-800">
          ← ホームに戻る
        </Link>

        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-800">どこまでいける？</h1>
          <span className="text-xs text-gray-400">{route.name}</span>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-indigo-500 border-t-transparent" />
          </div>
        ) : position ? (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
                <p className="text-2xl font-bold text-indigo-600 font-mono">{fmt(position.totalKm)}</p>
                <p className="text-xs text-gray-400 mt-1">累計 km</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
                <p className="text-2xl font-bold text-gray-700 font-mono">{totalSteps.toLocaleString()}</p>
                <p className="text-xs text-gray-400 mt-1">累計 歩</p>
              </div>
            </div>

            {/* Current position card */}
            <div className="bg-indigo-50 rounded-xl border border-indigo-100 p-4 space-y-1">
              {position.completed ? (
                <>
                  <p className="text-sm font-bold text-indigo-700">🎉 新大阪に到着！</p>
                  <p className="text-xs text-indigo-500">東海道新幹線 {fmt(routeKm)} km を完走しました</p>
                </>
              ) : (
                <>
                  <p className="text-sm font-bold text-indigo-700">
                    現在地：{position.prevStation.name} 〜 {position.nextStation?.name}
                  </p>
                  <p className="text-xs text-indigo-500">
                    {position.prevStation.name}から {fmt(position.kmFromPrev)} km ／ 次の{position.nextStation?.name}まで あと {fmt(position.kmToNext!)} km
                  </p>
                </>
              )}
            </div>

            {/* Route visualization */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <div className="relative">
                {/* Track */}
                <div className="relative h-2 bg-gray-200 rounded-full mx-3 my-6">
                  {/* Progress */}
                  <div
                    className="absolute left-0 top-0 h-2 bg-indigo-500 rounded-full transition-all duration-700"
                    style={{ width: `${Math.min(position.pct, 100)}%` }}
                  />

                  {/* Station dots */}
                  {route.stations.map((s) => {
                    const pct = (s.km / routeKm) * 100;
                    const passed = s.km <= position.totalKm;
                    return (
                      <div
                        key={s.name}
                        className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full border-2 ${
                          passed ? 'bg-indigo-500 border-indigo-500' : 'bg-white border-gray-400'
                        }`}
                        style={{ left: `${pct}%` }}
                      />
                    );
                  })}

                  {/* Shinkansen marker */}
                  {!position.completed && (
                    <div
                      className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 text-lg leading-none"
                      style={{ left: `${position.pct}%` }}
                    >
                      🚅
                    </div>
                  )}
                </div>

                {/* Station labels — show only key ones to avoid crowding */}
                <div className="relative h-6">
                  {[route.stations[0], route.stations[route.stations.length - 1]].map((s) => {
                    const pct = (s.km / routeKm) * 100;
                    return (
                      <span
                        key={s.name}
                        className="absolute text-xs text-gray-500 -translate-x-1/2"
                        style={{ left: `${pct}%` }}
                      >
                        {s.name}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Station list */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50">
              {route.stations.map((s, i) => {
                const passed = s.km < position.totalKm;
                const current = !position.completed &&
                  position.prevStation.name === s.name &&
                  s.km < position.totalKm + 0.001;
                const next = position.nextStation?.name === s.name;
                return (
                  <div key={s.name} className={`flex items-center gap-3 px-4 py-3 ${passed ? 'opacity-40' : ''}`}>
                    <span className="text-base w-5 text-center shrink-0">
                      {position.completed && i === route.stations.length - 1 ? '🎉'
                        : current ? '🚅'
                        : next ? '⬜'
                        : passed ? '✅'
                        : '◯'}
                    </span>
                    <span className={`text-sm flex-1 ${current ? 'font-bold text-indigo-700' : next ? 'font-medium text-gray-700' : 'text-gray-500'}`}>
                      {s.name}
                    </span>
                    <span className="text-xs text-gray-400 font-mono">{fmt(s.km)} km</span>
                  </div>
                );
              })}
            </div>

            <Link
              href="/steps"
              className="block text-center text-sm px-4 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700"
            >
              歩数を入力する
            </Link>
          </>
        ) : null}
      </div>
    </AuthGuard>
  );
}
