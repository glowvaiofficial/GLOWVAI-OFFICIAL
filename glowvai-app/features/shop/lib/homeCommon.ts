import { useEffect, useMemo, useState } from 'react';
import { Droplets, Flower2, Leaf, Sun, Wind } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useApp } from '../../../context/useApp';
import type { SkincareProduct } from '../../../core/data/indianSkincareCatalog';
import { ON_DEVICE_INFERENCE_ENABLED } from '../../../core/services/skinModelService';
import { fetchReorderItems } from '../../../core/services/shopApi';
import { rememberScroll } from '../../../context/scrollMemory';
import type { ScreenName } from '../../../context/contextDefinition';

// Content and behaviour both homes (mobile and desktop) share. Only the look differs between them.

export const HERO_IMAGE = '/glowvai/assets/home/glowvai-shopping-hero.png';

// Concern ids match the filter ids on the browse screen.
export const CONCERNS: { id: string; label: string; Icon: LucideIcon }[] = [
  { id: 'acne', label: 'Acne & Blemishes', Icon: Leaf },
  { id: 'hydration', label: 'Hydration & Dryness', Icon: Droplets },
  { id: 'brightening', label: 'Glow & Dark Spots', Icon: Sun },
  { id: 'antiaging', label: 'Firming & Lines', Icon: Flower2 },
  { id: 'barrier', label: 'Barrier Repair', Icon: Wind },
];

// Accent colour for a category tile when it has no product photo to show.
export const CATEGORY_ACCENT: Record<string, string> = {
  Serums: '#3b6cf5',
  Moisturizers: '#2a9d8f',
  Suncare: '#e9a23b',
  Cleansers: '#5b8def',
  Treatments: '#8e5bd6',
};

// The scan card says only what the scan does in this build: on-device when that switch is on, otherwise sent to the analysis service.
export const SCAN_PRIVACY = ON_DEVICE_INFERENCE_ENABLED
  ? 'Your photo is analysed on this device.'
  : 'Your photo is sent to GlowVai’s analysis service only to run this check.';

// A category tile's count line. null: a placeholder while the catalogue loads. '': no count when the catalogue failed.
// Otherwise the real count.
export function countLabel(loading: boolean, failed: boolean, n: number): string | null {
  if (loading) return null;
  if (failed) return '';
  return `${n} ${n === 1 ? 'product' : 'products'}`;
}

// How far the home is scrolled. On a phone the screen scrolls inside .screen-content; on a desktop the window does.
function homeScrollY(): number {
  const screen = document.querySelector<HTMLElement>('.glowvai-root .screen-content');
  return Math.max(screen ? screen.scrollTop : 0, window.scrollY);
}

// Opens a screen from the home and records where the home was left, so Back returns to the same place. The app's own
// save reads only the inner screen scroller, which is still at the top on a desktop, so the home saves its real position.
export function useHomeNavigate() {
  const { navigate, currentScreen, activeParams } = useApp();
  return (screen: ScreenName, params?: Record<string, string>) => {
    const y = homeScrollY();
    navigate(screen, params);
    rememberScroll(currentScreen, activeParams, y);
  };
}

// "Buy it again": the customer's recent products, from the live catalogue. Empty when the customer is not signed in,
// has no orders, or the request fails.
export function useReorderProducts(catalog: SkincareProduct[]): SkincareProduct[] {
  const [ids, setIds] = useState<string[]>([]);
  useEffect(() => {
    let alive = true;
    fetchReorderItems()
      .then((res) => {
        if (alive && res.ok && res.data) setIds(res.data.items.map((i) => i.productId));
      })
      .catch(() => {
        // Nothing is shown.
      });
    return () => {
      alive = false;
    };
  }, []);
  return useMemo(() => {
    const byId = new Map(catalog.map((p) => [p.id, p] as const));
    return ids.map((id) => byId.get(id)).filter((p): p is SkincareProduct => p !== undefined);
  }, [ids, catalog]);
}
