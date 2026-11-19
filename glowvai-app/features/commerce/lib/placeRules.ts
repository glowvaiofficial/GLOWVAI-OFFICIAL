// Rules for turning Nominatim answers into an address a customer can read and a courier can use.

/** An Open Location Code (plus code such as FM87+H92), alone or inside a longer string. Useless as a delivery address. */
const PLUS_CODE = /(^|[\s,])[23456789CFGHJMPQRVWX]{4,8}\+[23456789CFGHJMPQRVWX]{2,3}(?=$|[\s,])/i;
export const isPlusCode = (text: string | null | undefined): boolean => typeof text === 'string' && PLUS_CODE.test(text.trim());

type NominatimAddress = Record<string, string | undefined>;

const clean = (v: string | undefined): string => (typeof v === 'string' ? v.trim() : '');

/** Readable address lines from a Nominatim `address` object, most specific first, without duplicates or plus codes. */
export function readableAddress(address: NominatimAddress | undefined, displayName?: string): string {
  const a = address || {};
  const pick = [
    a.house_number && a.road ? `${clean(a.house_number)}, ${clean(a.road)}` : a.road,
    a.neighbourhood || a.quarter,
    a.suburb || a.city_district || a.residential,
    a.village || a.town || a.city || a.municipality,
    a.state_district && a.state_district !== (a.city || a.town) ? a.state_district : undefined,
  ]
    .map(clean)
    .filter((p) => p && !isPlusCode(p));
  const unique = pick.filter((p, i) => pick.findIndex((q) => q.toLowerCase() === p.toLowerCase()) === i);
  if (unique.length > 0) return unique.join(', ');
  // Fall back to the first parts of the display name, still skipping plus codes.
  const parts = clean(displayName)
    .split(',')
    .map((p) => p.trim())
    .filter((p) => p && !isPlusCode(p) && !/^\d{6}$/.test(p) && p.toLowerCase() !== 'india');
  return parts.slice(0, 4).join(', ');
}

/** Six digit Indian pincode from a Nominatim postcode ("520 010" becomes "520010"), or ''. */
export const cleanPincode = (postcode: string | undefined): string => {
  const digits = clean(postcode).replace(/\s/g, '');
  return /^\d{6}$/.test(digits) ? digits : '';
};

/** Minimum gap between two calls to nominatim.openstreetmap.org (its usage policy: at most 1 request per second). */
export const NOMINATIM_GAP_MS = 1000;
/** Wait before a search starts after the customer stops typing. */
export const SEARCH_DEBOUNCE_MS = 500;

/** Runs tasks one at a time with at least `gap` ms between their starts. */
export function createThrottle(gap: number, now: () => number = Date.now) {
  let chain: Promise<unknown> = Promise.resolve();
  let last = 0;
  return <T,>(task: () => Promise<T>): Promise<T> => {
    const run = chain.then(async () => {
      const wait = last + gap - now();
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      last = now();
      return task();
    });
    chain = run.catch(() => undefined);
    return run;
  };
}
