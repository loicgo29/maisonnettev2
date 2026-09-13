// Affichage console du moteur de règles (debug / calibration).

import { buildForecast } from "./data.js";
import { getSpot } from "./spots.js";

function scoreBar(score: number): string {
  const filled = Math.round(score / 5);
  return "█".repeat(filled) + "░".repeat(20 - filled);
}

async function main() {
  const spotId = process.argv[2] ?? "bertheaume";
  const spot = getSpot(spotId);
  const { hours } = await buildForecast(spot);

  console.log(`Jauge de confort — ${spot.name}\n`);
  console.log(
    "Heure             Vent(kn) Dir°  Marée        Coef  Score  Confort"
  );

  for (const h of hours) {
    console.log(
      `${h.time}  ${h.speedKn.toString().padStart(6)}  ${h.directionDeg
        .toString()
        .padStart(4)}  ${h.tide.phase.padEnd(11)}  ${h.tide.coefficient
        .toString()
        .padStart(4)}  ${h.score.toString().padStart(5)}  ${scoreBar(h.score)}`
    );
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
