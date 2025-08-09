"use client";

import { useEffect, useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  Polyline,
  CircleMarker,
  Pane,
  Tooltip,
  useMap,
} from "react-leaflet";
import type { Sample } from "@/lib/types";
import L from "leaflet";

// cities + helpers
import cities from "@/lib/cities.json";
import { distancesToGreatCircle, markerVisuals } from "@/lib/cities";

type Props = {
  samples: Sample[] | null;
  /** Show cities up to this cross-track distance (km). Defaults to 75. */
  thresholdKm?: number;
  /** Scrubber progress 0..1 to position a plane marker along the route. */
  progress?: number;
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

export default function MapView({
  samples,
  thresholdKm = 75,
  progress = 0,
}: Props) {
  const cityDistances = useMemo(() => {
    try {
      if (!samples || samples.length < 2) return [];
      return distancesToGreatCircle(samples, cities as any, thresholdKm);
    } catch {
      return [];
    }
  }, [samples, thresholdKm]);

  const planeIdx = useMemo(() => {
    if (!samples || samples.length < 2) return -1;
    const n = samples.length;
    const idx = Math.max(0, Math.min(n - 1, Math.round(progress * (n - 1))));
    return idx;
  }, [samples, progress]);

  if (!samples || samples.length < 2) return null;

  const latlngs = samples.map((s) => [s.lat, s.lon]) as [number, number][];

  const firstSunIdx = samples.findIndex((s) => s.alt >= 5);
  const lastSunIdxFromEnd = [...samples].reverse().findIndex((s) => s.alt >= 5);
  const lastIdx =
    lastSunIdxFromEnd >= 0 ? samples.length - 1 - lastSunIdxFromEnd : -1;

  const plane = planeIdx >= 0 ? samples[planeIdx] : null;

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

        {/* city pins (variable size/opacity by distance), above route */}
        <Pane name="citypins" style={{ zIndex: 500 }}>
          {cityDistances
            .filter((d) => d.distanceKm <= thresholdKm)
            .map((d, idx) => {
              const { radius, opacity } = markerVisuals(
                d.distanceKm,
                thresholdKm
              );
              return (
                <CircleMarker
                  key={`${d.name}-${idx}`}
                  center={[d.lat, d.lon]}
                  radius={radius}
                  pathOptions={{
                    color: "#3b82f6",
                    weight: 1.5,
                    fillColor: "#3b82f6",
                    fillOpacity: opacity,
                    opacity: opacity,
                  }}
                >
                  <Tooltip direction="top" offset={[0, -6]} opacity={0.95}>
                    <div className="text-xs">
                      <div className="font-medium">{d.name}</div>
                      <div>
                        {d.side === "A" ? "left" : "right"} • ~
                        {d.distanceKm.toFixed(0)} km
                      </div>
                    </div>
                  </Tooltip>
                </CircleMarker>
              );
            })}
        </Pane>

        {/* sun markers above line & cities */}
        <Pane name="markers" style={{ zIndex: 650 }}>
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
            />
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
            />
          )}
        </Pane>

        {/* plane marker on top */}
        {plane && (
          <Pane name="plane" style={{ zIndex: 700 }}>
            <CircleMarker
              center={[plane.lat, plane.lon]}
              radius={6}
              pathOptions={{
                color: "#111827",
                weight: 2,
                fillColor: "#111827",
                fillOpacity: 1,
              }}
            >
              <Tooltip direction="top" offset={[0, -6]} opacity={0.95}>
                <div className="text-xs">
                  <div className="font-medium">Now</div>
                  <div>
                    {plane.side === "A"
                      ? "left"
                      : plane.side === "F"
                      ? "right"
                      : "none"}{" "}
                    • alt {Math.round(plane.alt)}° • az {Math.round(plane.az)}°
                  </div>
                </div>
              </Tooltip>
            </CircleMarker>
          </Pane>
        )}

        <FitBounds samples={samples} />
      </MapContainer>
    </div>
  );
}
