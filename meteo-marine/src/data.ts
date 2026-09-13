// Couche donnees : assemble vent + marée + score de confort pour un spot.
// Réutilisée par le script console (forecast.ts) et la génération HTML (generate.ts).

import { fetchWind } from "./wind.js";
import { fetchTideExtrema, type TideDay } from "./tide.js";
import { estimateTidePhase, comfortScore, type TidePhase } from "./engine.js";
import type { Spot } from "./spots.js";

export type ForecastHour = {
  time: string;
  speedKn: number;
  directionDeg: number;
  gustKn: number;
  tide: TidePhase;
  score: number;
};

export type SpotForecast = {
  spot: Spot;
  hours: ForecastHour[];
  tideDays: TideDay[];
  tideAttributionHtml: string;
};

export async function buildForecast(spot: Spot): Promise<SpotForecast> {
  const today = new Date().toISOString().slice(0, 10);
  const dayAfterTomorrow = new Date(Date.now() + 2 * 86400000)
    .toISOString()
    .slice(0, 10);

  const [wind, tide] = await Promise.all([
    fetchWind(spot.latitude, spot.longitude),
    fetchTideExtrema(spot.tideSiteId, today, dayAfterTomorrow),
  ]);

  const hours: ForecastHour[] = wind.map((h) => {
    const now = new Date(h.time + ":00+02:00");
    const tidePhase = estimateTidePhase(now, tide.days, spot);
    return {
      time: h.time,
      speedKn: h.speedKn,
      directionDeg: h.directionDeg,
      gustKn: h.gustKn,
      tide: tidePhase,
      score: comfortScore(h.speedKn, h.directionDeg, tidePhase),
    };
  });

  return { spot, hours, tideDays: tide.days, tideAttributionHtml: tide.attributionHtml };
}
