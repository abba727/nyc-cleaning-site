import { useCallback, useEffect, useRef, useState } from "react";
import type * as Leaflet from "leaflet";
import { cn } from "@/lib/utils";

// Keep map-only styling out of the initial public CSS while avoiding a CSS
// module import during Node server rendering.
if (typeof window !== "undefined") {
  void import("leaflet/dist/leaflet.css");
}

export type MapMarker = {
  id: number;
  latitude: number;
  longitude: number;
};

type MapCenter = [number, number];
type GoogleLatLngLiteral = { lat: number; lng: number };

type GoogleMapHandle = {
  setCenter: (center: GoogleLatLngLiteral) => void;
  setZoom: (zoom: number) => void;
  fitBounds: (bounds: GoogleBounds, padding?: number) => void;
};

type GoogleBounds = {
  extend: (position: GoogleLatLngLiteral) => void;
};

type GoogleCircle = {
  setMap: (map: GoogleMapHandle | null) => void;
};

type GoogleMapsApi = {
  Map: new (element: HTMLElement, options: {
    center: GoogleLatLngLiteral;
    zoom: number;
    clickableIcons?: boolean;
    fullscreenControl?: boolean;
    mapTypeControl?: boolean;
    streetViewControl?: boolean;
    zoomControl?: boolean;
    gestureHandling?: "auto" | "cooperative" | "greedy" | "none";
  }) => GoogleMapHandle;
  Circle: new (options: {
    map: GoogleMapHandle;
    center: GoogleLatLngLiteral;
    radius: number;
    clickable?: boolean;
    strokeColor: string;
    strokeOpacity: number;
    strokeWeight: number;
    fillColor: string;
    fillOpacity: number;
  }) => GoogleCircle;
  LatLngBounds: new () => GoogleBounds;
};

declare global {
  interface Window {
    google?: { maps?: GoogleMapsApi };
  }
}

interface MapViewProps {
  className?: string;
  googleMapsApiKey?: string | null;
  initialCenter?: MapCenter;
  initialZoom?: number;
  markers?: MapMarker[];
  onMapReady?: (map: Leaflet.Map | GoogleMapHandle) => void;
  onMapError?: () => void;
}

const NYC_CENTER: MapCenter = [40.7128, -74.006];
const GOOGLE_SCRIPT_ID = "nyc-cleaning-google-maps-sdk";
const SERVICE_MARKER_STYLE: Leaflet.CircleMarkerOptions = {
  radius: 6.5,
  color: "#06285c",
  weight: 1.75,
  fillColor: "#0a3d91",
  fillOpacity: 0.96,
};

let googleMapsLoader: Promise<GoogleMapsApi> | null = null;

function getValidMarkers(markers: MapMarker[]) {
  return markers.filter(marker => (
    Number.isFinite(marker.latitude)
    && Number.isFinite(marker.longitude)
    && marker.latitude >= -90
    && marker.latitude <= 90
    && marker.longitude >= -180
    && marker.longitude <= 180
  ));
}

function loadGoogleMaps(apiKey: string) {
  const readyMaps = window.google?.maps;
  if (readyMaps?.Map) return Promise.resolve(readyMaps);
  if (googleMapsLoader) return googleMapsLoader;

  googleMapsLoader = new Promise<GoogleMapsApi>((resolve, reject) => {
    const existingScript = document.getElementById(GOOGLE_SCRIPT_ID) as HTMLScriptElement | null;
    const script = existingScript || document.createElement("script");
    let finished = false;

    const fail = () => {
      if (finished) return;
      finished = true;
      googleMapsLoader = null;
      window.clearTimeout(timeout);
      if (!existingScript) script.remove();
      reject(new Error("Google Maps could not be loaded"));
    };

    const succeed = () => {
      const maps = window.google?.maps;
      if (finished || !maps?.Map) {
        fail();
        return;
      }
      finished = true;
      window.clearTimeout(timeout);
      resolve(maps);
    };

    const timeout = window.setTimeout(fail, 12_000);
    script.addEventListener("load", succeed, { once: true });
    script.addEventListener("error", fail, { once: true });

    if (!existingScript) {
      script.id = GOOGLE_SCRIPT_ID;
      script.async = true;
      script.defer = true;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly`;
      document.head.appendChild(script);
    }
  });

  return googleMapsLoader;
}

function GoogleMapView({
  className,
  googleMapsApiKey,
  initialCenter = NYC_CENTER,
  initialZoom = 11,
  markers = [],
  onMapReady,
  onUnavailable,
}: MapViewProps & { googleMapsApiKey: string; onUnavailable: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<GoogleMapHandle | null>(null);
  const mapsRef = useRef<GoogleMapsApi | null>(null);
  const circlesRef = useRef<GoogleCircle[]>([]);
  const onMapReadyRef = useRef(onMapReady);
  const [mapVersion, setMapVersion] = useState(0);

  useEffect(() => {
    onMapReadyRef.current = onMapReady;
  }, [onMapReady]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) return;
    let disposed = false;

    void loadGoogleMaps(googleMapsApiKey)
      .then(maps => {
        if (disposed) return;
        const map = new maps.Map(container, {
          center: { lat: initialCenter[0], lng: initialCenter[1] },
          zoom: initialZoom,
          clickableIcons: false,
          fullscreenControl: false,
          mapTypeControl: false,
          streetViewControl: false,
          zoomControl: true,
          gestureHandling: "cooperative",
        });
        mapsRef.current = maps;
        mapRef.current = map;
        onMapReadyRef.current?.(map);
        setMapVersion(version => version + 1);
      })
      .catch(() => {
        if (!disposed) onUnavailable();
      });

    return () => {
      disposed = true;
      circlesRef.current.forEach(circle => circle.setMap(null));
      circlesRef.current = [];
      mapsRef.current = null;
      mapRef.current = null;
    };
    // The initial view is intentionally applied only once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialZoom, onUnavailable]);

  useEffect(() => {
    const map = mapRef.current;
    const maps = mapsRef.current;
    if (!map || !maps) return;

    circlesRef.current.forEach(circle => circle.setMap(null));
    const validMarkers = getValidMarkers(markers);
    circlesRef.current = validMarkers.map(marker => new maps.Circle({
      map,
      center: { lat: marker.latitude, lng: marker.longitude },
      radius: 95,
      clickable: false,
      strokeColor: "#06285c",
      strokeOpacity: 1,
      strokeWeight: 2.25,
      fillColor: "#0a3d91",
      fillOpacity: 0.9,
    }));

    if (validMarkers.length === 1) {
      map.setCenter({ lat: validMarkers[0].latitude, lng: validMarkers[0].longitude });
      map.setZoom(14);
    } else if (validMarkers.length > 1) {
      const bounds = new maps.LatLngBounds();
      validMarkers.forEach(marker => bounds.extend({ lat: marker.latitude, lng: marker.longitude }));
      map.fitBounds(bounds, 12);
    }
  }, [markers, mapVersion]);

  return <div ref={containerRef} className={cn("h-[500px] w-full", className)} aria-label="Map of NYC Cleaning service locations" role="region" />;
}

function LeafletMapView({
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
    // The initial view is intentionally applied only once; marker updates manage later bounds.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialZoom]);

  useEffect(() => {
    const map = mapRef.current;
    const markerLayer = markerLayerRef.current;
    if (!map || !markerLayer) return;

    markerLayer.clearLayers();
    const validMarkers = getValidMarkers(markers);

    void import("leaflet").then(({ default: L }) => {
      if (mapRef.current !== map || markerLayerRef.current !== markerLayer) return;

      for (const marker of validMarkers) {
        // Public markers intentionally carry no property identity or address data.
        L.circleMarker([marker.latitude, marker.longitude], SERVICE_MARKER_STYLE)
          .addTo(markerLayer);
      }

      if (validMarkers.length === 1) {
        map.setView([validMarkers[0].latitude, validMarkers[0].longitude], 14);
      } else if (validMarkers.length > 1) {
        const bounds = L.latLngBounds(validMarkers.map(marker => [marker.latitude, marker.longitude] as Leaflet.LatLngTuple));
        map.fitBounds(bounds.pad(0.03), { padding: [12, 12], maxZoom: 14 });
      }

      window.setTimeout(() => map.invalidateSize(), 0);
    }).catch(() => onMapErrorRef.current?.());
  }, [markers, mapVersion]);

  return <div ref={containerRef} className={cn("h-[500px] w-full", className)} aria-label="Map of NYC Cleaning service locations" role="region" />;
}

/**
 * The public map prefers the dedicated, domain-restricted Google Maps key. If
 * that script cannot load, the existing Leaflet/OpenStreetMap renderer takes
 * over automatically so the Service Area page remains usable.
 */
export function MapView({ googleMapsApiKey, ...props }: MapViewProps) {
  const normalizedGoogleMapsApiKey = googleMapsApiKey?.trim() || "";
  const [googleUnavailable, setGoogleUnavailable] = useState(false);
  const handleGoogleUnavailable = useCallback(() => setGoogleUnavailable(true), []);

  useEffect(() => {
    setGoogleUnavailable(false);
  }, [normalizedGoogleMapsApiKey]);

  if (normalizedGoogleMapsApiKey && !googleUnavailable) {
    return <GoogleMapView {...props} googleMapsApiKey={normalizedGoogleMapsApiKey} onUnavailable={handleGoogleUnavailable} />;
  }

  return <LeafletMapView {...props} />;
}
