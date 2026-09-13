// Suggestions d'activités nautiques selon les conditions du moment.
// Toutes les règles réutilisent les données déjà calculées (vent, marée,
// coefficient, hauteur d'eau) — aucun appel API supplémentaire.
// Secteur de référence : Trez-Hir / baie de Bertheaume (Iroise), activités
// confirmées par recherche web (centre nautique Plougonvelin, office de
// tourisme Iroise Bretagne).

import type { ForecastHour } from "./data.js";

export type Activity = {
  id: string;
  label: string;
  icon: string;
  available: boolean; // false = affiché grisé "bientôt disponible"
  matches: (hour: ForecastHour) => boolean;
  reasonYes: string; // courte justification quand possible
  /**
   * Justification dynamique quand pas possible : calculée à partir des
   * heures du jour plutôt qu'un texte figé, pour dire "trop faible" ou
   * "trop fort" précisément au lieu d'un vague "trop faible ou trop fort"
   * qui ne renseigne pas sur le cas réel du jour.
   */
  reasonNo: (dayHours: ForecastHour[]) => string;
};

function windRange(dayHours: ForecastHour[]): { min: number; max: number } {
  const speeds = dayHours.map((h) => h.speedKn);
  return { min: Math.min(...speeds), max: Math.max(...speeds) };
}

function windRangeReason(dayHours: ForecastHour[], minNeeded: number, maxNeeded: number): string {
  const { min, max } = windRange(dayHours);
  if (max < minNeeded) return `vent trop faible (jusqu'à ${max.toFixed(1)} nds aujourd'hui)`;
  if (min > maxNeeded) return `vent trop fort (à partir de ${min.toFixed(1)} nds aujourd'hui)`;
  return "vent hors de la plage favorable toute la journée";
}

function windMaxReason(dayHours: ForecastHour[], maxAllowed: number): string {
  const { min } = windRange(dayHours);
  return `vent trop fort toute la journée (minimum ${min.toFixed(1)} nds)`;
}

export const ACTIVITIES: Activity[] = [
  {
    id: "peche-a-pied",
    label: "Pêche à pied",
    icon: "🦀",
    available: true,
    matches: (h) => h.tide.heightRatio < 0.15 && h.tide.coefficient > 70,
    reasonYes: "bon coefficient, estran largement découvert",
    reasonNo: (dayHours) => {
      const maxCoef = Math.max(...dayHours.map((h) => h.tide.coefficient));
      return maxCoef <= 70
        ? `coefficient trop faible (max ${maxCoef} aujourd'hui)`
        : "la marée ne descend pas assez bas aujourd'hui";
    },
  },
  {
    id: "planche-a-voile",
    label: "Planche à voile",
    icon: "🏄",
    available: true,
    matches: (h) => h.speedKn >= 8 && h.speedKn <= 25,
    reasonYes: "vent porteur",
    reasonNo: (dayHours) => windRangeReason(dayHours, 8, 25),
  },
  {
    id: "wingfoil",
    label: "Wingfoil",
    icon: "🪁",
    available: true,
    matches: (h) => h.speedKn >= 12 && h.speedKn <= 30,
    reasonYes: "vent suffisant pour le foil",
    reasonNo: (dayHours) => windRangeReason(dayHours, 12, 30),
  },
  {
    id: "catamaran",
    label: "Catamaran / voile légère",
    icon: "⛵",
    available: true,
    matches: (h) => h.speedKn >= 6 && h.speedKn <= 20,
    reasonYes: "vent modéré, conditions adaptées débutants",
    reasonNo: (dayHours) => windRangeReason(dayHours, 6, 20),
  },
  {
    id: "sup",
    label: "Stand up paddle",
    icon: "🏄‍♀️",
    available: true,
    matches: (h) => h.speedKn < 10 && h.tide.coefficient < 70,
    reasonYes: "mer plate, peu de courant",
    reasonNo: (dayHours) => {
      const { min } = windRange(dayHours);
      const maxCoef = Math.max(...dayHours.map((h) => h.tide.coefficient));
      if (maxCoef >= 70 && min >= 10) return `vent et courant trop forts (min ${min.toFixed(1)} nds, coef jusqu'à ${maxCoef})`;
      if (maxCoef >= 70) return `courant trop fort toute la journée (coef jusqu'à ${maxCoef})`;
      return windMaxReason(dayHours, 10);
    },
  },
  {
    id: "kayak",
    label: "Kayak de mer",
    icon: "🛶",
    available: true,
    matches: (h) => h.speedKn < 12 && h.tide.coefficient < 80,
    reasonYes: "mer calme",
    reasonNo: (dayHours) => {
      const { min } = windRange(dayHours);
      const maxCoef = Math.max(...dayHours.map((h) => h.tide.coefficient));
      if (maxCoef >= 80 && min >= 12) return `vent et courant trop forts (min ${min.toFixed(1)} nds, coef jusqu'à ${maxCoef})`;
      if (maxCoef >= 80) return `courant trop fort toute la journée (coef jusqu'à ${maxCoef})`;
      return windMaxReason(dayHours, 12);
    },
  },
  {
    id: "plongee",
    label: "Plongée / apnée",
    icon: "🤿",
    available: true,
    matches: (h) => h.speedKn < 10 && h.tide.coefficient < 60,
    reasonYes: "bonne visibilité attendue",
    reasonNo: (dayHours) => {
      const maxCoef = Math.max(...dayHours.map((h) => h.tide.coefficient));
      return maxCoef >= 60
        ? `courant trop fort pour une bonne visibilité (coef jusqu'à ${maxCoef})`
        : windMaxReason(dayHours, 10);
    },
  },
  {
    id: "baignade",
    label: "Baignade",
    icon: "🏊",
    available: true,
    matches: (h) => h.speedKn < 15,
    reasonYes: "mer calme",
    reasonNo: (dayHours) => windMaxReason(dayHours, 15),
  },
  {
    id: "surf",
    label: "Surf (bientôt disponible)",
    icon: "🌊",
    available: false, // nécessite la houle (Open-Meteo Marine), pas encore intégrée
    matches: () => false,
    reasonYes: "",
    reasonNo: () => "nécessite la houle, pas encore intégrée",
  },
];

export function getActivitiesFor(hour: ForecastHour): Activity[] {
  return ACTIVITIES.filter((a) => a.available && a.matches(hour));
}

/**
 * Pour chaque activité, indique si elle est possible à AU MOINS une heure de
 * la journée donnée (ex: "paddle possible aujourd'hui ?" — pas seulement à
 * l'heure sélectionnée dans le widget).
 */
export function getDayAvailability(
  hours: ForecastHour[],
  dateStr: string // "YYYY-MM-DD"
): { activity: Activity; possible: boolean; reason: string }[] {
  const dayHours = hours.filter((h) => h.time.startsWith(dateStr));
  const results = ACTIVITIES.filter((a) => a.available).map((activity) => {
    const possible = dayHours.some((h) => activity.matches(h));
    return {
      activity,
      possible,
      reason: possible ? activity.reasonYes : activity.reasonNo(dayHours),
    };
  });
  // Possibles en premier — l'info la plus utile pour un locataire en un coup d'œil.
  return results.sort((a, b) => Number(b.possible) - Number(a.possible));
}
