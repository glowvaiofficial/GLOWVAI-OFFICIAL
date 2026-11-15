import { useMemo, useState } from 'react';
import { useCatalogReady, useLiveCatalog } from '../../../core/data/indianSkincareCatalog';
import type { SkincareProduct } from '../../../core/data/indianSkincareCatalog';
import { useProductFeedStatus } from '../../../core/services/productFeed';
import { parsePriceBand, pickDeals } from '../../../../lib/shop/homeLayout';
import { browserStore, firstVisitState, skinMatchedPicks } from './firstVisit';
import { readRecentlyViewed } from './recentlyViewed';
import { bestsellerList, categoryTiles, newLaunchList, pricePointTiles } from './homeModel';
import type { HomeLayoutView } from './useHomeLayout';
import { getDiscountPercent, isTrialProduct } from '../shared/shopUtils';

// The catalogue data both homes (mobile and desktop) show: the product lists, rails, admin rows and deals. Only the look
// differs between the two homes, so they share this.

// Sorted and filtered lists from the live catalogue. Trial samples are left out so they don't top the rankings.
export function buildCatalogLists(catalog: SkincareProduct[]) {
  const FULL_SIZE_PRODUCTS = catalog.filter((p) => !isTrialProduct(p));
  const TOP_RATED = [...FULL_SIZE_PRODUCTS].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0) || (b.reviewCount ?? 0) - (a.reviewCount ?? 0));
  const UNDER_500 = FULL_SIZE_PRODUCTS.filter((p) => p.price < 500);
  // Deals are real catalogue products with a discount from their own MRP.
  const DEAL_PRODUCTS = FULL_SIZE_PRODUCTS.filter((p) => getDiscountPercent(p) > 0)
    .sort((a, b) => getDiscountPercent(b) - getDiscountPercent(a))
    .slice(0, 12);
  return { FULL_SIZE_PRODUCTS, TOP_RATED, UNDER_500, DEAL_PRODUCTS };
}

let sessionRecent: string[] | null = null;
function readSessionRecent(): string[] {
  if (sessionRecent === null) sessionRecent = readRecentlyViewed();
  return sessionRecent;
}

export function useHomeData(layout: Pick<HomeLayoutView, 'settings' | 'rows'>) {
  const catalog = useLiveCatalog();
  const ready = useCatalogReady();
  const feed = useProductFeedStatus();
  const loading = !ready && !feed.error;
  const failed = !ready && feed.error;
  const noProducts = ready && catalog.length === 0;

  const lists = useMemo(() => buildCatalogLists(catalog), [catalog]);
  const tiles = useMemo(() => categoryTiles(catalog), [catalog]);

  // The customer's history and quiz answers are read once per app session, not on every visit to the home. A product
  // opened from here would otherwise add a "Continue browsing" rail on Back and move the page under the customer.
  const [recentIds] = useState(() => readSessionRecent());
  const [skinState] = useState(() => firstVisitState(browserStore()));

  const continueCandidates = useMemo(() => {
    const byId = new Map(lists.FULL_SIZE_PRODUCTS.map((p) => [p.id, p] as const));
    return recentIds.map((id) => byId.get(id)).filter((p): p is SkincareProduct => Boolean(p)).slice(0, 10);
  }, [recentIds, lists.FULL_SIZE_PRODUCTS]);

  const picksCandidates = useMemo(
    () => (skinState.recommendationsOn ? skinMatchedPicks(lists.FULL_SIZE_PRODUCTS, skinState.concerns) : []),
    [skinState, lists.FULL_SIZE_PRODUCTS]
  );

  // Each rail has its own order, so a product can sit in more than one (as on any store home). Recently viewed is the customer's own history.
  const bestsellers = useMemo(() => bestsellerList(catalog).slice(0, 12), [catalog]);
  const newLaunches = useMemo(() => newLaunchList(catalog).slice(0, 12), [catalog]);
  const picks = useMemo(() => picksCandidates.slice(0, 10), [picksCandidates]);
  const pricePoints = useMemo(() => pricePointTiles(catalog), [catalog]);

  const layoutRows = layout.rows;
  // Rows the admin set on the product block. A row shows only with at least four products; none set means the default rows.
  const configuredRows = useMemo(() => {
    const out: { id: string; title: string; products: SkincareProduct[] }[] = [];
    layoutRows.forEach((r, i) => {
      const band = r.source === 'price-band' ? parsePriceBand(r.value) : null;
      const pool = r.source === 'category' ? catalog.filter((p) => p.category === r.value)
        : r.source === 'brand' ? catalog.filter((p) => p.brand === r.value)
        : r.source === 'bestsellers' ? lists.TOP_RATED
        : r.source === 'price-band' ? (band ? catalog.filter((p) => p.price >= band.min && p.price <= band.max) : [])
        : r.source === 'price-drop' ? catalog.filter((p) => p.originalPrice > p.price)
        : [...catalog].reverse();
      if (pool.length >= 4) out.push({ id: 'row-' + i, title: r.title, products: pool.slice(0, r.limit) });
    });
    return out;
  }, [layoutRows, catalog, lists]);

  // The deals the admin chose, in the admin's order (published products only). None chosen: the built-in deals.
  const adminDeals = layout.settings['deals']?.items ?? [];
  const adminDealProducts = useMemo(() => pickDeals(adminDeals, catalog), [adminDeals, catalog]);
  const dealProducts = adminDeals.length > 0 ? adminDealProducts : lists.DEAL_PRODUCTS;

  return { catalog, feed, loading, failed, noProducts, lists, tiles, recentIds, skinState, bestsellers, newLaunches, picks, pricePoints, recentProducts: continueCandidates, configuredRows, adminDeals, dealProducts };
}
