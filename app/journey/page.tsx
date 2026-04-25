'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import AuthGuard from '@/components/AuthGuard';
import { getStepsByUser, setJourneyRoute, recordJourneyCompletion } from '@/lib/firebase/firestore';
import { computePosition, stepsToKm, JourneyPosition } from '@/lib/utils/journey';
import { ROUTES, Route } from '@/lib/data/routes';
import { getTodayJST } from '@/lib/utils/date';

function fmt(km: number) { return km.toFixed(1); }

function RouteIcon({ route, style }: { route: Route; style?: React.CSSProperties }) {
  const icon = route.icon ?? '🚅';
  const flip = route.flipIcon !== false;
  return (
    <span style={{ display: 'inline-block', transform: flip ? 'scaleX(-1)' : undefined, ...style }}>
      {icon}
    </span>
  );
}

export default function JourneyPage() {
  const { user } = useAuth();
  const [selectedRoute, setSelectedRoute] = useState<Route | null | undefined>(undefined);
  const [position, setPosition]           = useState<JourneyPosition | null>(null);
  const [totalSteps, setTotalSteps]       = useState(0);
  const [routeSteps, setRouteSteps]       = useState(0);
  const [loading, setLoading]             = useState(true);
  const [selecting, setSelecting]         = useState(false);
  const [completions, setCompletions]     = useState<Record<string, number>>({});

  const loadJourney = async (route: Route, startDate: string) => {
    if (!user) return;
    setLoading(true);
    try {
      const steps = await getStepsByUser(user.id);
      const total = steps.reduce((sum, s) => sum + s.steps, 0);
      const forRoute = steps
        .filter((s) => s.date >= startDate)
        .reduce((sum, s) => sum + s.steps, 0);
      setTotalSteps(total);
      setRouteSteps(forRoute);
      setPosition(computePosition(stepsToKm(forRoute), route));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    setCompletions(user.journeyCompletions ?? {});
    const route = ROUTES.find((r) => r.id === user.journeyRouteId) ?? null;
    setSelectedRoute(route);
    if (route) {
      loadJourney(route, user.journeyRouteStartDate ?? '2000-01-01');
    } else {
      setLoading(false);
    }
  }, [user]);

  // First-time selection: include all historical steps ('2000-01-01')
  // Re-selection after completion: start fresh from today
  const handleSelectRoute = async (route: Route, afterCompletion = false) => {
    if (!user) return;
    setSelecting(true);
    try {
      const startDate = afterCompletion ? getTodayJST() : '2000-01-01';
      await setJourneyRoute(user.id, route.id, startDate);
      setSelectedRoute(route);
      await loadJourney(route, startDate);
    } finally {
      setSelecting(false);
    }
  };

  const handleNextRoute = async () => {
    if (!user || !selectedRoute) return;
    await recordJourneyCompletion(user.id, selectedRoute.id);
    await setJourneyRoute(user.id, null);
    const next = { ...completions, [selectedRoute.id]: (completions[selectedRoute.id] ?? 0) + 1 };
    setCompletions(next);
    setSelectedRoute(null);
    setPosition(null);
    setRouteSteps(0);
    setLoading(false);
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
              ルートを選択してください。選択後はゴールするまで変更できません。
            </p>
            <div className="space-y-3">
              {[...ROUTES]
                .sort((a, b) => a.stations[a.stations.length - 1].km - b.stations[b.stations.length - 1].km)
                .map((route) => {
                  const first = route.stations[0];
                  const last  = route.stations[route.stations.length - 1];
                  const count = completions[route.id] ?? 0;
                  return (
                    <button
                      key={route.id}
                      onClick={() => handleSelectRoute(route, position?.completed)}
                      disabled={selecting}
                      className="w-full text-left bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:border-indigo-300 transition-colors disabled:opacity-50"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-gray-800">{route.name}</p>
                            {count > 0 && (
                              <span className="text-xs px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded font-medium">
                                🏆 {count}回
                              </span>
                            )}
                          </div>
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
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">累計</span>
                <span className="text-sm font-mono font-medium text-gray-700">
                  {totalSteps.toLocaleString()} 歩（{fmt(stepsToKm(totalSteps))} km）
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">今回のルートで</span>
                <span className="text-sm font-mono font-bold text-indigo-600">
                  {routeSteps.toLocaleString()} 歩（{fmt(stepsToKm(routeSteps))} km）
                </span>
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
                  <div
                    className="absolute left-0 top-0 h-2 bg-indigo-500 rounded-full transition-all duration-700"
                    style={{ width: `${Math.min(position.pct, 100)}%` }}
                  />
                  {selectedRoute.stations.map((s) => {
                    const pct    = (s.km / position.routeKm) * 100;
                    const passed = s.km <= stepsToKm(routeSteps);
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
                  {!position.completed && (
                    <div
                      className="absolute top-1/2 -translate-y-1/2 text-lg leading-none"
                      style={{ left: `${position.pct}%`, transform: 'translateY(-50%) translateX(-50%)' }}
                    >
                      <RouteIcon route={selectedRoute} />
                    </div>
                  )}
                </div>
                {(() => {
                  const midStation = selectedRoute.midStationName
                    ? selectedRoute.stations.find((s) => s.name === selectedRoute.midStationName)
                    : (() => {
                        const midKm = position.routeKm / 2;
                        return selectedRoute.stations.reduce((best, s) =>
                          Math.abs(s.km - midKm) < Math.abs(best.km - midKm) ? s : best
                        );
                      })();
                  return (
                    <div className="relative h-6 mt-1">
                      <span className="absolute left-0 text-xs text-gray-500">
                        {selectedRoute.stations[0].name}
                      </span>
                      {midStation && (
                        <span
                          className="absolute text-xs text-gray-500 -translate-x-1/2"
                          style={{ left: `${(midStation.km / position.routeKm) * 100}%` }}
                        >
                          {midStation.name}
                        </span>
                      )}
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
                const routeKm = stepsToKm(routeSteps);
                const passed  = s.km < routeKm;
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
                        : current ? <RouteIcon route={selectedRoute} />
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

            {position.completed ? (
              <button
                onClick={handleNextRoute}
                disabled={selecting}
                className="w-full text-center text-sm px-4 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-medium"
              >
                🚅 次のルートを選択する
              </button>
            ) : (
              <Link
                href="/steps"
                className="block text-center text-sm px-4 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700"
              >
                歩数を入力する
              </Link>
            )}
          </>
        ) : null}
      </div>
    </AuthGuard>
  );
}
