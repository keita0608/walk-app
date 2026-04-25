export interface Station {
  name: string;
  dist: number; // km from Tokyo
  lat: number;
  lng: number;
  major?: boolean;
}

export const STATIONS: Station[] = [
  { name: '東京',       dist: 0,      lat: 35.681, lng: 139.767, major: true },
  { name: '品川',       dist: 6.8,    lat: 35.629, lng: 139.741 },
  { name: '新横浜',     dist: 25.5,   lat: 35.508, lng: 139.616 },
  { name: '小田原',     dist: 71.4,   lat: 35.256, lng: 139.155 },
  { name: '熱海',       dist: 95.4,   lat: 35.097, lng: 139.074 },
  { name: '三島',       dist: 111.9,  lat: 35.125, lng: 138.912 },
  { name: '新富士',     dist: 135,    lat: 35.150, lng: 138.657 },
  { name: '静岡',       dist: 167.4,  lat: 34.971, lng: 138.389, major: true },
  { name: '掛川',       dist: 211.3,  lat: 34.769, lng: 137.998 },
  { name: '浜松',       dist: 238.9,  lat: 34.704, lng: 137.733 },
  { name: '豊橋',       dist: 274.2,  lat: 34.769, lng: 137.392 },
  { name: '三河安城',   dist: 312.8,  lat: 34.953, lng: 137.084 },
  { name: '名古屋',     dist: 342,    lat: 35.170, lng: 136.882, major: true },
  { name: '岐阜羽島',   dist: 367.1,  lat: 35.321, lng: 136.685 },
  { name: '米原',       dist: 408.2,  lat: 35.313, lng: 136.286 },
  { name: '京都',       dist: 476.3,  lat: 34.985, lng: 135.759, major: true },
  { name: '新大阪',     dist: 515.4,  lat: 34.733, lng: 135.500, major: true },
  { name: '新神戸',     dist: 548,    lat: 34.695, lng: 135.195 },
  { name: '西明石',     dist: 570.2,  lat: 34.651, lng: 134.975 },
  { name: '姫路',       dist: 601.3,  lat: 34.825, lng: 134.688, major: true },
  { name: '相生',       dist: 621.3,  lat: 34.802, lng: 134.464 },
  { name: '岡山',       dist: 676.3,  lat: 34.667, lng: 133.917, major: true },
  { name: '新倉敷',     dist: 702.1,  lat: 34.583, lng: 133.717 },
  { name: '福山',       dist: 733.1,  lat: 34.483, lng: 133.367 },
  { name: '新尾道',     dist: 750.5,  lat: 34.408, lng: 133.201 },
  { name: '三原',       dist: 761,    lat: 34.400, lng: 133.083 },
  { name: '東広島',     dist: 802.4,  lat: 34.425, lng: 132.750 },
  { name: '広島',       dist: 832.9,  lat: 34.397, lng: 132.476, major: true },
  { name: '新岩国',     dist: 874.4,  lat: 34.167, lng: 132.200 },
  { name: '徳山',       dist: 921.1,  lat: 34.050, lng: 131.800 },
  { name: '新山口',     dist: 963.9,  lat: 34.167, lng: 131.467, major: true },
  { name: '厚狭',       dist: 992.5,  lat: 34.017, lng: 131.100 },
  { name: '新下関',     dist: 1015.4, lat: 33.950, lng: 130.967 },
  { name: '小倉',       dist: 1032.9, lat: 33.883, lng: 130.883 },
  { name: '博多',       dist: 1069.1, lat: 33.590, lng: 130.420, major: true },
  { name: '新鳥栖',     dist: 1097.7, lat: 33.375, lng: 130.460 },
  { name: '久留米',     dist: 1104.8, lat: 33.317, lng: 130.508 },
  { name: '筑後船小屋', dist: 1125,   lat: 33.183, lng: 130.575 },
  { name: '新大牟田',   dist: 1143.9, lat: 33.017, lng: 130.467 },
  { name: '新玉名',     dist: 1165.2, lat: 32.933, lng: 130.617 },
  { name: '熊本',       dist: 1199.5, lat: 32.792, lng: 130.742, major: true },
  { name: '新八代',     dist: 1232.3, lat: 32.508, lng: 130.608 },
  { name: '新水俣',     dist: 1275.1, lat: 32.108, lng: 130.408 },
  { name: '出水',       dist: 1290.4, lat: 32.083, lng: 130.350 },
  { name: '川内',       dist: 1331,   lat: 31.817, lng: 130.317 },
  { name: '鹿児島中央', dist: 1355.8, lat: 31.558, lng: 130.542, major: true },
];

export const TOTAL_DIST = 1355.8;

export function getReachedInfo(distKm: number): {
  station: Station;
  nextStation: Station | null;
  markerLat: number;
  markerLng: number;
  idx: number;
} {
  const capped = Math.min(distKm, TOTAL_DIST);
  let idx = 0;
  for (let i = 0; i < STATIONS.length; i++) {
    if (STATIONS[i].dist <= capped) idx = i;
    else break;
  }
  const station = STATIONS[idx];
  const next = idx < STATIONS.length - 1 ? STATIONS[idx + 1] : null;

  let markerLat = station.lat;
  let markerLng = station.lng;
  if (next && next.dist > station.dist) {
    const t = (capped - station.dist) / (next.dist - station.dist);
    markerLat = station.lat + t * (next.lat - station.lat);
    markerLng = station.lng + t * (next.lng - station.lng);
  }

  return { station, nextStation: next, markerLat, markerLng, idx };
}
