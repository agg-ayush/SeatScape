import type { NextApiRequest, NextApiResponse } from "next";

const FLIGHT_IATA_PATTERN = /^[A-Za-z0-9]{2,10}$/;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).end("Method Not Allowed");
  }

  const flightIataRaw = Array.isArray(req.query.flight_iata)
    ? req.query.flight_iata[0]
    : req.query.flight_iata;

  if (typeof flightIataRaw !== "string" || !FLIGHT_IATA_PATTERN.test(flightIataRaw)) {
    return res.status(400).json({ error: "Invalid or missing flight_iata" });
  }

  const flightIata = flightIataRaw.toUpperCase();
  const apiKey = process.env.AVIATIONSTACK_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Server configuration error" });
  }

  try {
    const url = new URL("http://api.aviationstack.com/v1/flights");
    url.searchParams.set("access_key", apiKey);
    url.searchParams.set("flight_iata", flightIata);

    const response = await fetch(url.toString());
    if (!response.ok) {
      return res
        .status(response.status)
        .json({ error: "Failed to fetch flight status" });
    }
    const data = await response.json();
    return res.status(200).json(data);
  } catch {
    return res.status(502).json({ error: "Upstream request failed" });
  }
}
