import { afterEach, expect, test, vi } from "vitest";
import { resolveAirport } from "../lib/airports";

const realFetch = global.fetch;

afterEach(() => {
  global.fetch = realFetch;
});

test("resolveAirport returns data from local dataset", async () => {
  const fetchMock = vi.fn();
  global.fetch = fetchMock;
  const a = await resolveAirport("DEL");
  expect(a).toBeTruthy();
  expect(a?.iata).toBe("DEL");
  expect(fetchMock).not.toHaveBeenCalled();
});

test("resolveAirport falls back to API", async () => {
  const apiData = {
    iata: "ZZZ",
    name: "Test Airport",
    lat: 1,
    lon: 2,
    tz: "Etc/UTC",
  };
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => apiData,
  });
  global.fetch = fetchMock;
  const a = await resolveAirport("ZZZ");
  expect(a).toEqual(apiData);
  expect(fetchMock).toHaveBeenCalledWith("/api/getAirportInfo?iata=ZZZ");
});

