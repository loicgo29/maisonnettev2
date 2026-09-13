// Couche génération HTML : encart résumé (accueil) + sous-page complète par spot.
// HTML statique, sans dépendance JS côté client — juste du texte + CSS inline.

import type { SpotForecast } from "./data.js";
import { CLOSE_HAULED_ANGLE_DEG } from "./engine.js";

function comfortLabel(score: number): string {
  if (score < 20) return "Déconseillé";
  if (score < 40) return "Difficile";
  if (score < 60) return "Moyen";
  if (score < 80) return "Bon";
  return "Excellent";
}

function comfortColor(score: number): string {
  if (score < 20) return "#b91c1c";
  if (score < 40) return "#c2410c";
  if (score < 60) return "#ca8a04";
  if (score < 80) return "#65a30d";
  return "#15803d";
}

function currentHour(forecast: SpotForecast) {
  const now = new Date();
  let closest = forecast.hours[0];
  let closestDiff = Infinity;
  for (const h of forecast.hours) {
    const diff = Math.abs(new Date(h.time + ":00+02:00").getTime() - now.getTime());
    if (diff < closestDiff) {
      closestDiff = diff;
      closest = h;
    }
  }
  return closest;
}

function comfortAdjectivePlural(score: number): string {
  if (score < 20) return "déconseillées";
  if (score < 40) return "difficiles";
  if (score < 60) return "moyennes";
  if (score < 80) return "bonnes";
  return "excellentes";
}

function synthesisSentence(forecast: SpotForecast): string {
  const h = currentHour(forecast);
  return `Conditions ${comfortAdjectivePlural(h.score)} pour la voile aujourd'hui à ${forecast.spot.name} (vent ${h.speedKn} nds, marée ${h.tide.phase}).`;
}

// ---------------------------------------------------------------------------
// Encart résumé — destiné à la page d'accueil du site des gîtes
// ---------------------------------------------------------------------------
export function renderSummaryCard(forecast: SpotForecast): string {
  const h = currentHour(forecast);
  const color = comfortColor(h.score);
  return `<div class="meteo-marine-card" style="border:1px solid #e5e7eb;border-radius:8px;padding:16px;font-family:system-ui,sans-serif;max-width:320px;">
  <div style="font-size:14px;color:#6b7280;">Météo marine — ${forecast.spot.name}</div>
  <div style="display:flex;align-items:baseline;gap:8px;margin:6px 0;">
    <span style="font-size:28px;font-weight:700;color:${color};">${h.score}</span>
    <span style="font-size:14px;color:${color};">${comfortLabel(h.score)}</span>
  </div>
  <div style="font-size:13px;color:#374151;">${synthesisSentence(forecast)}</div>
  <a href="/${forecast.spot.id}" style="font-size:13px;color:#2563eb;">Voir le détail →</a>
</div>`;
}

// ---------------------------------------------------------------------------
// Sous-page complète par spot — sélecteur de spot, sélecteur d'heure,
// carte Leaflet (position, flèche de vent, lignes de bord au près).
// Toutes les données (tous les spots, toutes les heures déjà calculées côté
// back-office) sont embarquées en JSON ; le JS client ne fait qu'afficher,
// aucun recalcul de la jauge de confort (conforme section 3.1 du plan).
// ---------------------------------------------------------------------------
export function renderSpotPage(forecast: SpotForecast, allForecasts: SpotForecast[]): string {
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>Météo marine — ${forecast.spot.name}</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
${LEAFLET_CSS_TAG}
<style>
  body { font-family: system-ui, sans-serif; max-width: 800px; margin: 0 auto; padding: 24px; color: #111827; }
  h1 { font-size: 22px; }
  ${WIDGET_STYLES}
</style>
</head>
<body>
  <div id="meteo-marine">
    <h1>Météo marine</h1>
    ${renderWidgetBody(forecast, allForecasts)}
  </div>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Widget embarquable — même contenu que la sous-page mais sans wrapper
// <html>/<head>, destiné à être inséré dans une page existante (ex: en bas
// de la page d'accueil du site des gîtes).
// ---------------------------------------------------------------------------
export function renderEmbeddableWidget(
  forecast: SpotForecast,
  allForecasts: SpotForecast[]
): { headTags: string; sectionHtml: string } {
  return {
    headTags: `${LEAFLET_CSS_TAG}\n<style>${WIDGET_STYLES}</style>`,
    sectionHtml: `<section id="meteo-marine">\n  <h2>⛵ Météo marine</h2>\n  ${renderWidgetBody(forecast, allForecasts)}\n</section>`,
  };
}

const LEAFLET_CSS_TAG = `<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">`;
const WIDGET_STYLES = `
  #meteo-marine select { font-size: 14px; padding: 6px 8px; border-radius: 6px; border: 1px solid #d1d5db; }
  #meteo-marine .controls { display: flex; gap: 16px; flex-wrap: wrap; margin: 16px 0; }
  #meteo-marine #map { height: 360px; border-radius: 8px; margin-top: 12px; }
  #meteo-marine .legend { font-size: 12px; color: #6b7280; margin-top: 6px; }
  #meteo-marine .legend span { display: inline-flex; align-items: center; gap: 4px; margin-right: 16px; }
  #meteo-marine .swatch { display: inline-block; width: 18px; height: 3px; }
  #meteo-marine footer.meteo-attribution { margin-top: 40px; font-size: 11px; color: #9ca3af; }
`;

function renderWidgetBody(forecast: SpotForecast, allForecasts: SpotForecast[]): string {
  const clientData = {
    closeHauledAngle: CLOSE_HAULED_ANGLE_DEG,
    spots: allForecasts.map((f) => ({
      id: f.spot.id,
      name: f.spot.name,
      latitude: f.spot.latitude,
      longitude: f.spot.longitude,
      floodBearing: f.spot.floodBearing,
      ebbBearing: f.spot.ebbBearing,
      hours: f.hours.map((hh) => ({
        time: hh.time,
        speedKn: hh.speedKn,
        directionDeg: hh.directionDeg,
        gustKn: hh.gustKn,
        phase: hh.tide.phase,
        coefficient: hh.tide.coefficient,
        height: hh.tide.height,
        heightRatio: hh.tide.heightRatio,
        score: hh.score,
      })),
    })),
  };

  return `
  <div class="controls">
    <label>Spot
      <select id="spot-select"></select>
    </label>
    <label>Heure
      <select id="hour-select"></select>
    </label>
  </div>

  <p id="synthesis">${synthesisSentence(forecast)}</p>

  <div id="map"></div>
  <div class="legend">
    <span><span class="swatch" style="background:#14532d;"></span>Direction du vent</span>
    <span><span class="swatch" style="background:#111827;"></span>Bord de près (tribord/bâbord)</span>
    <span><span class="swatch" style="background:#2563eb;"></span>Jauge — marée montante</span>
    <span><span class="swatch" style="background:#dc2626;"></span>Jauge — marée descendante</span>
    <span><span class="swatch" style="background:#eab308;border-radius:50%;width:10px;height:10px;"></span>Vent &lt; 6 nds</span>
    <span><span class="swatch" style="background:#16a34a;border-radius:50%;width:10px;height:10px;"></span>Vent 6-20 nds</span>
    <span><span class="swatch" style="background:#dc2626;border-radius:50%;width:10px;height:10px;"></span>Vent &gt; 20 nds</span>
  </div>

  <footer class="meteo-attribution">
    Prévisions de vent : Open-Meteo. ${forecast.tideAttributionHtml}
    <br>Généré le ${new Date().toLocaleString("fr-FR")}.
  </footer>

  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    const DATA = ${JSON.stringify(clientData)};
    const DEFAULT_SPOT_ID = ${JSON.stringify(forecast.spot.id)};

    const spotSelect = document.getElementById("spot-select");
    const hourSelect = document.getElementById("hour-select");
    const synthesis = document.getElementById("synthesis");

    for (const spot of DATA.spots) {
      const opt = document.createElement("option");
      opt.value = spot.id;
      opt.textContent = spot.name;
      if (spot.id === DEFAULT_SPOT_ID) opt.selected = true;
      spotSelect.appendChild(opt);
    }

    function currentSpot() {
      return DATA.spots.find((s) => s.id === spotSelect.value);
    }

    function closestHourIndex(spot) {
      const now = Date.now();
      let best = 0, bestDiff = Infinity;
      spot.hours.forEach((h, i) => {
        const diff = Math.abs(new Date(h.time + ":00+02:00").getTime() - now);
        if (diff < bestDiff) { bestDiff = diff; best = i; }
      });
      return best;
    }

    function populateHours(spot) {
      hourSelect.innerHTML = "";
      spot.hours.forEach((h, i) => {
        const opt = document.createElement("option");
        opt.value = String(i);
        opt.textContent = h.time.replace("T", " ");
        hourSelect.appendChild(opt);
      });
      hourSelect.value = String(closestHourIndex(spot));
    }

    // Déplace un point de (distanceMeters) dans la direction (bearingDeg),
    // approximation plane suffisante à l'échelle d'un spot de navigation.
    function destPoint(lat, lon, bearingDeg, distanceMeters) {
      const R = 6371000;
      const brng = (bearingDeg * Math.PI) / 180;
      const dLat = (distanceMeters * Math.cos(brng)) / R;
      const dLon = (distanceMeters * Math.sin(brng)) / (R * Math.cos((lat * Math.PI) / 180));
      return [lat + (dLat * 180) / Math.PI, lon + (dLon * 180) / Math.PI];
    }

    const map = L.map("map");
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
      maxZoom: 18,
    }).addTo(map);

    const WIND_COLOR = "#14532d";

    function arrowIcon(bearingDeg, color, size) {
      const half = size / 2;
      return L.divIcon({
        className: "",
        html: '<div style="width:0;height:0;border-left:' + half + 'px solid transparent;border-right:' + half + 'px solid transparent;border-bottom:' + size + 'px solid ' + color + ';transform:rotate(' + bearingDeg + 'deg);transform-origin:center;"></div>',
        iconSize: [size, size],
        iconAnchor: [half, half],
      });
    }

    // Jauge de hauteur d'eau façon appli "Boating" : carré blanc, taille
    // fixe, rempli de bas en haut proportionnellement à heightRatio (0..1).
    const GAUGE_SIZE = 32;
    const GAUGE_FLOOD_COLOR = "#2563eb"; // montante
    const GAUGE_EBB_COLOR = "#dc2626"; // descendante
    function tideGaugeHtml(heightRatio, phase) {
      const fillHeight = Math.round(GAUGE_SIZE * Math.max(0, Math.min(1, heightRatio)));
      const fillColor = phase === "montante" ? GAUGE_FLOOD_COLOR : GAUGE_EBB_COLOR;
      return (
        '<div style="width:' + GAUGE_SIZE + 'px;height:' + GAUGE_SIZE + 'px;background:#fff;border:2px solid #000;overflow:hidden;display:flex;align-items:flex-end;">' +
        '<div style="width:100%;height:' + fillHeight + 'px;background:' + fillColor + ';"></div>' +
        "</div>"
      );
    }

    // Pastille fixe de vitesse du vent : jaune < 6 nds, vert 6-20 nds, rouge > 20 nds.
    const WIND_BADGE_SIZE = 34;
    function windSpeedColor(speedKn) {
      if (speedKn < 6) return "#eab308";
      if (speedKn <= 20) return "#16a34a";
      return "#dc2626";
    }
    function windSpeedBadgeHtml(speedKn) {
      const color = windSpeedColor(speedKn);
      return (
        '<div style="width:' + WIND_BADGE_SIZE + 'px;height:' + WIND_BADGE_SIZE + 'px;border-radius:50%;background:' + color + ';border:2px solid #000;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:12px;font-family:system-ui,sans-serif;">' +
        speedKn.toFixed(1) +
        "</div>"
      );
    }

    // HUD fixe en haut à droite de la carte (indépendant du pan/zoom),
    // contrairement aux marqueurs géographiques.
    const HudControl = L.Control.extend({
      options: { position: "topright" },
      onAdd: function () {
        const div = L.DomUtil.create("div");
        div.id = "meteo-hud";
        div.style.display = "flex";
        div.style.flexDirection = "column";
        div.style.gap = "6px";
        div.style.alignItems = "flex-end";
        div.style.margin = "10px";
        L.DomEvent.disableClickPropagation(div);
        return div;
      },
    });
    const hud = new HudControl();
    hud.addTo(map);
    const hudEl = document.getElementById("meteo-hud");

    let spotMarker, windLine, windArrow, closeHauled1, closeHauled2;

    function render() {
      const spot = currentSpot();
      const idx = Number(hourSelect.value);
      const h = spot.hours[idx];

      synthesis.textContent =
        "Conditions à " + spot.name + " : vent " + h.speedKn + " nds, marée " + h.phase +
        " (coef " + h.coefficient + ").";

      map.setView([spot.latitude, spot.longitude], 13);

      if (spotMarker) map.removeLayer(spotMarker);
      if (windLine) map.removeLayer(windLine);
      if (windArrow) map.removeLayer(windArrow);
      if (closeHauled1) map.removeLayer(closeHauled1);
      if (closeHauled2) map.removeLayer(closeHauled2);

      spotMarker = L.marker([spot.latitude, spot.longitude]).addTo(map).bindPopup(spot.name);

      // Le vent souffle DEPUIS h.directionDeg VERS (directionDeg + 180).
      const windTo = (h.directionDeg + 180) % 360;
      const windLength = 400 + h.speedKn * 40;
      const windEnd = destPoint(spot.latitude, spot.longitude, windTo, windLength);
      windLine = L.polyline([[spot.latitude, spot.longitude], windEnd], {
        color: WIND_COLOR, weight: 3,
      }).addTo(map).bindTooltip("Vent " + h.speedKn + " nds");
      windArrow = L.marker(windEnd, { icon: arrowIcon(windTo, WIND_COLOR, 14) }).addTo(map);

      // HUD fixe (haut-droite de la carte) : vitesse du vent + hauteur d'eau.
      hudEl.innerHTML =
        windSpeedBadgeHtml(h.speedKn) + tideGaugeHtml(h.heightRatio, h.phase);

      // Bord de près : cap le plus proche du vent que le bateau peut tenir,
      // sur chaque amure (angle DATA.closeHauledAngle de part et d'autre de
      // la direction d'où vient le vent).
      const chLength = 700;
      const ch1End = destPoint(spot.latitude, spot.longitude, h.directionDeg - DATA.closeHauledAngle, chLength);
      const ch2End = destPoint(spot.latitude, spot.longitude, h.directionDeg + DATA.closeHauledAngle, chLength);
      closeHauled1 = L.polyline([[spot.latitude, spot.longitude], ch1End], {
        color: "#111827", weight: 2, dashArray: "6 4",
      }).addTo(map);
      closeHauled2 = L.polyline([[spot.latitude, spot.longitude], ch2End], {
        color: "#111827", weight: 2, dashArray: "6 4",
      }).addTo(map);
    }

    spotSelect.addEventListener("change", () => {
      populateHours(currentSpot());
      render();
    });
    hourSelect.addEventListener("change", render);

    populateHours(currentSpot());
    render();
  </script>`;
}
