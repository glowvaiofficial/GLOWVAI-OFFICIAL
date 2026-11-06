// Search suggestions. Runs in the browser on the products already loaded (no server call, no Firestore read per
// keystroke). Pure so the ranking can be tested.

export interface SuggestSource {
  id: string;
  name: string;
  brand: string;
}

export const SUGGEST_LIMIT = 6;

const normalize = (s: string): string => s.toLowerCase().replace(/\s+/g, " ").trim();

// Scores one product against the query. 0 means no match. Higher is a better match:
// name starts with the query > brand starts with it > every word starts a word in the name or brand > plain contains.
export function scoreSuggestion(p: SuggestSource, query: string): number {
  const q = normalize(query);
  if (!q) return 0;
  const name = normalize(p.name);
  const brand = normalize(p.brand);
  if (name.startsWith(q)) return 100;
  if (brand.startsWith(q)) return 90;
  const words = `${name} ${brand}`.split(/[\s\-/()&,.]+/).filter(Boolean);
  const tokens = q.split(" ");
  if (tokens.every((t) => words.some((w) => w.startsWith(t)))) return 70;
  if (name.includes(q)) return 60;
  if (brand.includes(q)) return 50;
  if (tokens.every((t) => name.includes(t) || brand.includes(t))) return 40;
  return 0;
}

// The best matches, highest score first; ties go to the shorter name, then alphabetically. Duplicates are dropped.
export function rankSuggestions<T extends SuggestSource>(products: T[], query: string, limit = SUGGEST_LIMIT): T[] {
  if (!normalize(query)) return [];
  const seen = new Set<string>();
  const scored: { p: T; score: number }[] = [];
  for (const p of products) {
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    const score = scoreSuggestion(p, query);
    if (score > 0) scored.push({ p, score });
  }
  scored.sort((a, b) => b.score - a.score || normalize(a.p.name).length - normalize(b.p.name).length || normalize(a.p.name).localeCompare(normalize(b.p.name)));
  return scored.slice(0, limit).map((s) => s.p);
}
