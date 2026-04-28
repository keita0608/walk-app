'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import AuthGuard from '@/components/AuthGuard';
import { getStepsByUser, getUsers, setJourneyRoute, recordJourneyCompletion } from '@/lib/firebase/firestore';
import { computePosition, stepsToKm, JourneyPosition } from '@/lib/utils/journey';
import { ROUTES, Route } from '@/lib/data/routes';

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

function CircularTrack({
  route,
  position,
  routeSteps,
  otherUsers,
}: {
  route: Route;
  position: JourneyPosition;
  routeSteps: number;
  otherUsers: { name: string; pct: number }[];
}) {
  const W = 300, H = 300;
  const cx = W / 2, cy = H / 2;
  const r  = 94;
  const circumference = 2 * Math.PI * r;
  const walkedKm = stepsToKm(routeSteps);
  const routeKm  = position.routeKm;

  // Exclude last station (same position as 東京 in a loop)
  const stations = route.stations.slice(0, -1);
  const n = stations.length;

  // Equal angular spacing for dots — avoids clustering
  const dotAngle = (i: number) => (i / n) * 2 * Math.PI - Math.PI / 2;
  // Km-based angle for train position and progress arc
  const kmAngle  = (km: number) => (km / routeKm) * 2 * Math.PI - Math.PI / 2;
  const pt = (angle: number, radius: number) => ({
    x: cx + radius * Math.cos(angle),
    y: cy + radius * Math.sin(angle),
  });

  const progressDash = Math.min(walkedKm / routeKm, 1) * circumference;
  const trainPt = pt(kmAngle(Math.min(walkedKm, routeKm * 0.9999)), r);

  // Only label these stations to keep the diagram clean
  const keyLabels = new Set(['東京', '上野', '池袋', '新宿', '渋谷', '品川']);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-[300px] mx-auto block">
      {/* Track circle */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e5e7eb" strokeWidth="6" />
      {/* Progress arc */}
      <circle
        cx={cx} cy={cy} r={r}
        fill="none" stroke="#6366f1" strokeWidth="6"
        strokeDasharray={`${progressDash} ${circumference}`}
        strokeLinecap="round"
        transform={`rotate(-90, ${cx}, ${cy})`}
      />
      {/* Route name in center */}
      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle"
        fontSize="12" fill="#9ca3af" fontWeight="500">{route.name}</text>
      {/* Station dots (equally spaced) + key labels */}
      {stations.map((s, i) => {
        const a      = dotAngle(i);
        const dot    = pt(a, r);
        const passed = s.km <= walkedKm;
        const isKey  = keyLabels.has(s.name);
        const ca = Math.cos(a), sa = Math.sin(a);
        return (
          <g key={s.name}>
            <circle cx={dot.x} cy={dot.y} r={isKey ? 5 : 3.5}
              fill={passed ? '#6366f1' : 'white'}
              stroke={passed ? '#6366f1' : '#9ca3af'} strokeWidth="1.5" />
            {isKey && (
              <text x={pt(a, r + 18).x} y={pt(a, r + 18).y}
                textAnchor={ca > 0.25 ? 'start' : ca < -0.25 ? 'end' : 'middle'}
                dominantBaseline={sa < -0.5 ? 'auto' : sa > 0.5 ? 'hanging' : 'middle'}
                fontSize="10" fill={passed ? '#4338ca' : '#374151'} fontWeight="600">
                {s.name}
              </text>
            )}
          </g>
        );
      })}
      {/* Other users */}
      {otherUsers.map((other, i) => {
        const p = pt(kmAngle((other.pct / 100) * routeKm), r);
        return (
          <circle key={i} cx={p.x} cy={p.y} r={6} fill="#fbbf24" stroke="white" strokeWidth="2" />
        );
      })}
      {/* Train */}
      {!position.completed && (
        <text x={trainPt.x} y={trainPt.y} textAnchor="middle" dominantBaseline="middle"
          fontSize="15" style={{ userSelect: 'none' }}>
          {route.icon ?? '🚅'}
        </text>
      )}
      {/* Completion */}
      {position.completed && (
        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fontSize="34">🎉</text>
      )}
    </svg>
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
  const [otherUsers, setOtherUsers]       = useState<{ name: string; pct: number }[]>([]);
  // Local offset avoids stale user object after completion
  const [stepOffset, setStepOffset]       = useState(0);

  const loadJourney = async (route: Route, offset: number) => {
    if (!user) return;
    setLoading(true);
    try {
      const [steps, allUsers] = await Promise.all([
        getStepsByUser(user.id),
        getUsers(),
      ]);
      const total = steps.reduce((sum, s) => sum + s.steps, 0);
      const forRoute = Math.max(0, total - offset);
      setTotalSteps(total);
      setRouteSteps(forRoute);
      setPosition(computePosition(stepsToKm(forRoute), route));

      const sameRouteUsers = allUsers.filter(
        (u) => u.id !== user.id && u.journeyRouteId === route.id,
      );
      const others = await Promise.all(
        sameRouteUsers.map(async (u) => {
          const theirSteps = await getStepsByUser(u.id);
          const theirTotal = theirSteps.reduce((sum, s) => sum + s.steps, 0);
          const theirOffset = u.journeyRouteStepOffset ?? 0;
          const theirForRoute = Math.max(0, theirTotal - theirOffset);
          const pos = computePosition(stepsToKm(theirForRoute), route);
          return { name: u.name, pct: Math.min(pos.pct, 100) };
        }),
      );
      setOtherUsers(others);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    setCompletions(user.journeyCompletions ?? {});
    const offset = user.journeyRouteStepOffset ?? 0;
    setStepOffset(offset);
    const route = ROUTES.find((r) => r.id === user.journeyRouteId) ?? null;
    setSelectedRoute(route);
    if (route) {
      loadJourney(route, offset);
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
      await loadJourney(route, stepOffset);
    } finally {
      setSelecting(false);
    }
  };

  const handleNextRoute = async () => {
    if (!user || !selectedRoute) return;
    const routeDistanceKm = selectedRoute.stations[selectedRoute.stations.length - 1].km;
    // Update local offset immediately so handleSelectRoute uses the correct value
    // even before AuthContext reflects the Firestore update
    const newOffset = stepOffset + Math.round(routeDistanceKm * 1000 / 0.7);
    setStepOffset(newOffset);
    await recordJourneyCompletion(user.id, selectedRoute.id, routeDistanceKm);
    const next = { ...completions, [selectedRoute.id]: (completions[selectedRoute.id] ?? 0) + 1 };
    setCompletions(next);
    setSelectedRoute(null);
    setPosition(null);
    setRouteSteps(0);
    setOtherUsers([]);
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
                      onClick={() => handleSelectRoute(route)}
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
                    🎉 {selectedRoute.circular ? '一周完走しました！' : `${selectedRoute.stations[selectedRoute.stations.length - 1].name}に到着！`}
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
              {selectedRoute.circular ? (
                <CircularTrack
                  route={selectedRoute}
                  position={position}
                  routeSteps={routeSteps}
                  otherUsers={otherUsers}
                />
              ) : (
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
                        className="absolute top-1/2 -translate-y-1/2 text-lg leading-none z-20"
                        style={{ left: `${position.pct}%`, transform: 'translateY(-50%) translateX(-50%)' }}
                      >
                        <RouteIcon route={selectedRoute} />
                      </div>
                    )}
                    {otherUsers.map((other, i) => (
                      <React.Fragment key={i}>
                        <div
                          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-amber-400 border-2 border-amber-500 z-10"
                          style={{ left: `${other.pct}%` }}
                        />
                        <div
                          className="absolute -translate-x-1/2 text-xs text-amber-600 whitespace-nowrap font-medium"
                          style={{ left: `${other.pct}%`, bottom: 'calc(100% + 4px)' }}
                        >
                          {other.name}
                        </div>
                      </React.Fragment>
                    ))}
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
              )}
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
