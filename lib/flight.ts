import type { Airport, Preference } from "@/lib/types";

export type FlightInputs = {
  origin: Airport;
  dest: Airport;
  departLocalISO: string;
  arriveLocalISO: string;
  preference: Preference;
};

export async function buildInputsFromFlight(
  _flightNumber: string,
  _date: string
): Promise<FlightInputs> {
  throw new Error("buildInputsFromFlight not implemented");
}
