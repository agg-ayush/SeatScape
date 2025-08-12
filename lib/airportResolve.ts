import type { Airport } from "./types";
import baseAirports from "./airports.json";
import { promises as fs } from "fs";
import path from "path";

const cache = new Map<string, Airport>();
let extraAirports: Airport[] | null = null;
const extraPath = path.join(process.cwd(), "lib", "airports-extra.json");

async function loadExtra() {
  if (extraAirports) return;
  try {
    const txt = await fs.readFile(extraPath, "utf8");
    extraAirports = JSON.parse(txt) as Airport[];
  } catch {
    extraAirports = [];
  }
}

function warnMissing(iata: string, a: Partial<Airport>) {
  const missing: string[] = [];
  if (!a.name) missing.push("name");
  if (typeof a.lat !== "number") missing.push("lat");
  if (typeof a.lon !== "number") missing.push("lon");
  if (!a.tz) missing.push("tz");
  if (missing.length) {
    console.warn(`Missing fields for ${iata}: ${missing.join(", ")}`);
  }
}

export async function resolveAirport(iata: string): Promise<Airport> {
  const code = iata.toUpperCase();
  const cached = cache.get(code);
  if (cached) return cached;

  let airport = baseAirports.find((a) => a.iata === code);
  if (!airport) {
    await loadExtra();
    airport = extraAirports!.find((a) => a.iata === code);
  }

  if (!airport) {
    try {
      const res = await fetch(`/api/getAirportInfo?iata=${code}`);
      if (!res.ok) {
        console.warn(`Failed to fetch airport info for ${code}: ${res.status}`);
      } else {
        const data = await res.json();
        airport = {
          iata: code,
          name: data.name ?? code,
          lat: typeof data.lat === "number" ? data.lat : 0,
          lon: typeof data.lon === "number" ? data.lon : 0,
          tz: data.tz || "UTC",
        };
        warnMissing(code, airport);
        await loadExtra();
        extraAirports!.push(airport);
        await fs.writeFile(extraPath, JSON.stringify(extraAirports, null, 2) + "\n");
      }
    } catch (e) {
      console.warn(`Error fetching airport info for ${code}: ${e}`);
    }
  } else {
    warnMissing(code, airport);
  }

  if (!airport) {
    airport = {
      iata: code,
      name: code,
      lat: 0,
      lon: 0,
      tz: "UTC",
    };
  }

  cache.set(code, airport);
  return airport;
}
