export type Spot = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  tideSiteId: string; // identifiant api-maree.fr du port de référence
  // Direction (cap compas, 0=N/90=E/180=S/270=W) vers laquelle le courant
  // porte pendant le flot (marée montante) et le jusant (marée descendante).
  // À CALIBRER (section 4.4 du plan) — valeurs actuelles = hypothèse pour le
  // Goulet de Brest (flot entrant vers l'est dans la rade, jusant sortant
  // vers l'ouest), à vérifier sur le terrain.
  floodBearing: number;
  ebbBearing: number;
};

export const SPOTS: Spot[] = [
  {
    id: "bertheaume",
    name: "Bertheaume",
    // Plage du Perzel / Bertheaume (pas le village) — coordonnées fournies
    // par l'utilisateur.
    latitude: 48.339503,
    longitude: -4.699987,
    tideSiteId: "brest",
    floodBearing: 90,
    ebbBearing: 270,
  },
  {
    id: "sainte-anne-du-portzic",
    name: "Sainte-Anne-du-Portzic",
    latitude: 48.357,
    longitude: -4.552,
    tideSiteId: "brest",
    // À l'intérieur de la rade, près du Goulet : hypothèse flot entrant vers
    // le nord-est (vers le fond de rade), jusant sortant vers le sud-ouest
    // (vers le Goulet). À calibrer comme Bertheaume (section 4.4).
    floodBearing: 45,
    ebbBearing: 225,
  },
];

export function getSpot(id: string): Spot {
  const spot = SPOTS.find((s) => s.id === id);
  if (!spot) throw new Error(`Spot inconnu: ${id}`);
  return spot;
}
