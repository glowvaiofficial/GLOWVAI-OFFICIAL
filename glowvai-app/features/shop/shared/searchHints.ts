// Rotating hint text in the home search bar. Each entry completes "Search for ...".
export const SEARCH_HINTS: readonly string[] = [
  'serums, sunscreen, milk',
  'niacinamide',
  'vitamin C serum',
  'moisturiser for dry skin',
  'face wash for oily skin',
  'sunscreen SPF 50',
  'retinol',
  'hyaluronic acid',
  'lip balm',
];

export const HINT_INTERVAL_MS = 3000;
export const HINT_FADE_MS = 400;

// The hint shown after the current one. Wraps to the start, and stays at 0 when the list is empty.
export function nextHintIndex(current: number, length: number): number {
  if (length <= 0) return 0;
  return (current + 1) % length;
}

// The text for one search hint. Built-in hints complete "Search for ..."; an admin hint that already starts with "Search"
// is shown as written.
export function hintText(hint: string): string {
  const h = hint.trim();
  return /^search\b/i.test(h) ? h : `Search for ${h}...`;
}
