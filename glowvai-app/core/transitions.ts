// Direction-aware screen transitions. The shop swaps screens in one client app, so this module wraps the state change in a
// View Transition when the browser has the API, and otherwise lets a CSS keyframe enter animation (v3-transitions.css) play.
// The screen content is the only animated layer: the header and tab bar stay still. Nothing here can leave content hidden:
// the animations only run on browser-made snapshots or end at full opacity, and every path falls back to a plain swap.
import { flushSync } from 'react-dom';
import { activeTabFor, showsBottomNav } from '../components/common/navGroups';
import type { ScreenName } from '../context/AppContext';

export type TransitionKind = 'forward' | 'back' | 'tab' | 'product' | 'sheet' | 'sheet-back';

const SHEETS = new Set<string>(['shop-search-filters', 'location-setup', 'location-map-picker', 'location-serviceability', 'address-add']);
const PRODUCT_SCREENS = new Set<string>(['shop-product', 'product-detail']);
const HERO_NAME = 'gv-hero';

// Pure: which transition a step gets. Tabs cross-fade, a product opened from a tapped card zooms from it, sheets rise from
// the bottom, everything else slides with the direction of travel.
export function classifyTransition(from: string, to: string, direction: 'forward' | 'back', hasHero = false): TransitionKind {
  if (direction === 'back') return SHEETS.has(from) ? 'sheet-back' : 'back';
  if (SHEETS.has(to)) return 'sheet';
  if (PRODUCT_SCREENS.has(to) && hasHero) return 'product';
  const a = activeTabFor(from as ScreenName);
  const b = activeTabFor(to as ScreenName);
  if (a && b && a !== b && showsBottomNav(from as ScreenName) && showsBottomNav(to as ScreenName)) return 'tab';
  return 'forward';
}

type VtDocument = Document & { startViewTransition?: (cb: () => void) => { finished: Promise<unknown>; skipTransition: () => void } };

const reducedMotion = (): boolean => {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
};

const canViewTransition = (): boolean => typeof document !== 'undefined' && typeof (document as VtDocument).startViewTransition === 'function' && !reducedMotion();

// The product image the shopper just tapped, remembered for a moment so the product screen can zoom out of it.
let pendingHero: { img: HTMLImageElement; at: number } | null = null;
let installed = false;

export function installTransitionHooks(): void {
  if (installed || typeof document === 'undefined') return;
  installed = true;
  if (canViewTransition()) document.documentElement.classList.add('gv-vt');
  document.addEventListener(
    'click',
    (event) => {
      const target = event.target as Element | null;
      const open = target?.closest?.('.shop-product-open, .commerce-product-open');
      const img = open?.querySelector('img');
      pendingHero = img ? { img, at: Date.now() } : null;
    },
    true,
  );
}

const takeHero = (): HTMLImageElement | null => {
  const hero = pendingHero;
  pendingHero = null;
  return hero && Date.now() - hero.at < 800 && hero.img.isConnected ? hero.img : null;
};

const screenBox = (): HTMLElement | null => document.querySelector<HTMLElement>('.glowvai-root .screen-content');

// Moves keyboard and screen reader focus to the new screen heading, without scrolling.
function focusHeading(): void {
  try {
    const heading = screenBox()?.querySelector<HTMLElement>('h1, [role="heading"], h2');
    if (!heading) return;
    if (!heading.hasAttribute('tabindex')) heading.setAttribute('tabindex', '-1');
    heading.focus({ preventScroll: true });
  } catch {
    // Focus is a courtesy: the screen is usable without it.
  }
}

let activeTransition: { skipTransition: () => void } | null = null;

// Runs `update` (the React state change for the new screen) inside the right transition. `update` is called exactly once.
export function runScreenTransition(from: string, to: string, direction: 'forward' | 'back', update: () => void): void {
  if (typeof document === 'undefined') {
    update();
    return;
  }
  const heroImg = direction === 'forward' ? takeHero() : null;
  const kind = classifyTransition(from, to, direction, !!heroImg);
  const box = screenBox();
  const root = document.documentElement;
  const doc = document as VtDocument;

  if (!canViewTransition() || !box) {
    // Fallback: the screen container carries the direction and the CSS keyframes play on the new screen.
    if (box && !reducedMotion()) box.setAttribute('data-direction', kind);
    else if (box) box.setAttribute('data-direction', 'fade');
    update();
    window.setTimeout(focusHeading, 0);
    return;
  }

  try {
    activeTransition?.skipTransition();
  } catch {
    // Nothing to skip.
  }
  root.setAttribute('data-gv-vt', kind);
  if (kind === 'product' && heroImg) heroImg.style.viewTransitionName = HERO_NAME;
  let newHero: HTMLElement | null = null;
  let ran = false;
  const apply = () => {
    ran = true;
    flushSync(update);
    if (kind === 'product') {
      newHero = document.querySelector<HTMLElement>('.shop-product-hero img, .shop-product-gallery img');
      if (newHero) newHero.style.viewTransitionName = HERO_NAME;
      if (heroImg) heroImg.style.viewTransitionName = '';
    }
    focusHeading();
  };
  const cleanup = () => {
    root.removeAttribute('data-gv-vt');
    if (heroImg) heroImg.style.viewTransitionName = '';
    if (newHero) newHero.style.viewTransitionName = '';
    activeTransition = null;
  };
  try {
    const transition = doc.startViewTransition!(apply);
    activeTransition = transition;
    transition.finished.then(cleanup, cleanup);
  } catch {
    if (!ran) update();
    cleanup();
  }
}
