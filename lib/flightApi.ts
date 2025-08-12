import { DateTime } from "luxon";
import type { InputsSnapshot, Airport } from "@/lib/types";
import airportsData from "@/lib/airports.json";

export type NormalizedFlight = {
  airline: string;
  flightNumber: string;
  departure: { iata: string; time: string };
  arrival: { iata: string; time: string };
};

type ApiSegment = {
  iata?: string | null;
  actual?: string | null;
  estimated?: string | null;
  scheduled?: string | null;
  [key: string]: unknown;
};

type ApiFlight = {
  flight_date?: string;
  departure?: ApiSegment;
  arrival?: ApiSegment;
  airline?: { name?: string };
  flight?: { iata?: string; number?: string };
  [key: string]: unknown;
};

function resolveAirport(code: string): Airport | undefined {
  const airports = airportsData as unknown as Airport[];
  return airports.find((a) => a.iata.toUpperCase() === code.toUpperCase());
}

export async function fetchFlightByIata(flightIata: string) {
  const params = new URLSearchParams({ flightIata });
  const res = await fetch(`/api/getFlightStatus?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch flight status");
  return res.json();
}

function selectTime(seg: ApiSegment) {
  return seg.actual || seg.estimated || seg.scheduled || undefined;
}

export function normalizeFlight(raw: ApiFlight): NormalizedFlight {
  return {
    airline: raw.airline?.name ?? "",
    flightNumber: raw.flight?.iata ?? raw.flight?.number ?? "",
    departure: {
      iata: raw.departure?.iata ?? "",
      time: selectTime(raw.departure ?? {}) ?? "",
    },
    arrival: {
      iata: raw.arrival?.iata ?? "",
      time: selectTime(raw.arrival ?? {}) ?? "",
    },
  };
}

export async function buildInputsFromFlight(
  flightIata: string,
  date: string
): Promise<InputsSnapshot | null> {
  const data = await fetchFlightByIata(flightIata);
  const flights: ApiFlight[] = Array.isArray(data?.data)
    ? (data.data as ApiFlight[])
    : (data as ApiFlight[]);
  if (!Array.isArray(flights)) return null;

  const raw = flights.find((f) => {
    const flightDate = f.flight_date || f.departure?.scheduled?.slice(0, 10);
    return flightDate === date;
  });
  if (!raw) return null;

  const flight = normalizeFlight(raw);
  const origin = resolveAirport(flight.departure.iata);
  const dest = resolveAirport(flight.arrival.iata);
  if (!origin || !dest || !flight.departure.time || !flight.arrival.time)
    return null;

  const departLocalISO = DateTime.fromISO(flight.departure.time)
    .setZone(origin.tz)
    .toFormat("yyyy-LL-dd'T'HH:mm");
  const arriveLocalISO = DateTime.fromISO(flight.arrival.time)
    .setZone(dest.tz)
    .toFormat("yyyy-LL-dd'T'HH:mm");

  return {
    origin,
    dest,
    departLocalISO,
    arriveLocalISO,
    preference: "see",
    from: origin.iata,
    to: dest.iata,
  };
}
