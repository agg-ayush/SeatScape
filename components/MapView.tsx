"use client";

import { useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Polyline,
  CircleMarker,
  Pane,
  useMap,
} from "react-leaflet";
import type { Sample } from "@/lib/types";
import L from "leaflet";

type Props = { samples: Sample[] | null };

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

export default function MapView({ samples }: Props) {
  if (!samples || samples.length < 2) return null;

  const latlngs = samples.map((s) => [s.lat, s.lon]) as [number, number][];
  const firstSunIdx = samples.findIndex((s) => s.alt >= 5);
  const lastSunIdxFromEnd = [...samples].reverse().findIndex((s) => s.alt >= 5);
  const lastIdx =
    lastSunIdxFromEnd >= 0 ? samples.length - 1 - lastSunIdxFromEnd : -1;

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

        {/* markers above line */}
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

        <FitBounds samples={samples} />
      </MapContainer>
    </div>
  );
}
