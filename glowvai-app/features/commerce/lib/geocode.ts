import { getDeviceCurrentLocation } from '../../../core/services/locationService';
// Free OpenStreetMap Nominatim search, the same geocoder the mobile location screens used. No API key.

export interface PlaceResult {
  id: string;
  name: string;
  locality: string;
  latitude: number;
  longitude: number;
  pincode?: string;
}

export const searchPlaces = async (query: string, limit = 8): Promise<PlaceResult[]> => {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=in&addressdetails=1&limit=${limit}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error('search failed');
  const data = (await res.json()) as any[];
  return (Array.isArray(data) ? data : []).map((r, idx) => ({
    id: `place-${r.place_id ?? idx}`,
    name: r.display_name?.split(',').slice(0, 2).join(',').trim() || r.display_name,
    locality: r.display_name,
    latitude: parseFloat(r.lat),
    longitude: parseFloat(r.lon),
    pincode: r.address?.postcode,
  }));
};

// Address for a coordinate from the same Nominatim service. Null when nothing is found.
export const reversePlace = async (latitude: number, longitude: number): Promise<PlaceResult | null> => {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error('reverse lookup failed');
  const r = (await res.json()) as any;
  if (!r || !r.display_name) return null;
  return {
    id: `place-${r.place_id ?? 'reverse'}`,
    name: r.display_name.split(',').slice(0, 2).join(',').trim(),
    locality: r.display_name,
    latitude,
    longitude,
    pincode: r.address?.postcode,
  };
};

// locationService answers with a fixed Vijayawada fallback when the browser gives no position.
// That is not the customer's location, so it is treated as "location unavailable" here.
const SERVICE_FALLBACK = { latitude: 16.5417, longitude: 80.6425 };

export interface DeviceSpot {
  latitude: number;
  longitude: number;
  address: string;
  pincode: string;
}

export const locateDevice = async (): Promise<DeviceSpot | null> => {
  const loc = await getDeviceCurrentLocation();
  if (loc.latitude === SERVICE_FALLBACK.latitude && loc.longitude === SERVICE_FALLBACK.longitude) return null;
  // Only the coordinates come from the device; the address text is looked up for them.
  const place = await reversePlace(loc.latitude, loc.longitude).catch(() => null);
  return { latitude: loc.latitude, longitude: loc.longitude, address: place?.locality || '', pincode: place?.pincode || '' };
};
