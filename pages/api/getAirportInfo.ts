import type { NextApiRequest, NextApiResponse } from "next";

const IATA_CODE_PATTERN = /^[A-Za-z]{3}$/;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).end("Method Not Allowed");
  }

  const codeRaw = Array.isArray(req.query.iata_code)
    ? req.query.iata_code[0]
    : req.query.iata_code;

  if (typeof codeRaw !== "string" || !IATA_CODE_PATTERN.test(codeRaw)) {
    return res.status(400).json({ error: "Invalid or missing iata_code" });
  }

  const iataCode = codeRaw.toUpperCase();
  const apiKey = process.env.AVIATIONSTACK_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Server configuration error" });
  }

  try {
    const url = new URL("http://api.aviationstack.com/v1/airports");
    url.searchParams.set("access_key", apiKey);
    url.searchParams.set("iata_code", iataCode);

    const response = await fetch(url.toString());
    if (!response.ok) {
      return res
        .status(response.status)
        .json({ error: "Failed to fetch airport info" });
    }
    const data = await response.json();
    return res.status(200).json(data);
  } catch {
    return res.status(502).json({ error: "Upstream request failed" });
  }
}
