import { Route, Station } from '@/lib/data/routes';

export interface JourneyPosition {
  totalKm: number;
  routeKm: number;
  pct: number;
  prevStation: Station;
  nextStation: Station | null;
  kmFromPrev: number;
  kmToNext: number | null;
  completed: boolean;
  passedStations: Station[];
}

export function stepsToKm(steps: number): number {
  return steps * 0.7 / 1000;
}

export function computePosition(totalKm: number, route: Route): JourneyPosition {
  const stations = route.stations;
  const routeKm = stations[stations.length - 1].km;
  const clampedKm = Math.min(totalKm, routeKm);
  const pct = routeKm > 0 ? (clampedKm / routeKm) * 100 : 0;
  const completed = totalKm >= routeKm;

  let prevStation = stations[0];
  let nextStation: Station | null = stations[1] ?? null;

  for (let i = 0; i < stations.length - 1; i++) {
    if (clampedKm >= stations[i].km && clampedKm < stations[i + 1].km) {
      prevStation = stations[i];
      nextStation = stations[i + 1];
      break;
    }
  }

  if (completed) {
    prevStation = stations[stations.length - 1];
    nextStation = null;
  }

  const kmFromPrev = clampedKm - prevStation.km;
  const kmToNext = nextStation ? nextStation.km - clampedKm : null;
  const passedStations = stations.filter((s) => s.km <= clampedKm);

  return { totalKm, routeKm, pct, prevStation, nextStation, kmFromPrev, kmToNext, completed, passedStations };
}
