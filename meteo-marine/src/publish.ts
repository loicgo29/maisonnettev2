// Étape cron : régénère les prévisions et republie le widget directement
// dans public-site/index.html (maisonnettev2), entre des marqueurs HTML
// dédiés, sans jamais toucher au reste de la page.
//
// Usage : npm run publish
// Cible configurable via PUBLISH_TARGET (chemin absolu vers index.html).

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildForecast } from "./data.js";
import { SPOTS } from "./spots.js";
import { renderEmbeddableWidget } from "./templates.js";

const TARGET_HTML =
  process.env.PUBLISH_TARGET ??
  path.resolve(process.cwd(), "../public-site/index.html");

const HEAD_START = "<!-- METEO-MARINE:HEAD:START -->";
const HEAD_END = "<!-- METEO-MARINE:HEAD:END -->";
const SECTION_START = "<!-- METEO-MARINE:SECTION:START -->";
const SECTION_END = "<!-- METEO-MARINE:SECTION:END -->";

function replaceBetween(
  html: string,
  startMarker: string,
  endMarker: string,
  content: string
): string {
  const start = html.indexOf(startMarker);
  const end = html.indexOf(endMarker);
  if (start === -1 || end === -1 || end < start) {
    throw new Error(
      `Marqueurs "${startMarker}" / "${endMarker}" introuvables (ou dans le mauvais ordre) dans ${TARGET_HTML}`
    );
  }
  return (
    html.slice(0, start + startMarker.length) +
    "\n" +
    content +
    "\n" +
    html.slice(end)
  );
}

async function main() {
  const allForecasts = await Promise.all(SPOTS.map((spot) => buildForecast(spot)));
  const defaultForecast =
    allForecasts.find((f) => f.spot.id === "bertheaume") ?? allForecasts[0];
  const { headTags, sectionHtml } = renderEmbeddableWidget(defaultForecast, allForecasts);

  const original = await readFile(TARGET_HTML, "utf-8");
  let html = replaceBetween(original, HEAD_START, HEAD_END, headTags);
  html = replaceBetween(html, SECTION_START, SECTION_END, sectionHtml);

  // Rien n'est écrit tant que les deux remplacements n'ont pas réussi :
  // en cas d'échec (API tierce en panne, marqueurs déplacés), la page
  // publiée reste inchangée plutôt que de finir à moitié mise à jour.
  await writeFile(TARGET_HTML, html, "utf-8");

  console.log(`✅ Widget météo-marine republié dans ${TARGET_HTML}`);
}

main().catch((err) => {
  console.error(`❌ Publication annulée : ${err.message}`);
  process.exit(1);
});
