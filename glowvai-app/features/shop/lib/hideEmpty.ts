// Hides categories and concerns that have no products once the catalogue has loaded. Pure, so the tests call it directly.
//
// - While the catalogue is loading (ready = false) the list is returned as it is, so tabs and tiles keep their skeleton and
//   nothing flickers in or out.
// - If every entry is empty (an empty catalogue) the list is also returned as it is: the screens then show their usual
//   empty state instead of a bare row.

export function hideEmpty<T>(items: readonly T[], countOf: (item: T) => number, ready: boolean): T[] {
  if (!ready) return [...items];
  const kept = items.filter((item) => countOf(item) > 0);
  return kept.length > 0 ? kept : [...items];
}

/** The catalogue is ready when it has loaded without failing. */
export function catalogReady(loading: boolean, failed: boolean): boolean {
  return !loading && !failed;
}
