import { useEffect, useRef, useState } from "react";
import type * as Leaflet from "leaflet";
import "leaflet/dist/leaflet.css";
import { cn } from "@/lib/utils";

export type MapMarker = {
  id: number;
  latitude: number;
  longitude: number;
  title: string;
};

interface MapViewProps {
  className?: string;
  initialCenter?: Leaflet.LatLngExpression;
  initialZoom?: number;
  markers?: MapMarker[];
  onMapReady?: (map: Leaflet.Map) => void;
  onMapError?: () => void;
}

const NYC_CENTER: Leaflet.LatLngExpression = [40.7128, -74.006];
const SERVICE_MARKER_STYLE: Leaflet.CircleMarkerOptions = {
  radius: 5,
  color: "#08243d",
  weight: 1.5,
  fillColor: "#56c9c3",
  fillOpacity: 0.95,
};

/**
 * A public map renderer with no browser API key. Leaflet is loaded only in the
 * browser so server-rendered pages and metadata do not depend on browser APIs.
 */
export function MapView({
  className,
  initialCenter = NYC_CENTER,
  initialZoom = 11,
  markers = [],
  onMapReady,
  onMapError,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const markerLayerRef = useRef<Leaflet.LayerGroup | null>(null);
  const onMapReadyRef = useRef(onMapReady);
  const onMapErrorRef = useRef(onMapError);
  const [mapVersion, setMapVersion] = useState(0);

  useEffect(() => {
    onMapReadyRef.current = onMapReady;
    onMapErrorRef.current = onMapError;
  }, [onMapError, onMapReady]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) return;
    let disposed = false;

    void import("leaflet")
      .then(({ default: L }) => {
        if (disposed || mapRef.current) return;

        const map = L.map(container, {
          center: initialCenter,
          zoom: initialZoom,
          scrollWheelZoom: false,
          zoomControl: true,
          attributionControl: true,
        });
        mapRef.current = map;
        markerLayerRef.current = L.layerGroup().addTo(map);

        const tiles = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
          maxZoom: 19,
          crossOrigin: true,
        });
        tiles.on("tileerror", () => onMapErrorRef.current?.());
        tiles.addTo(map);
        onMapReadyRef.current?.(map);
        setMapVersion(version => version + 1);
      })
      .catch(() => onMapErrorRef.current?.());

    return () => {
      disposed = true;
      markerLayerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  // The initial view is intentionally applied once; marker updates manage later bounds.
  // This avoids tearing down the map when a parent rerenders with an equivalent array.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialZoom]);

  useEffect(() => {
    const map = mapRef.current;
    const markerLayer = markerLayerRef.current;
    if (!map || !markerLayer) return;

    markerLayer.clearLayers();
    const validMarkers = markers.filter(marker => (
      Number.isFinite(marker.latitude)
      && Number.isFinite(marker.longitude)
      && marker.latitude >= -90
      && marker.latitude <= 90
      && marker.longitude >= -180
      && marker.longitude <= 180
    ));

    void import("leaflet").then(({ default: L }) => {
      if (mapRef.current !== map || markerLayerRef.current !== markerLayer) return;

      for (const marker of validMarkers) {
        L.circleMarker([marker.latitude, marker.longitude], SERVICE_MARKER_STYLE)
          .bindTooltip(marker.title, { direction: "top", opacity: 0.95 })
          .addTo(markerLayer);
      }

      if (validMarkers.length === 1) {
        map.setView([validMarkers[0].latitude, validMarkers[0].longitude], 14);
      } else if (validMarkers.length > 1) {
        const bounds = L.latLngBounds(validMarkers.map(marker => [marker.latitude, marker.longitude] as Leaflet.LatLngTuple));
        map.fitBounds(bounds.pad(0.1), { padding: [48, 48], maxZoom: 13 });
      }

      window.setTimeout(() => map.invalidateSize(), 0);
    }).catch(() => onMapErrorRef.current?.());
  }, [markers, mapVersion]);

  return <div ref={containerRef} className={cn("h-[500px] w-full", className)} aria-label="Map of NYC Cleaning service locations" role="region" />;
}
