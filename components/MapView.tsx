"use client";

import { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Polyline,
  CircleMarker,
  Pane,
  useMap,
  Popup,
  Tooltip,
} from "react-leaflet";
import type { Sample } from "@/lib/types";
import type { PassBy } from "@/lib/cities";
import L from "leaflet";

type Props = {
  samples: Sample[] | null;
  cities?: PassBy[];
  thresholdKm?: number;
  /** Origin timezone (IANA). Currently unused by the map, but accepted for prop-compat */
  originTZ?: string;
};

const FitBounds = ({ samples }: { samples: Sample[] }) => {
  const map = useMap();
  useEffect(() => {
    if (!samples.length) return;
    const latlngs = samples.map((s) => [s.lat, s.lon]) as [number, number][];
    const bounds = L.latLngBounds(latlngs);
    map.fitBounds(bounds, { padding: [24, 24] });
  }, [samples, map]);
  return null;
};

export default function MapView({ samples, cities = [], thresholdKm = 75 }: Props) {
  const [legendOpen, setLegendOpen] = useState(true);
  if (!samples || samples.length < 2) return null;

  const latlngs = samples.map((s) => [s.lat, s.lon]) as [number, number][];
  const firstSunIdx = samples.findIndex((s) => s.alt >= 5);
  const lastSunIdxFromEnd = [...samples].reverse().findIndex((s) => s.alt >= 5);
  const lastIdx = lastSunIdxFromEnd >= 0 ? samples.length - 1 - lastSunIdxFromEnd : -1;

  function cityStyle(side: "A" | "F", dist: number) {
    const t = Math.max(10, thresholdKm);
    const ratio = Math.min(1, Math.max(0, dist / t));
    const radius = Math.round(10 - 6 * ratio); // 4..10
    const opacity = Math.round((1 - 0.75 * ratio) * 100) / 100; // 0.25..1
    const color = side === "A" ? "#a855f7" : "#f97316"; // purple/orange
    return { radius, opacity, color };
  }

  return (
    <div className="relative overflow-hidden rounded-2xl shadow bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
      <MapContainer
        style={{ height: 420, width: "100%" }}
        center={[latlngs[0][0], latlngs[0][1]]}
        zoom={4}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* route line below markers */}
        <Pane name="route" style={{ zIndex: 400 }}>
          <Polyline positions={latlngs} />
        </Pane>

        {/* city markers */}
        <Pane name="city-markers" style={{ zIndex: 600 }}>
          {cities.map((c, i) => {
            const { radius, opacity, color } = cityStyle(c.side, c.distanceKm);
            return (
              <CircleMarker
                key={`${c.name}-${i}`}
                center={[c.lat, c.lon]}
                radius={radius}
                pathOptions={{
                  color,
                  weight: 1.5,
                  fillColor: color,
                  fillOpacity: opacity,
                }}
              >
                <Popup>
                  <div className="text-sm">
                    <div className="font-semibold">{c.name}</div>
                    <div className="text-xs text-zinc-600">~{c.distanceKm} km • {c.side === "A" ? "left" : "right"}</div>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
        </Pane>

        {/* sun markers (top) */}
        <Pane name="sun-markers" style={{ zIndex: 700 }}>
          {firstSunIdx >= 0 && (
            <CircleMarker
              center={[samples[firstSunIdx].lat, samples[firstSunIdx].lon]}
              radius={7}
              pathOptions={{
                color: "#22c55e",
                weight: 2,
                fillColor: "#22c55e",
                fillOpacity: 1,
              }}
            >
              <Tooltip direction="top" offset={[0, -8]} opacity={1}>first sun</Tooltip>
            </CircleMarker>
          )}
          {lastIdx >= 0 && lastIdx !== firstSunIdx && (
            <CircleMarker
              center={[samples[lastIdx].lat, samples[lastIdx].lon]}
              radius={7}
              pathOptions={{
                color: "#ef4444",
                weight: 2,
                fillColor: "#ef4444",
                fillOpacity: 1,
              }}
            >
              <Tooltip direction="top" offset={[0, -8]} opacity={1}>last sun</Tooltip>
            </CircleMarker>
          )}
        </Pane>

        <FitBounds samples={samples} />
      </MapContainer>

      {/* Legend (bottom-left) */}
      <div className="absolute left-3 bottom-3 z-[800]">
        <div className="rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white/90 dark:bg-zinc-900/80 backdrop-blur p-2 shadow">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-medium text-zinc-700 dark:text-zinc-200">Legend</span>
            <button
              className="text-xs px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700"
              onClick={() => setLegendOpen(v => !v)}
              aria-label="Toggle legend"
              type="button"
            >
              {legendOpen ? "–" : "+"}
            </button>
          </div>
          {legendOpen && (
            <div className="mt-2 space-y-1 text-xs">
              <div className="flex items-center gap-2">
                <span className="inline-block h-2 w-2 rounded-full" style={{background:"#22c55e"}}></span>
                <span>First sun</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block h-2 w-2 rounded-full" style={{background:"#ef4444"}}></span>
                <span>Last sun</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block h-2 w-2 rounded-full" style={{background:"#a855f7"}}></span>
                <span>Left-side city</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block h-2 w-2 rounded-full" style={{background:"#f97316"}}></span>
                <span>Right-side city</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}