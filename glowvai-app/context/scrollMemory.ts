// Remembers how far each list was scrolled, so Back to a list returns to the same place. sessionStorage only, and every
// access is guarded: storage can be blocked, and then the list simply opens at the top.

const KEY = 'glowvai_scroll_v1';
let pending: number | null = null;

const readMap = (): Record<string, number> => {
  try {
    const parsed = JSON.parse(window.sessionStorage.getItem(KEY) ?? '{}') as unknown;
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, number>) : {};
  } catch {
    return {};
  }
};

export const scrollKey = (screen: string, params: unknown): string => `${screen}:${JSON.stringify(params ?? null)}`;

const scroller = (): HTMLElement | null => document.querySelector<HTMLElement>('.glowvai-root .screen-content');

export function currentScrollY(): number {
  try {
    const el = scroller();
    return el ? el.scrollTop : window.scrollY;
  } catch {
    return 0;
  }
}

export function rememberScroll(screen: string, params: unknown, y: number): void {
  try {
    const map = readMap();
    map[scrollKey(screen, params)] = y;
    window.sessionStorage.setItem(KEY, JSON.stringify(map));
  } catch {
    // Storage full or blocked: the list opens at the top next time.
  }
}

// Called when a screen is shown again by Back: its saved position is applied by the next screen-change effect.
export function queueScrollRestore(screen: string, params: unknown): void {
  const saved = readMap()[scrollKey(screen, params)];
  pending = typeof saved === 'number' ? saved : null;
}

export function takeScrollRestore(): number | null {
  const y = pending;
  pending = null;
  return y;
}

export function applyScroll(y: number): void {
  try {
    scroller()?.scrollTo?.(0, y);
    window.scrollTo(0, y);
  } catch {
    // No layout yet: nothing to scroll.
  }
}
