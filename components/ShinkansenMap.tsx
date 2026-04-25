'use client';

import { STATIONS, TOTAL_DIST, getReachedInfo } from '@/lib/utils/shinkansen';

interface Props {
  distKm: number;
  userName: string;
}

// SVG coordinate system
const LNG_MIN = 129.0, LNG_MAX = 141.0, W = 540;
const LAT_MIN = 30.8, LAT_MAX = 36.8,  H = 460;

function sx(lng: number) { return ((lng - LNG_MIN) / (LNG_MAX - LNG_MIN)) * W; }
function sy(lat: number) { return ((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * H; }
function pts(pairs: [number, number][]) { return pairs.map(([lat, lng]) => `${sx(lng).toFixed(1)},${sy(lat).toFixed(1)}`).join(' '); }

// Simplified Honshu outline (Pacific/Tokaido side → San'in coast)
const HONSHU: [number, number][] = [
  // NE coast – Tokyo Bay area
  [36.2, 140.2], [35.7, 140.1], [35.5, 139.9], [35.2, 139.8], [35.0, 139.6],
  // Pacific coast going west
  [34.9, 139.4], [34.7, 138.9], [34.6, 138.5], [34.5, 138.0], [34.4, 137.5],
  [34.4, 137.0], [34.6, 136.8], [34.9, 136.7], [35.0, 136.4], [35.3, 136.1],
  // Biwa Lake / Kinki
  [35.6, 135.7], [35.3, 135.1], [34.6, 135.1], [34.4, 135.6],
  // Seto Inland Sea (Kinki → Hiroshima)
  [34.7, 134.8], [34.6, 134.1], [34.4, 133.4], [34.4, 133.1],
  [34.4, 132.5], [34.3, 132.0], [34.0, 131.7], [33.9, 131.1], [33.9, 130.9],
  // San'in coast going east (north side of Chugoku Mts)
  [34.3, 131.0], [34.6, 131.6], [34.9, 131.9], [35.2, 132.5],
  [35.4, 133.1], [35.5, 133.9], [35.7, 134.7], [35.7, 135.5],
  [36.1, 136.0], [36.3, 136.6], [36.5, 137.4],
  // Noto Peninsula approximation
  [37.0, 137.3], [37.5, 137.0], [37.3, 136.9], [36.8, 136.8],
  // Back east toward Tokyo
  [36.7, 138.0], [36.6, 138.9], [36.4, 139.5], [36.0, 139.9], [35.8, 140.1],
  [36.2, 140.2],
];

// Simplified Kyushu outline
const KYUSHU: [number, number][] = [
  [33.9, 130.9], [33.7, 130.3], [33.5, 130.0], [33.2, 129.8],
  [32.9, 129.7], [32.6, 129.7], [32.2, 130.0], [31.8, 130.1],
  [31.4, 130.3], [31.0, 130.6], [31.2, 130.9], [31.5, 131.2],
  [31.8, 131.4], [32.3, 131.6], [32.7, 131.7], [33.2, 131.5],
  [33.6, 131.4], [33.9, 131.2], [33.9, 130.9],
];

// Simplified Shikoku outline (adds visual context)
const SHIKOKU: [number, number][] = [
  [34.1, 134.0], [33.9, 134.6], [33.6, 134.8], [33.5, 135.1],
  [33.6, 135.8], [33.9, 136.2], [34.1, 135.9], [34.3, 135.4],
  [34.3, 134.9], [34.4, 134.4], [34.3, 133.9], [34.2, 133.5],
  [33.9, 133.0], [33.7, 132.5], [33.5, 132.1], [33.5, 131.6],
  [33.7, 131.2], [34.0, 131.3], [34.1, 131.8], [34.3, 132.5],
  [34.4, 133.1], [34.1, 134.0],
];

export default function ShinkansenMap({ distKm, userName }: Props) {
  const { station: reached, nextStation, markerLat, markerLng, idx: reachedIdx } = getReachedInfo(distKm);
  const finished = distKm >= TOTAL_DIST;

  const routeAll  = STATIONS.map(s => `${sx(s.lng).toFixed(1)},${sy(s.lat).toFixed(1)}`).join(' ');
  const routeDone = STATIONS.slice(0, reachedIdx + 1).map(s => `${sx(s.lng).toFixed(1)},${sy(s.lat).toFixed(1)}`).join(' ');

  const mx = sx(markerLng);
  const my = sy(markerLat);

  const pct = Math.min((distKm / TOTAL_DIST) * 100, 100);

  return (
    <div className="space-y-3">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full rounded-xl border border-gray-200"
        style={{ background: '#dbeafe' }}
      >
        {/* Land areas */}
        <polygon points={pts(HONSHU)}  fill="#e8e8dc" stroke="#b0b0a0" strokeWidth={1} />
        <polygon points={pts(SHIKOKU)} fill="#e8e8dc" stroke="#b0b0a0" strokeWidth={1} />
        <polygon points={pts(KYUSHU)}  fill="#e8e8dc" stroke="#b0b0a0" strokeWidth={1} />

        {/* Full route (unwalked) */}
        <polyline points={routeAll}  fill="none" stroke="#bfdbfe" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" />
        {/* Walked portion */}
        {reachedIdx > 0 && (
          <polyline points={routeDone} fill="none" stroke="#4f46e5" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
        )}

        {/* All station dots */}
        {STATIONS.map((s, i) => (
          <circle
            key={s.name}
            cx={sx(s.lng)} cy={sy(s.lat)}
            r={s.major ? 4 : 2.5}
            fill={i <= reachedIdx ? '#4f46e5' : '#93c5fd'}
            stroke="white"
            strokeWidth={1}
          />
        ))}

        {/* Major station labels */}
        {STATIONS.filter(s => s.major).map(s => {
          const cx = sx(s.lng);
          const cy = sy(s.lat);
          const isReached = s.dist <= distKm;
          // nudge labels to avoid map edges
          const anchor = cx > W * 0.78 ? 'end' : cx < W * 0.22 ? 'start' : 'middle';
          const dy = cy < 22 ? 12 : -7;
          return (
            <text
              key={s.name}
              x={cx}
              y={cy + dy}
              textAnchor={anchor}
              fontSize={9}
              fill={isReached ? '#312e81' : '#6b7280'}
            >
              {s.name}
            </text>
          );
        })}

        {/* User position marker */}
        <circle cx={mx} cy={my} r={12} fill="none" stroke="#ef4444" strokeWidth={2.5} opacity={0.5} />
        <circle cx={mx} cy={my} r={7}  fill="#ef4444" stroke="white" strokeWidth={2} />

        {finished && (
          <text x={mx} y={my - 18} textAnchor="middle" fontSize={11} fill="#dc2626" fontWeight="bold">
            GOAL!
          </text>
        )}
      </svg>

      {/* Info card */}
      <div className="bg-indigo-50 rounded-xl p-4">
        <p className="text-sm text-indigo-600 font-medium mb-0.5">{userName} の現在地</p>
        <p className="text-2xl font-bold font-mono text-indigo-700">
          {distKm.toFixed(1)} km
        </p>
        {finished ? (
          <p className="text-sm text-indigo-500 mt-1 font-semibold">🎉 鹿児島中央 到達！全行程完走！</p>
        ) : (
          <p className="text-sm text-indigo-500 mt-1">
            到達駅：<span className="font-semibold text-indigo-700">{reached.name}</span>
            {nextStation && (
              <span className="text-gray-400">
                {' '}→ 次の駅 <span className="text-indigo-600">{nextStation.name}</span>（あと{' '}
                <span className="font-mono">{(nextStation.dist - distKm).toFixed(1)}</span> km）
              </span>
            )}
          </p>
        )}
        <div className="mt-3 bg-indigo-100 rounded-full h-2 overflow-hidden">
          <div
            className="bg-indigo-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${pct.toFixed(1)}%` }}
          />
        </div>
        <p className="text-xs text-indigo-400 mt-1 text-right font-mono">
          全行程 {TOTAL_DIST.toLocaleString()} km の {pct.toFixed(1)}%
        </p>
      </div>
    </div>
  );
}
