import { NextRequest, NextResponse } from "next/server";

function isIata(code: unknown): code is string {
  return typeof code === "string" && /^[A-Z]{3}$/.test(code);
}

async function fetchFromApi(dep: string, arr: string) {
  const key = process.env.AVIATIONSTACK_API_KEY;
  if (!key) throw new Error("Missing API key");
  const params = new URLSearchParams({
    access_key: key,
    dep_iata: dep,
    arr_iata: arr,
  });
  const res = await fetch(`https://api.aviationstack.com/v1/flights?${params.toString()}`, { next: { revalidate: 0 } });
  if (!res.ok) throw new Error("Failed external request");
  const json = await res.json();
  type AvFlight = {
    flight?: { iata?: string; number?: string };
    airline?: { name?: string; iata?: string; icao?: string };
    departure?: { scheduled?: string; timezone?: string };
    arrival?: { scheduled?: string; timezone?: string };
  };
  const flights = Array.isArray(json.data)
    ? (json.data as AvFlight[])
        .map((f) => ({
          flightCode: f.flight?.iata || f.flight?.number || "",
          airline: f.airline
            ? `${f.airline.name}${
                f.airline.iata || f.airline.icao
                  ? ` (${[f.airline.iata, f.airline.icao].filter(Boolean).join("/")})`
                  : ""
              }`
            : "",
          scheduledDeparture: f.departure?.scheduled || "",
          scheduledArrival: f.arrival?.scheduled || "",
          depTz: f.departure?.timezone || "",
          arrTz: f.arrival?.timezone || "",
        }))
        .filter(
          (f) =>
            f.flightCode &&
            f.airline &&
            f.scheduledDeparture &&
            f.scheduledArrival &&
            f.depTz &&
            f.arrTz
        )
    : [];
  return flights;
}

async function handle(dep: string | null, arr: string | null) {
  if (!isIata(dep) || !isIata(arr)) {
    return NextResponse.json({ error: "Invalid IATA codes" }, { status: 400 });
  }
  try {
    const flights = await fetchFromApi(dep, arr);
    return NextResponse.json({ flights });
  } catch {
    return NextResponse.json({ error: "Failed to fetch flights" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const dep = searchParams.get("dep_iata")?.toUpperCase() ?? null;
  const arr = searchParams.get("arr_iata")?.toUpperCase() ?? null;
  return handle(dep, arr);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const dep = typeof body?.dep_iata === "string" ? body.dep_iata.toUpperCase() : null;
  const arr = typeof body?.arr_iata === "string" ? body.arr_iata.toUpperCase() : null;
  return handle(dep, arr);
}
