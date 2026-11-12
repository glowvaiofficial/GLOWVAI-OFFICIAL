// First visit to the shop. Products open at once; the intro and the skin quiz are optional and are offered from a banner.
// Pure functions only (no React, no window at import time) so the decisions can be tested directly.

export const QUIZ_DISMISSED_KEY = 'glowvai_quiz_dismissed';
export const SKIN_CONCERNS_KEY = 'glowvai_skin_concerns';
export const SKIN_RECOMMENDATIONS_KEY = 'glowvai_skin_recommendations';

export type KeyValueStore = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
};

// The browser's localStorage, or null when storage is blocked or unavailable.
export const browserStore = (): KeyValueStore | null => {
  try {
    return typeof window !== 'undefined' && window.localStorage ? window.localStorage : null;
  } catch {
    return null;
  }
};

const readValue = (store: KeyValueStore | null, key: string): string | null => {
  try {
    return store ? store.getItem(key) : null;
  } catch {
    return null;
  }
};

const writeValue = (store: KeyValueStore | null, key: string, value: string): void => {
  try {
    store?.setItem(key, value);
  } catch {
    // Storage full or blocked: the choice simply is not remembered.
  }
};

// Skin quiz concern ids (features/auth/SkinSurveyScreen) mapped to the shop's concern keyword groups.
export const CONCERN_KEYWORDS: Record<string, string[]> = {
  acne: ['acne', 'blemish', 'salicylic', 'niacinamide', 'tea tree', 'breakout'],
  hydration: ['hydrat', 'moistur', 'dry', 'hyaluronic', 'ceramide', 'glycerin'],
  brightening: ['bright', 'dark spot', 'vitamin c', 'glow', 'pigment', 'tone'],
  antiaging: ['anti-aging', 'anti aging', 'firm', 'wrinkle', 'retinol', 'peptide', 'collagen'],
  barrier: ['barrier', 'repair', 'ceramide', 'soothe', 'sensitive'],
};

const QUIZ_TO_CONCERN: Record<string, keyof typeof CONCERN_KEYWORDS> = {
  ACNE: 'acne',
  OILINESS: 'acne',
  DRYNESS: 'hydration',
  HYPERPIGMENTATION: 'brightening',
  FINE_LINES: 'antiaging',
  SENSITIVITY: 'barrier',
};

const isQuizConcern = (id: string): boolean => Object.prototype.hasOwnProperty.call(QUIZ_TO_CONCERN, id);

export type FirstVisitState = {
  // Products always open first on a visit.
  screen: 'shop-home';
  // The quiz banner shows until it is dismissed or answered.
  showQuizBanner: boolean;
  // True when the quiz was answered: skin-matched picks may be shown.
  recommendationsOn: boolean;
  concerns: string[];
};

export const readQuizConcerns = (store: KeyValueStore | null): string[] => {
  try {
    const parsed = JSON.parse(readValue(store, SKIN_CONCERNS_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((c): c is string => typeof c === 'string' && isQuizConcern(c)).slice(0, 10) : [];
  } catch {
    return [];
  }
};

export const firstVisitState = (store: KeyValueStore | null): FirstVisitState => {
  const dismissed = readValue(store, QUIZ_DISMISSED_KEY) === 'true';
  const concerns = readQuizConcerns(store);
  const recommendationsOn = readValue(store, SKIN_RECOMMENDATIONS_KEY) === 'true' && concerns.length > 0;
  return {
    screen: 'shop-home',
    showQuizBanner: !dismissed && !recommendationsOn,
    recommendationsOn,
    concerns,
  };
};

// "Skip" on the banner, the intro or the quiz: never shown again on this device.
export const dismissQuiz = (store: KeyValueStore | null): void => {
  writeValue(store, QUIZ_DISMISSED_KEY, 'true');
};

// Quiz finished. With no concern chosen it counts as a skip.
export const saveQuizAnswers = (store: KeyValueStore | null, concernIds: string[]): void => {
  const concerns = concernIds.filter(isQuizConcern);
  if (concerns.length === 0) {
    dismissQuiz(store);
    return;
  }
  writeValue(store, SKIN_CONCERNS_KEY, JSON.stringify(concerns));
  writeValue(store, SKIN_RECOMMENDATIONS_KEY, 'true');
};

// Products matching the quiz answers, most matches first. Empty when there are no answers or nothing matches,
// and the caller then shows the normal list.
export const skinMatchedPicks = <T extends { name: string; description: string; keyActives: string[] }>(
  products: T[],
  concernIds: string[],
  limit = 6,
): T[] => {
  const keywords = [...new Set(concernIds.filter(isQuizConcern).map((c) => QUIZ_TO_CONCERN[c]))].flatMap((group) => CONCERN_KEYWORDS[group]);
  if (keywords.length === 0) return [];
  const scored = products
    .map((product) => {
      const haystack = `${product.name} ${product.description} ${product.keyActives.join(' ')}`.toLowerCase();
      return { product, score: keywords.filter((kw) => haystack.includes(kw)).length };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((entry) => entry.product);
};
