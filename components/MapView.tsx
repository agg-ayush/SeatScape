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
  Marker,
} from "react-leaflet";
import type { Sample } from "@/lib/types";
import type { PassBy } from "@/lib/cities";
import L from "leaflet";
import {
  gcDistanceKm,
  intermediatePoint,
  splitAtAntimeridian,
} from "@/lib/geo";

type Props = {
  samples: Sample[] | null;
  cities?: PassBy[];
  thresholdKm?: number;
  sunriseIndex?: number;
  sunsetIndex?: number;
  sunriseCity?: string;
  sunsetCity?: string;
  planeIndex?: number;
};

const FitBounds = ({ points }: { points: { lat: number; lon: number }[] }) => {
  const map = useMap();
  useEffect(() => {
    if (!points.length) return;
    const latlngs = points.map((p) => [p.lat, p.lon]) as [number, number][];
    const bounds = L.latLngBounds(latlngs);
    map.fitBounds(bounds, { padding: [24, 24] });
  }, [points, map]);
  return null;
};

export default function MapView({ samples, cities = [], thresholdKm = 75, sunriseIndex, sunsetIndex, sunriseCity, sunsetCity, planeIndex }: Props) {
  const [legendOpen, setLegendOpen] = useState(true);
  if (!samples || samples.length < 2) return null;

  const origin = { lat: samples[0].lat, lon: samples[0].lon };
  const dest = { lat: samples[samples.length - 1].lat, lon: samples[samples.length - 1].lon };
  const distanceKm = gcDistanceKm(origin, dest);
  const pointCount = Math.min(512, Math.max(128, Math.ceil(distanceKm / 50) + 1));
  const gcPoints: [number, number][] = [];
  for (let i = 0; i < pointCount; i++) {
    const f = i / (pointCount - 1);
    const p = intermediatePoint(origin, dest, f);
    gcPoints.push([p.lon, p.lat]);
  }
  const segments = splitAtAntimeridian(gcPoints);
  const flatPoints = segments.flat().map(([lon, lat]) => ({ lat, lon }));
  const sunriseSample = sunriseIndex !== undefined ? samples[sunriseIndex] : null;
  const sunsetSample = sunsetIndex !== undefined ? samples[sunsetIndex] : null;
  const sunriseIcon = L.divIcon({ className: "", html: "🌅", iconSize: [20, 20], iconAnchor: [10, 10] });
  const sunsetIcon = L.divIcon({ className: "", html: "🌇", iconSize: [20, 20], iconAnchor: [10, 10] });
  const planeSample = planeIndex !== undefined ? samples[Math.min(planeIndex, samples.length - 1)] : null;
  const planeIcon = L.divIcon({
    className: "opacity-90",
    html: "<span style='font-size:24px'>✈️</span>",
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });

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
        center={[samples[0].lat, samples[0].lon]}
        zoom={4}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* route line below markers */}
        <Pane name="route" style={{ zIndex: 400 }}>
          {segments.map((seg, i) => (
            <Polyline key={i} positions={seg.map(([lon, lat]) => [lat, lon])} />
          ))}
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

        {/* plane marker */}
        <Pane name="plane-marker" style={{ zIndex: 650 }}>
          {planeSample && <Marker position={[planeSample.lat, planeSample.lon]} icon={planeIcon} opacity={0.9} />}
        </Pane>

        {/* sun markers (top) */}
        <Pane name="sun-markers" style={{ zIndex: 700 }}>
          {sunriseSample && (
            <Marker position={[sunriseSample.lat, sunriseSample.lon]} icon={sunriseIcon}>
              <Tooltip direction="top" offset={[0, -8]} opacity={1}>
                Sunrise{sunriseCity ? ` near ${sunriseCity}` : ""}
              </Tooltip>
            </Marker>
          )}
          {sunsetSample && (
            <Marker position={[sunsetSample.lat, sunsetSample.lon]} icon={sunsetIcon}>
              <Tooltip direction="top" offset={[0, -8]} opacity={1}>
                Sunset{sunsetCity ? ` near ${sunsetCity}` : ""}
              </Tooltip>
            </Marker>
          )}
        </Pane>

        <FitBounds points={flatPoints} />
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
                <span className="inline-block">🌅</span>
                <span>Sunrise</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block">🌇</span>
                <span>Sunset</span>
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
