// Rules for the tracking map card. Pure (no DOM, no React), so the tests can run them.
//
// The Google Maps script is loaded only when NEXT_PUBLIC_GOOGLE_MAPS_API_KEY was set at build time. Without a key the card
// shows MAP_NOT_SET_UP_TEXT and nothing else, and no request goes to Google.

export const MAP_NOT_SET_UP_TEXT = "Live map will appear once maps are set up";

// A browser key from Google Cloud: letters, digits, dash and underscore. Anything else counts as not set.
const KEY_PATTERN = /^[A-Za-z0-9_-]{20,100}$/;

/** The usable key, or null when the build has none. */
export function mapsKeyFrom(raw: string | undefined | null): string | null {
  const key = (raw ?? '').trim();
  return KEY_PATTERN.test(key) ? key : null;
}

export function mapsScriptUrl(key: string): string {
  return `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&v=weekly`;
}

// The rider's marker is refreshed at most this often while the page is open and the order is out for delivery.
export const RIDER_REFRESH_MS = 30_000;

/** True once at least RIDER_REFRESH_MS has passed since the last refresh. */
export function riderRefreshDue(lastRefreshAt: number, now: number): boolean {
  return now - lastRefreshAt >= RIDER_REFRESH_MS;
}

/** Only an order that is out for delivery has a moving rider to follow. */
export function shouldFollowRider(status: string | null | undefined): boolean {
  return String(status ?? '').toUpperCase() === 'OUT_FOR_DELIVERY';
}
