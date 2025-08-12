import { test, expect, vi } from "vitest";
import { normalizeFlight, fetchFlightByIata } from "../lib/flightApi";

test("normalizeFlight converts Aviationstack data", () => {
  const sample = {
    airline: { name: "Emirates" },
    flight: { number: "511", iata: "EK511" },
    departure: {
      airport: "Indira Gandhi International Airport",
      iata: "DEL",
      scheduled: "2025-01-10T10:00:00+05:30",
    },
    arrival: {
      airport: "Dubai International Airport",
      iata: "DXB",
      scheduled: "2025-01-10T12:30:00+04:00",
    },
  };

  const norm = normalizeFlight(sample);

  expect(norm).toEqual({
    airline: "Emirates",
    flightNumber: "EK511",
    departure: { iata: "DEL", time: "2025-01-10T04:30:00.000Z" },
    arrival: { iata: "DXB", time: "2025-01-10T08:30:00.000Z" },
  });
});

test("fetchFlightByIata calls API with flight_iata param", async () => {
  const originalFetch = globalThis.fetch;
  const mockFetch = vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({}),
  });
  // @ts-expect-error allow mock assignment
  globalThis.fetch = mockFetch;
  try {
    await fetchFlightByIata("AA100");
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/getFlightStatus?flight_iata=AA100"
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

