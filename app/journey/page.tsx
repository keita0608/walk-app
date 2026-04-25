'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import AuthGuard from '@/components/AuthGuard';
import { getStepsByUser, setJourneyRoute } from '@/lib/firebase/firestore';
import { computePosition, stepsToKm, JourneyPosition } from '@/lib/utils/journey';
import { ROUTES, Route } from '@/lib/data/routes';

function fmt(km: number) { return km.toFixed(1); }

function FlippedTrain() {
  return <span style={{ display: 'inline-block', transform: 'scaleX(-1)' }}>🚅</span>;
}

export default function JourneyPage() {
  const { user } = useAuth();
  const [selectedRoute, setSelectedRoute] = useState<Route | null | undefined>(undefined);
  const [position, setPosition]           = useState<JourneyPosition | null>(null);
  const [totalSteps, setTotalSteps]       = useState(0);
  const [loading, setLoading]             = useState(true);
  const [selecting, setSelecting]         = useState(false);

  const loadJourney = async (route: Route) => {
    if (!user) return;
    setLoading(true);
    try {
      const steps = await getStepsByUser(user.id);
      const sum = steps.reduce((acc, s) => acc + s.steps, 0);
      setTotalSteps(sum);
      setPosition(computePosition(stepsToKm(sum), route));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    const route = ROUTES.find((r) => r.id === user.journeyRouteId) ?? null;
    setSelectedRoute(route);
    if (route) {
      loadJourney(route);
    } else {
      setLoading(false);
    }
  }, [user]);

  const handleSelectRoute = async (route: Route) => {
    if (!user) return;
    setSelecting(true);
    try {
      await setJourneyRoute(user.id, route.id);
      setSelectedRoute(route);
      await loadJourney(route);
    } finally {
      setSelecting(false);
    }
  };

  const isReady = selectedRoute !== undefined && !loading;

  return (
    <AuthGuard>
      <div className="space-y-5">
        <Link href="/" className="text-sm text-indigo-600 hover:text-indigo-800">
          ← ホームに戻る
        </Link>

        <h1 className="text-xl font-bold text-gray-800">どこまでいける？</h1>

        {!isReady ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-indigo-500 border-t-transparent" />
          </div>

        ) : !selectedRoute ? (
          /* ── Route selection ── */
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              ルートを選択してください。選択後はクリアするまで変更できません。
            </p>
            <div className="space-y-3">
              {ROUTES.map((route) => {
                const first = route.stations[0];
                const last  = route.stations[route.stations.length - 1];
                return (
                  <button
                    key={route.id}
                    onClick={() => handleSelectRoute(route)}
                    disabled={selecting}
                    className="w-full text-left bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:border-indigo-300 transition-colors disabled:opacity-50"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-800">{route.name}</p>
                        <p className="text-sm text-gray-400 mt-0.5">
                          {first.name} → {last.name}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-lg font-bold text-indigo-600">{fmt(last.km)} km</p>
                        <p className="text-xs text-gray-400">{route.stations.length}駅</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

        ) : position ? (
          /* ── Journey view ── */
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

            {/* Current position */}
            <div className="bg-indigo-50 rounded-xl border border-indigo-100 p-4 space-y-1">
              {position.completed ? (
                <>
                  <p className="text-sm font-bold text-indigo-700">
                    🎉 {selectedRoute.stations[selectedRoute.stations.length - 1].name}に到着！
                  </p>
                  <p className="text-xs text-indigo-500">
                    {selectedRoute.name} {fmt(position.routeKm)} km を完走しました
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm font-bold text-indigo-700">
                    現在地：{position.prevStation.name} 〜 {position.nextStation?.name}
                  </p>
                  <p className="text-xs text-indigo-500">
                    {position.prevStation.name}から {fmt(position.kmFromPrev)} km ／{' '}
                    次の{position.nextStation?.name}まで あと {fmt(position.kmToNext!)} km
                  </p>
                </>
              )}
            </div>

            {/* Route track */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <div className="relative">
                <div className="relative h-2 bg-gray-200 rounded-full mx-3 my-6">
                  {/* Progress fill */}
                  <div
                    className="absolute left-0 top-0 h-2 bg-indigo-500 rounded-full transition-all duration-700"
                    style={{ width: `${Math.min(position.pct, 100)}%` }}
                  />
                  {/* Station dots */}
                  {selectedRoute.stations.map((s) => {
                    const pct    = (s.km / position.routeKm) * 100;
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
                  {/* Train marker (flipped ←) */}
                  {!position.completed && (
                    <div
                      className="absolute top-1/2 -translate-y-1/2 text-lg leading-none"
                      style={{
                        left: `${position.pct}%`,
                        transform: 'translateY(-50%) translateX(-50%) scaleX(-1)',
                      }}
                    >
                      🚅
                    </div>
                  )}
                </div>

                {/* Labels */}
                {(() => {
                  const mid = selectedRoute.stations[Math.floor(selectedRoute.stations.length / 2)];
                  return (
                    <div className="relative h-6 mt-1">
                      <span className="absolute left-0 text-xs text-gray-500">
                        {selectedRoute.stations[0].name}
                      </span>
                      <span
                        className="absolute text-xs text-gray-500 -translate-x-1/2"
                        style={{ left: `${(mid.km / position.routeKm) * 100}%` }}
                      >
                        {mid.name}
                      </span>
                      <span className="absolute right-0 text-xs text-gray-500">
                        {selectedRoute.stations[selectedRoute.stations.length - 1].name}
                      </span>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Station list */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50">
              {selectedRoute.stations.map((s, i) => {
                const passed  = s.km < position.totalKm;
                const current = !position.completed && position.prevStation.name === s.name;
                const next    = position.nextStation?.name === s.name;
                const isLast  = i === selectedRoute.stations.length - 1;
                return (
                  <div
                    key={s.name}
                    className={`flex items-center gap-3 px-4 py-3 ${passed && !current ? 'opacity-40' : ''}`}
                  >
                    <span className="text-base w-5 text-center shrink-0">
                      {position.completed && isLast ? '🎉'
                        : current ? <FlippedTrain />
                        : next    ? '⬜'
                        : passed  ? '✅'
                        : '◯'}
                    </span>
                    <span className={`text-sm flex-1 ${
                      current ? 'font-bold text-indigo-700'
                      : next   ? 'font-medium text-gray-700'
                      : 'text-gray-500'
                    }`}>
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
