import type { Airport, Preference } from "@/lib/types";
import { buildInputsFromFlight as buildInputsFromFlightApi } from "@/lib/flightApi";

export type FlightInputs = {
  origin: Airport;
  dest: Airport;
  departLocalISO: string;
  arriveLocalISO: string;
  preference: Preference;
};

export async function buildInputsFromFlight(
  flightNumber: string,
  date: string
): Promise<FlightInputs> {
  const snapshot = await buildInputsFromFlightApi(flightNumber, date);
  if (!snapshot) throw new Error("Flight not found");
  const { origin, dest, departLocalISO, arriveLocalISO, preference } = snapshot;
  return { origin, dest, departLocalISO, arriveLocalISO, preference };
}
