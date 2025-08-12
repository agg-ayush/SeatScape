export type NormalizedFlight = {
  airline: string;
  flightNumber: string;
  departure: { iata: string; time: string };
  arrival: { iata: string; time: string };
};

export function normalizeFlight(raw: any): NormalizedFlight {
  return {
    airline: raw.airline?.name ?? "",
    flightNumber: raw.flight?.iata ?? raw.flight?.number ?? "",
    departure: {
      iata: raw.departure?.iata ?? "",
      time: raw.departure?.scheduled
        ? new Date(raw.departure.scheduled).toISOString()
        : "",
    },
    arrival: {
      iata: raw.arrival?.iata ?? "",
      time: raw.arrival?.scheduled
        ? new Date(raw.arrival.scheduled).toISOString()
        : "",
    },
  };
}

