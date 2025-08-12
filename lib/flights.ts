export type Flight = {
  flightCode: string;
  airline: string;
  scheduledDeparture: string;
  scheduledArrival: string;
  depTz: string;
  arrTz: string;
};

export async function fetchFlights(depIata: string, arrIata: string): Promise<Flight[]> {
  const params = new URLSearchParams({ dep_iata: depIata, arr_iata: arrIata });
  const res = await fetch(`/api/flights?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch flights");
  const data = await res.json();
  return (data.flights ?? []) as Flight[];
}
