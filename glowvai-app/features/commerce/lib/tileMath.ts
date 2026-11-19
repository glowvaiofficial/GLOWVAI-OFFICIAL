/**
 * Slippy-map tile maths for the delivery pin map (OpenStreetMap tiles, Web Mercator, 256 px tiles). Pure functions:
 * the map component only draws what these return.
 */
export const TILE_SIZE = 256;
export const MIN_ZOOM = 5;
export const MAX_ZOOM = 19;
export const OSM_ATTRIBUTION = '© OpenStreetMap contributors';
const MAX_LAT = 85.05112878;

export interface LatLngLike {
  latitude: number;
  longitude: number;
}

export const clampZoom = (z: number): number => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(z)));
const clampLat = (lat: number): number => Math.min(MAX_LAT, Math.max(-MAX_LAT, lat));
const wrapLng = (lng: number): number => ((((lng + 180) % 360) + 360) % 360) - 180;

/** World pixel position (at the zoom) of a coordinate. */
export function project(latitude: number, longitude: number, zoom: number): { x: number; y: number } {
  const scale = TILE_SIZE * 2 ** zoom;
  const lat = (clampLat(latitude) * Math.PI) / 180;
  return {
    x: ((wrapLng(longitude) + 180) / 360) * scale,
    y: ((1 - Math.log(Math.tan(lat) + 1 / Math.cos(lat)) / Math.PI) / 2) * scale,
  };
}

/** The coordinate at a world pixel position (inverse of project). */
export function unproject(x: number, y: number, zoom: number): LatLngLike {
  const scale = TILE_SIZE * 2 ** zoom;
  const n = Math.PI - (2 * Math.PI * y) / scale;
  return {
    latitude: clampLat((180 / Math.PI) * Math.atan(Math.sinh(n))),
    longitude: wrapLng((x / scale) * 360 - 180),
  };
}

export function tileUrl(z: number, x: number, y: number): string {
  return `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
}

export interface PlacedTile {
  key: string;
  url: string;
  /** Pixel offset of the tile's top-left corner from the top-left of the viewport. */
  left: number;
  top: number;
}

/** The tiles that cover a width x height viewport centred on a coordinate, positioned in viewport pixels. */
export function tilesFor(center: LatLngLike, zoom: number, width: number, height: number): PlacedTile[] {
  const z = clampZoom(zoom);
  const c = project(center.latitude, center.longitude, z);
  const originX = c.x - width / 2;
  const originY = c.y - height / 2;
  const count = 2 ** z;
  const x0 = Math.floor(originX / TILE_SIZE);
  const x1 = Math.floor((originX + width) / TILE_SIZE);
  const y0 = Math.max(0, Math.floor(originY / TILE_SIZE));
  const y1 = Math.min(count - 1, Math.floor((originY + height) / TILE_SIZE));
  const out: PlacedTile[] = [];
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      const wrapped = ((tx % count) + count) % count;
      out.push({ key: `${z}/${tx}/${ty}`, url: tileUrl(z, wrapped, ty), left: tx * TILE_SIZE - originX, top: ty * TILE_SIZE - originY });
    }
  }
  return out;
}

/** The new map centre after the customer drags the map by (dx, dy) screen pixels. */
export function panCenter(center: LatLngLike, zoom: number, dx: number, dy: number): LatLngLike {
  const c = project(center.latitude, center.longitude, zoom);
  return unproject(c.x - dx, c.y - dy, zoom);
}
