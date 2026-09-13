import type { TideDay, TideExtremum } from "./tide.js";
import type { Spot } from "./spots.js";

// ---------------------------------------------------------------------------
// 4.1 — Jauge vent seul (trapèze)
// < 3 nds : inconfortable (0)
// 3-20 nds : zone favorable homogène (100)
// > 20 nds : inconfortable (0)
// Largeurs de rampe non spécifiées par le plan -> valeurs par défaut
// raisonnables, à ajuster (section 4.4).
// ---------------------------------------------------------------------------
const WIND_RAMP_UP_START = 1; // nds, score 0
const WIND_RAMP_UP_END = 3; // nds, score 100
const WIND_FLAT_END = 20; // nds, score encore 100
const WIND_RAMP_DOWN_END = 28; // nds, score 0

export function windGaugeScore(speedKn: number): number {
  if (speedKn <= WIND_RAMP_UP_START) return 0;
  if (speedKn < WIND_RAMP_UP_END) {
    return (
      ((speedKn - WIND_RAMP_UP_START) / (WIND_RAMP_UP_END - WIND_RAMP_UP_START)) * 100
    );
  }
  if (speedKn <= WIND_FLAT_END) return 100;
  if (speedKn < WIND_RAMP_DOWN_END) {
    return (
      100 -
      ((speedKn - WIND_FLAT_END) / (WIND_RAMP_DOWN_END - WIND_FLAT_END)) * 100
    );
  }
  return 0;
}

// ---------------------------------------------------------------------------
// Estimation du courant à partir du délai depuis la dernière PM/BM
// (faute de donnée de courant directe — voir section 2.2 du plan)
// ---------------------------------------------------------------------------
export type TidePhase = {
  phase: "montante" | "descendante";
  currentBearing: number;
  coefficient: number;
  height: number; // mètres, hauteur d'eau interpolée
  heightRatio: number; // 0 (au niveau de la BM encadrante) .. 1 (au niveau de la PM encadrante)
};

function parseExtremumDate(day: TideDay, extremum: TideExtremum): Date {
  return new Date(`${day.date}T${extremum.time}:00+02:00`);
}

function findBracketingExtrema(now: Date, days: TideDay[]) {
  const flat: { date: Date; extremum: TideExtremum }[] = [];
  for (const day of days) {
    for (const extremum of day.extrema) {
      flat.push({ date: parseExtremumDate(day, extremum), extremum });
    }
  }
  flat.sort((a, b) => a.date.getTime() - b.date.getTime());

  let prev = flat[0];
  let next = flat[flat.length - 1];
  for (let i = 0; i < flat.length - 1; i++) {
    if (flat[i].date <= now && flat[i + 1].date >= now) {
      prev = flat[i];
      next = flat[i + 1];
      break;
    }
  }
  return { prev, next };
}

/**
 * Hauteur d'eau interpolée entre deux étales (règle du douzième / courbe en
 * cosinus, approximation standard faute de courbe de hauteur continue —
 * voir section 2.2 du plan).
 */
function interpolateHeight(now: Date, prev: { date: Date; extremum: TideExtremum }, next: { date: Date; extremum: TideExtremum }): number {
  const duration = next.date.getTime() - prev.date.getTime();
  const elapsed = now.getTime() - prev.date.getTime();
  const fraction = duration > 0 ? elapsed / duration : 0;
  const mid = (prev.extremum.height + next.extremum.height) / 2;
  const amplitude = (next.extremum.height - prev.extremum.height) / 2;
  return mid - amplitude * Math.cos(Math.PI * fraction);
}

export function estimateTidePhase(now: Date, days: TideDay[], spot: Spot): TidePhase {
  const { prev, next } = findBracketingExtrema(now, days);

  const phase: "montante" | "descendante" =
    prev.extremum.type === "BM" ? "montante" : "descendante";

  const height = interpolateHeight(now, prev, next);
  const lowHeight = Math.min(prev.extremum.height, next.extremum.height);
  const highHeight = Math.max(prev.extremum.height, next.extremum.height);
  const heightRatio =
    highHeight > lowHeight ? (height - lowHeight) / (highHeight - lowHeight) : 0.5;

  const nearestPM = [prev, next].find((p) => p.extremum.type === "PM");
  const coefficient = nearestPM?.extremum.coef ?? 70; // valeur neutre par défaut

  const currentBearing = phase === "montante" ? spot.floodBearing : spot.ebbBearing;

  return { phase, currentBearing, coefficient, height, heightRatio };
}

// ---------------------------------------------------------------------------
// 4.2 — Pénalité d'opposition vent / courant
// ---------------------------------------------------------------------------
// Angle minimum de près (par rapport au vent réel) que le bateau peut tenir.
// Le bateau remonte peu au vent (voir plan) -> valeur plus large qu'un
// voilier de régate classique (~40-45°). À calibrer avec l'usage.
export const CLOSE_HAULED_ANGLE_DEG = 50;

const MAX_PENALTY = 40; // points retirés au maximum (vent fort + fort coef + opposition totale)
const MAX_BONUS = 10; // points ajoutés au maximum (alignement total)
const COEF_REFERENCE = 120; // coefficient de vive-eau max

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * alignment = 1  -> vent et courant vont dans le même sens (mer plate)
 * alignment = -1 -> vent et courant s'opposent (mer courte et hachée)
 */
function windCurrentAlignment(windDirDeg: number, currentBearingDeg: number): number {
  return Math.cos(toRadians(windDirDeg - currentBearingDeg));
}

// ---------------------------------------------------------------------------
// 4.3 — Score de confort final
// ---------------------------------------------------------------------------
export function comfortScore(
  windSpeedKn: number,
  windDirDeg: number,
  tide: TidePhase
): number {
  const base = windGaugeScore(windSpeedKn);
  const alignment = windCurrentAlignment(windDirDeg, tide.currentBearing);
  const windFactor = Math.min(windSpeedKn / WIND_FLAT_END, 1);
  const coefFactor = Math.min(tide.coefficient / COEF_REFERENCE, 1);

  let score = base;
  if (alignment < 0) {
    // opposition vent/courant : pénalité
    const opposition = -alignment; // 0..1
    score -= opposition * windFactor * coefFactor * MAX_PENALTY;
  } else if (alignment > 0) {
    // alignement vent/courant : léger bonus
    score += alignment * windFactor * coefFactor * MAX_BONUS;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}
