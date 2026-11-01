/**
 * Point-in-Polygon (PIP) Ray-Casting Algorithm for Delivery Zones
 */

export interface Coordinate {
  latitude: number;
  longitude: number;
}

/**
 * Performs Ray-Casting algorithm to check if a lat/lng point lies inside a polygon array
 */
export function isPointInPolygon(
  point: Coordinate,
  polygon: Coordinate[]
): boolean {
  if (!polygon || polygon.length < 3) return true; // Default fallback if no custom polygon set

  const x = point.longitude;
  const y = point.latitude;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const ptI = polygon[i];
    const ptJ = polygon[j];
    if (!ptI || !ptJ) continue;

    const xi = ptI.longitude;
    const yi = ptI.latitude;
    const xj = ptJ.longitude;
    const yj = ptJ.latitude;

    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }

  return inside;
}

/**
 * Calibrated Vijayawada default quick-commerce zone polygon
 */
export const VIJAYAWADA_DEFAULT_ZONE_POLYGON: Coordinate[] = [
  { latitude: 16.5500, longitude: 80.6000 },
  { latitude: 16.5500, longitude: 80.6900 },
  { latitude: 16.4800, longitude: 80.6900 },
  { latitude: 16.4800, longitude: 80.6000 },
];
