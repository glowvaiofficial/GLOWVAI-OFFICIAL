// Which home the website shows: the desktop home on screens 1024px wide and more, the mobile home below. A ?device=desktop
// or ?device=mobile URL parameter forces the choice (the admin designer's preview frames use it). Pure, so the tests can
// call it directly; the React side is useHomeDevice in useHomeLayout.ts.

export type HomeDevice = 'desktop' | 'mobile';

export const DESKTOP_MIN_WIDTH = 1024;
export const DESKTOP_MEDIA_QUERY = `(min-width: ${DESKTOP_MIN_WIDTH}px)`;

// The device a URL query string forces, or null when it forces none (missing or any other value).
export function forcedHomeDevice(search: string): HomeDevice | null {
  let value: string | null;
  try {
    value = new URLSearchParams(search).get('device');
  } catch {
    return null;
  }
  return value === 'desktop' || value === 'mobile' ? value : null;
}

// A forced device wins; otherwise a wide screen gets the desktop home.
export function pickHomeDevice(forced: HomeDevice | null, wide: boolean): HomeDevice {
  return forced ?? (wide ? 'desktop' : 'mobile');
}

// The layout request for a device. The mobile request is exactly the one the website sent before (and the one the native
// app sends), so it keeps its cache entry; the desktop one adds device=desktop.
export function homeLayoutUrl(device: HomeDevice, previewToken: string | null): string {
  const parts: string[] = [];
  if (previewToken) parts.push(`preview=${encodeURIComponent(previewToken)}`);
  if (device === 'desktop') parts.push('device=desktop');
  return parts.length > 0 ? `/api/shop/layout?${parts.join('&')}` : '/api/shop/layout';
}
