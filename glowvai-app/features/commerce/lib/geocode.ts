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
