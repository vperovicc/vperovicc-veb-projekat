import { useEffect, useRef, useState } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Activity } from '../models/types';
import { MapPin } from 'lucide-react';

// ── Fix Leaflet's broken default icon paths when bundled with Vite ──────────
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

// ── Rustic parchment-themed custom icon ─────────────────────────────────────
const rustIcon = new L.DivIcon({
  className: '',
  html: `<div style="
    width:28px; height:28px; background:#8B3A2A; border:2px solid #704214;
    border-radius:50% 50% 50% 0; transform:rotate(-45deg);
    box-shadow:2px 2px 4px rgba(0,0,0,0.4);
  "></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 28],
  popupAnchor: [0, -32],
});

// ── Geocoder hook: resolves a location string → [lat, lng] via Nominatim ───
async function geocode(location: string): Promise<[number, number] | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}&limit=1`;
    const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
    const data = await res.json();
    if (data.length > 0) {
      return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
    }
  } catch (_) {}
  return null;
}

// ── Fit map to all markers ───────────────────────────────────────────────────
const FitBounds = ({ coords }: { coords: [number, number][] }) => {
  const map = useMap();
  useEffect(() => {
    if (coords.length === 0) return;
    if (coords.length === 1) {
      map.setView(coords[0], 12);
    } else {
      map.fitBounds(L.latLngBounds(coords), { padding: [40, 40] });
    }
  }, [coords, map]);
  return null;
};

// ── Props ────────────────────────────────────────────────────────────────────
interface TravelMapProps {
  activities: Activity[];
  /** Optional: filter to a specific date (YYYY-MM-DD) to show a single day's route */
  filterDate?: string;
}

// ── Main component ───────────────────────────────────────────────────────────
export const TravelMap = ({ activities, filterDate }: TravelMapProps) => {
  const [resolvedPoints, setResolvedPoints] = useState<
    { activity: Activity; coords: [number, number] }[]
  >([]);
  const [geocoding, setGeocoding] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(filterDate ?? 'all');
  const geocacheRef = useRef<Map<string, [number, number] | null>>(new Map());

  // Unique sorted dates from activities
  const uniqueDates = Array.from(
    new Set(activities.map(a => a.date.substring(0, 10)))
  ).sort();

  // Activities to display based on selected date
  const filtered = selectedDate === 'all'
    ? [...activities].sort((a, b) => a.date.localeCompare(b.date))
    : activities
        .filter(a => a.date.substring(0, 10) === selectedDate)
        .sort((a, b) => a.date.localeCompare(b.date));

  const locateable = filtered.filter(a => a.location && a.location !== 'TBD');

  useEffect(() => {
    if (locateable.length === 0) {
      setResolvedPoints([]);
      return;
    }

    let cancelled = false;
    setGeocoding(true);

    (async () => {
      const results: { activity: Activity; coords: [number, number] }[] = [];

      for (const act of locateable) {
        const key = act.location.trim().toLowerCase();

        let coords: [number, number] | null = null;
        if (geocacheRef.current.has(key)) {
          coords = geocacheRef.current.get(key)!;
        } else {
          coords = await geocode(act.location);
          geocacheRef.current.set(key, coords);
          // Nominatim rate limit: 1 req/sec
          await new Promise(r => setTimeout(r, 1100));
        }

        if (cancelled) return;
        if (coords) results.push({ activity: act, coords });
      }

      if (!cancelled) {
        setResolvedPoints(results);
        setGeocoding(false);
      }
    })();

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, activities.length]);

  const coords = resolvedPoints.map(p => p.coords);

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <label className="font-functional text-xs uppercase text-ink-light">Filter by Day:</label>
        <select
          value={selectedDate}
          onChange={e => setSelectedDate(e.target.value)}
          className="bg-cream border border-sepia/40 text-xs font-mono px-2 py-1.5 rounded-sm"
        >
          <option value="all">Entire Journey</option>
          {uniqueDates.map(d => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
        {geocoding && (
          <span className="text-xs font-functional text-ink-light italic animate-pulse">
            Consulting the cartographer...
          </span>
        )}
      </div>

      {/* No locatable activities */}
      {!geocoding && locateable.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-10 text-center text-ink-light">
          <MapPin className="w-8 h-8 text-sepia/40" />
          <p className="font-display text-sm uppercase">No charted territories for this selection.</p>
          <p className="text-xs font-body">Add activities with real location names to plot them on the map.</p>
        </div>
      )}

      {/* Map */}
      {locateable.length > 0 && (
        <div
          className="border-2 border-sepia rounded-sm overflow-hidden shadow-md"
          style={{ height: '480px' }}
        >
          <MapContainer
            center={[48, 15]}
            zoom={5}
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom
          >
            {/* Stamen Watercolor-style tile — warm, map-like, fits the parchment theme */}
            <TileLayer
              url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />

            <FitBounds coords={coords} />

            {/* Route polyline */}
            {coords.length > 1 && (
              <Polyline
                positions={coords}
                pathOptions={{ color: '#8B3A2A', weight: 3, dashArray: '6 4', opacity: 0.85 }}
              />
            )}

            {/* Markers */}
            {resolvedPoints.map(({ activity: act, coords: pos }, idx) => (
              <Marker key={act.id} position={pos} icon={rustIcon}>
                <Popup>
                  <div style={{ fontFamily: 'serif', minWidth: 140 }}>
                    <strong style={{ color: '#8B3A2A', fontSize: 13 }}>
                      {idx + 1}. {act.name}
                    </strong>
                    <br />
                    <span style={{ fontSize: 11, color: '#5C3D2E' }}>
                      {act.date.substring(0, 10)} @ {act.date.substring(11, 16)}
                    </span>
                    <br />
                    <span style={{ fontSize: 11, color: '#704214' }}>{act.location}</span>
                    {act.status && (
                      <>
                        <br />
                        <span style={{ fontSize: 10, color: '#B8860B', textTransform: 'uppercase' }}>
                          {act.status}
                        </span>
                      </>
                    )}
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      )}

      {/* Legend */}
      {resolvedPoints.length > 0 && (
        <div className="border border-sepia/20 bg-cream rounded-sm p-3">
          <h5 className="font-display text-xs uppercase text-ink mb-2 border-b border-sepia/20 pb-1">
            Route Order
          </h5>
          <ol className="space-y-1">
            {resolvedPoints.map(({ activity: act }, idx) => (
              <li key={act.id} className="flex items-center gap-2 text-xs font-body text-ink-light">
                <span className="w-5 h-5 flex-shrink-0 rounded-full bg-rust text-parchment flex items-center justify-center text-[10px] font-bold">
                  {idx + 1}
                </span>
                <span className="font-display text-ink">{act.name}</span>
                <span className="font-mono text-[10px]">— {act.location}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
};