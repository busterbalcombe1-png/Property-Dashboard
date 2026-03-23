import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useListProperties } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";

// ─── Fix Leaflet default icon broken paths in Vite ───────────────────────────
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

// ─── Types ────────────────────────────────────────────────────────────────────
interface GeocodedProperty {
  id: number;
  address: string;
  propertyType: string;
  bedrooms: number;
  monthlyRent: number;
  status: string;
  lat: number;
  lng: number;
}

// ─── Status → pin colour ─────────────────────────────────────────────────────
function pinColor(status: string): string {
  switch (status) {
    case "occupied":   return "#10b981"; // emerald
    case "vacant":     return "#f59e0b"; // amber
    case "maintenance":return "#ef4444"; // red
    case "refurb":     return "#8b5cf6"; // violet
    default:           return "#6b7280"; // grey
  }
}

function makePinIcon(status: string) {
  const colour = pinColor(status);
  return L.divIcon({
    className: "",
    html: `
      <div style="
        width: 18px; height: 18px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        background: ${colour};
        border: 2.5px solid white;
        box-shadow: 0 2px 6px rgba(0,0,0,0.35);
      "></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 18],
    popupAnchor: [0, -20],
  });
}

// ─── Fit map to markers ───────────────────────────────────────────────────────
function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  const fitted = useRef(false);
  useEffect(() => {
    if (points.length === 0 || fitted.current) return;
    if (points.length === 1) {
      map.setView(points[0], 11);
    } else {
      map.fitBounds(L.latLngBounds(points), { padding: [48, 48], maxZoom: 13 });
    }
    fitted.current = true;
  }, [points, map]);
  return null;
}

// ─── Geocode via Nominatim ────────────────────────────────────────────────────
const GEO_CACHE_KEY = "bpg_geocache_v1";

function loadCache(): Record<string, [number, number] | null> {
  try {
    return JSON.parse(sessionStorage.getItem(GEO_CACHE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function saveCache(cache: Record<string, [number, number] | null>) {
  try {
    sessionStorage.setItem(GEO_CACHE_KEY, JSON.stringify(cache));
  } catch {}
}

async function geocodeAddress(address: string): Promise<[number, number] | null> {
  const cache = loadCache();
  if (address in cache) return cache[address];

  try {
    const url = `https://nominatim.openstreetmap.org/search?` +
      new URLSearchParams({ q: address, countrycodes: "gb", format: "json", limit: "1" });

    const res = await fetch(url, {
      headers: { "Accept-Language": "en", "User-Agent": "BlackRidge-PropertyGroup/1.0" },
    });
    const data = await res.json();
    const result: [number, number] | null =
      data?.[0] ? [parseFloat(data[0].lat), parseFloat(data[0].lon)] : null;

    cache[address] = result;
    saveCache(cache);
    return result;
  } catch {
    return null;
  }
}

// ─── Format helpers ───────────────────────────────────────────────────────────
const fmt = (n: number) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(n);

// ─── Main Component ───────────────────────────────────────────────────────────
export function PropertyMap() {
  const { data: properties, isLoading } = useListProperties();
  const [geocoded, setGeocoded] = useState<GeocodedProperty[]>([]);
  const [geocoding, setGeocoding] = useState(false);
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!properties?.length) return;

    let cancelled = false;
    setGeocoding(true);

    (async () => {
      const results: GeocodedProperty[] = [];

      for (const p of properties) {
        if (cancelled) break;
        const coords = await geocodeAddress(p.address);
        if (coords) {
          results.push({
            id: p.id,
            address: p.address,
            propertyType: p.propertyType,
            bedrooms: p.bedrooms,
            monthlyRent: typeof p.monthlyRent === "string"
              ? parseFloat(p.monthlyRent)
              : (p.monthlyRent as number),
            status: p.status,
            lat: coords[0],
            lng: coords[1],
          });
          if (!cancelled) setGeocoded([...results]);
        }
        // Respect Nominatim rate limit: 1 req/s
        await new Promise(r => setTimeout(r, 1100));
      }

      if (!cancelled) setGeocoding(false);
    })();

    return () => { cancelled = true; };
  }, [properties]);

  const points = geocoded.map(p => [p.lat, p.lng] as [number, number]);

  // Status legend
  const statusCounts = geocoded.reduce<Record<string, number>>((acc, p) => {
    acc[p.status] = (acc[p.status] ?? 0) + 1;
    return acc;
  }, {});

  if (isLoading) {
    return <Skeleton className="h-[420px] w-full rounded-xl" />;
  }

  if (!properties?.length) {
    return (
      <div className="h-[420px] flex items-center justify-center text-muted-foreground text-sm border rounded-xl border-border/50">
        No properties to display on the map.
      </div>
    );
  }

  return (
    <div className="relative rounded-xl overflow-hidden border border-border/50 shadow-sm" style={{ height: 420 }}>
      {/* Loading overlay while geocoding */}
      {geocoding && geocoded.length === 0 && (
        <div className="absolute inset-0 z-[400] flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm gap-3">
          <div className="flex gap-1.5">
            {[0,1,2].map(i => (
              <div key={i} className="w-2 h-2 rounded-full bg-primary animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
          <p className="text-sm text-muted-foreground">Locating properties…</p>
        </div>
      )}

      <MapContainer
        center={[54.5, -2.5]}
        zoom={6}
        style={{ width: "100%", height: "100%" }}
        zoomControl={true}
        scrollWheelZoom={true}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />

        {points.length > 0 && <FitBounds points={points} />}

        {geocoded.map(prop => (
          <Marker
            key={prop.id}
            position={[prop.lat, prop.lng]}
            icon={makePinIcon(prop.status)}
          >
            <Popup className="property-popup" maxWidth={220}>
              <div className="py-0.5">
                <p className="font-semibold text-sm leading-snug text-foreground mb-1.5">
                  {prop.address.split(",")[0]}
                </p>
                <p className="text-xs text-muted-foreground mb-2">
                  {prop.propertyType} · {prop.bedrooms} bed
                </p>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold text-emerald-600">
                    {fmt(prop.monthlyRent)}<span className="text-xs font-normal text-muted-foreground">/mo</span>
                  </span>
                  <Badge
                    variant="outline"
                    className="capitalize text-[10px] px-1.5 py-0"
                    style={{ borderColor: pinColor(prop.status), color: pinColor(prop.status) }}
                  >
                    {prop.status}
                  </Badge>
                </div>
                <button
                  className="mt-2.5 text-xs text-primary underline-offset-2 hover:underline w-full text-left"
                  onClick={() => navigate(`/properties/${prop.id}`)}
                >
                  View property →
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Legend */}
      {geocoded.length > 0 && (
        <div className="absolute bottom-3 left-3 z-[400] bg-background/95 backdrop-blur-sm rounded-lg border border-border/50 shadow-md px-3 py-2 flex flex-wrap gap-x-4 gap-y-1">
          {Object.entries(statusCounts).map(([status, count]) => (
            <div key={status} className="flex items-center gap-1.5 text-xs text-foreground">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: pinColor(status) }} />
              <span className="capitalize">{status}</span>
              <span className="text-muted-foreground">({count})</span>
            </div>
          ))}
        </div>
      )}

      {/* Progress indicator: geocoding but some already found */}
      {geocoding && geocoded.length > 0 && (
        <div className="absolute top-3 right-3 z-[400] bg-background/90 backdrop-blur-sm rounded-md border border-border/50 px-2.5 py-1.5 text-xs text-muted-foreground flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          Locating {geocoded.length}/{properties?.length}…
        </div>
      )}
    </div>
  );
}
