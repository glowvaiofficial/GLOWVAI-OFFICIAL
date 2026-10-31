/**
 * Device location for the web build of GlowVAI.
 * Ported from the Expo app: uses the browser Geolocation API instead of expo-location.
 * Falls back to the Vijayawada service area when permission is denied or the lookup times out.
 */

import { getCountryByIso, CountryCodeItem } from '../data/countryCodes';

export interface UserLocationResult {
  latitude: number;
  longitude: number;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  countryCode?: string | null;
  postalCode?: string | null;
  formattedAddress?: string;
  detectedCountryItem: CountryCodeItem;
}

const CACHE_TTL_MS = 5 * 60 * 1000;
let cachedLocation: { data: UserLocationResult; timestamp: number } | null = null;

export const getDeviceCurrentLocation = async (
  timeoutMs: number = 5000
): Promise<UserLocationResult> => {
  const fallback: UserLocationResult = {
    latitude: 16.5417,
    longitude: 80.6425,
    city: 'Vijayawada',
    state: 'Andhra Pradesh',
    country: 'India',
    countryCode: 'IN',
    postalCode: '520015',
    formattedAddress: 'Payakapuram, Vijayawada',
    detectedCountryItem: getCountryByIso('IN'),
  };

  if (cachedLocation && Date.now() - cachedLocation.timestamp < CACHE_TTL_MS) {
    return cachedLocation.data;
  }

  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return fallback;
  }

  try {
    const position = await new Promise<GeolocationPosition>((resolve, reject) =>
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: timeoutMs,
        maximumAge: CACHE_TTL_MS,
      })
    );

    const result: UserLocationResult = {
      ...fallback,
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    };
    cachedLocation = { data: result, timestamp: Date.now() };
    return result;
  } catch {
    return fallback;
  }
};
