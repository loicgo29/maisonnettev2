export type WindHour = {
  time: string; // ISO local, ex "2026-09-13T14:00"
  speedKn: number;
  directionDeg: number;
  gustKn: number;
};

type OpenMeteoResponse = {
  hourly: {
    time: string[];
    wind_speed_10m: number[];
    wind_direction_10m: number[];
    wind_gusts_10m: number[];
  };
};

export async function fetchWind(
  latitude: number,
  longitude: number,
  forecastDays = 2
): Promise<WindHour[]> {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(latitude));
  url.searchParams.set("longitude", String(longitude));
  url.searchParams.set("hourly", "wind_speed_10m,wind_direction_10m,wind_gusts_10m");
  url.searchParams.set("wind_speed_unit", "kn");
  url.searchParams.set("timezone", "Europe/Paris");
  url.searchParams.set("forecast_days", String(forecastDays));

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Open-Meteo error: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as OpenMeteoResponse;

  return data.hourly.time.map((time, i) => ({
    time,
    speedKn: data.hourly.wind_speed_10m[i],
    directionDeg: data.hourly.wind_direction_10m[i],
    gustKn: data.hourly.wind_gusts_10m[i],
  }));
}
