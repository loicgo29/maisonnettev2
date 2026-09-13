// Étape 4 du plan : génération des fichiers HTML statiques
// (encart résumé + sous-page par spot), destinés à être publiés
// sur la partie publique du site des gîtes (section 3.1 du plan).

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildForecast } from "./data.js";
import { SPOTS } from "./spots.js";
import { renderSummaryCard, renderSpotPage, renderEmbeddableWidget } from "./templates.js";

const OUTPUT_DIR = path.resolve(process.cwd(), "output");

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true });

  const summaries: string[] = [];
  const allForecasts = await Promise.all(SPOTS.map((spot) => buildForecast(spot)));

  for (const forecast of allForecasts) {
    const spot = forecast.spot;
    const summaryHtml = renderSummaryCard(forecast);
    const pageHtml = renderSpotPage(forecast, allForecasts);

    await writeFile(path.join(OUTPUT_DIR, `${spot.id}.html`), pageHtml, "utf-8");
    await writeFile(
      path.join(OUTPUT_DIR, `${spot.id}-summary.html`),
      summaryHtml,
      "utf-8"
    );
    summaries.push(summaryHtml);

    console.log(`✅ ${spot.name} → output/${spot.id}.html + ${spot.id}-summary.html`);
  }

  // Encart combiné pour la page d'accueil (tous les spots)
  const homeInsert = `<div style="display:flex;gap:16px;flex-wrap:wrap;">\n${summaries.join("\n")}\n</div>`;
  await writeFile(path.join(OUTPUT_DIR, "home-insert.html"), homeInsert, "utf-8");
  console.log(`✅ Encart accueil → output/home-insert.html`);

  // Widget embarquable (carte + sélecteurs), spot par défaut = Bertheaume,
  // destiné à être inséré en bas de public-site/index.html (maisonnettev2).
  const defaultForecast = allForecasts.find((f) => f.spot.id === "bertheaume") ?? allForecasts[0];
  const widget = renderEmbeddableWidget(defaultForecast, allForecasts);
  await writeFile(path.join(OUTPUT_DIR, "widget-head.html"), widget.headTags, "utf-8");
  await writeFile(path.join(OUTPUT_DIR, "widget-section.html"), widget.sectionHtml, "utf-8");
  console.log(`✅ Widget embarquable → output/widget-head.html + output/widget-section.html`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
