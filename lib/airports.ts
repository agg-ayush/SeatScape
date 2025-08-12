import data from "./airports.json";
import type { Airport } from "./types";

const byIata: Record<string, Airport> = {};
for (const a of data as Airport[]) {
  byIata[a.iata.toUpperCase()] = a;
}

export async function resolveAirport(code: string): Promise<Airport | null> {
  const upper = code.toUpperCase();
  const local = byIata[upper];
  if (local) return local;
  const res = await fetch(`/api/getAirportInfo?iata=${upper}`);
  if (!res.ok) throw new Error("Failed to fetch airport info");
  const info = await res.json();
  if (!info) return null;
  const airport: Airport = {
    iata: info.iata,
    name: info.name,
    lat: info.lat,
    lon: info.lon,
    tz: info.tz,
  };
  byIata[upper] = airport;
  return airport;
}

