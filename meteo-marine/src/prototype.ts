// Étape 1 du plan : appel Open-Meteo pour un spot en dur, affichage brut du vent.
// Spot: Anse de Bertheaume (Plougonvelin, près de Brest)

const SPOT = {
  name: "Bertheaume",
  latitude: 48.3395,
  longitude: -4.7062,
};

const url = new URL("https://api.open-meteo.com/v1/forecast");
url.searchParams.set("latitude", String(SPOT.latitude));
url.searchParams.set("longitude", String(SPOT.longitude));
url.searchParams.set("hourly", "wind_speed_10m,wind_direction_10m,wind_gusts_10m");
url.searchParams.set("wind_speed_unit", "kn");
url.searchParams.set("timezone", "Europe/Paris");
url.searchParams.set("forecast_days", "2");

type OpenMeteoResponse = {
  hourly: {
    time: string[];
    wind_speed_10m: number[];
    wind_direction_10m: number[];
    wind_gusts_10m: number[];
  };
};

async function main() {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Open-Meteo error: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as OpenMeteoResponse;

  console.log(`Vent — ${SPOT.name} (${SPOT.latitude}, ${SPOT.longitude})\n`);
  console.log("Heure             Vitesse (kn)   Direction (°)   Rafales (kn)");
  for (let i = 0; i < data.hourly.time.length; i++) {
    const time = data.hourly.time[i];
    const speed = data.hourly.wind_speed_10m[i];
    const dir = data.hourly.wind_direction_10m[i];
    const gust = data.hourly.wind_gusts_10m[i];
    console.log(
      `${time}   ${speed.toString().padStart(10)}   ${dir.toString().padStart(12)}   ${gust.toString().padStart(10)}`
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
