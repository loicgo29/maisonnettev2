// Client api-maree.fr — horaires de pleine/basse mer + coefficient.
// Nécessite une clé API gratuite : https://api-maree.fr/register
// Clé lue depuis la variable d'environnement MAREE_API_KEY.

const BASE_URL = "https://api-maree.fr";

export type TideExtremum = {
  type: "PM" | "BM";
  time: string; // "HH:MM" local
  height: number; // mètres
  coef?: number; // uniquement sur les PM
};

export type TideDay = {
  date: string; // "YYYY-MM-DD"
  extrema: TideExtremum[];
};

type TideExtremaResponse = {
  site_id: string;
  site_name: string;
  data: TideDay[];
  source: { attribution: string };
};

export type TideResult = {
  days: TideDay[];
  attributionHtml: string; // requis par la licence CC BY des données Ifremer/PREVIMER
};

export async function fetchTideExtrema(
  siteId: string,
  from: string,
  to: string
): Promise<TideResult> {
  const apiKey = process.env.MAREE_API_KEY;
  if (!apiKey) {
    throw new Error(
      "MAREE_API_KEY manquante. Inscris-toi sur https://api-maree.fr/register et mets la clé dans .env"
    );
  }

  const url = new URL(`${BASE_URL}/tide-extrema`);
  url.searchParams.set("site", siteId);
  url.searchParams.set("from", from);
  url.searchParams.set("to", to);
  url.searchParams.set("tz", "Europe/Paris");
  url.searchParams.set("key", apiKey);

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`api-maree.fr error: ${res.status} ${await res.text()}`);
  }
  const json = (await res.json()) as TideExtremaResponse;
  return { days: json.data, attributionHtml: json.source.attribution };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  fetchTideExtrema("brest", today, tomorrow)
    .then(({ days }) => {
      console.log("Marées — Brest (port de référence pour Bertheaume)\n");
      for (const day of days) {
        console.log(day.date);
        for (const e of day.extrema) {
          console.log(
            `  ${e.time}  ${e.type}  ${e.height}m` +
              (e.coef ? `  coef ${e.coef}` : "")
          );
        }
      }
    })
    .catch((err) => {
      console.error(err.message);
      process.exit(1);
    });
}
