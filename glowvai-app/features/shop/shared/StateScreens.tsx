import React, { useEffect, useMemo, useState } from 'react';
import { Search, WifiOff, PackageX } from 'lucide-react';
import { useApp } from '../../../context/useApp';
import { useLiveCatalog } from '../../../core/data/indianSkincareCatalog';
import type { SkincareProduct } from '../../../core/data/indianSkincareCatalog';
import { useProductFeedStatus } from '../../../core/services/productFeed';
import { isSoldOut } from '../lib/designerStyle';
import { formatRupee } from './shopUtils';
import '../styles/designer-styles.css';

// Empty and error states the website was missing (an audit of the screens found the rest already in place: empty cart,
// wishlist, orders and address lists, filters with Clear all, the payment-failed screen, the load-failed card with Try again).
// Added here: the offline notice, search suggestions under "no results", and similar in-stock items under an out-of-stock
// product. Every one that can recover has a "Try again" or a clear next step.

// Shown while the browser reports it is offline. "Try again" re-checks the connection and reloads the product list.
export function OfflineNotice() {
  const [offline, setOffline] = useState(() => typeof navigator !== 'undefined' && navigator.onLine === false);
  const retryFeed = useProductFeedStatus((s) => s.retry);
  useEffect(() => {
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  if (!offline) return null;
  return (
    <div className="gvd-offline" role="status" aria-live="polite">
      <WifiOff size={16} aria-hidden="true" />
      <span>You are offline. We are showing what loaded last.</span>
      <button
        type="button"
        onClick={() => {
          setOffline(typeof navigator !== 'undefined' && navigator.onLine === false);
          retryFeed();
        }}
      >
        Try again
      </button>
    </div>
  );
}

// "No results" help: other searches to try and the categories to browse. Picking one opens the search with those words.
const POPULAR = ['serum', 'sunscreen', 'moisturiser', 'face wash', 'niacinamide', 'vitamin C'];
export function SearchSuggestions() {
  const { navigate } = useApp();
  return (
    <div className="gvd-suggest" aria-label="Search suggestions">
      <p>Try one of these</p>
      <div className="gvd-state-chips">
        {POPULAR.map((q) => (
          <button key={q} type="button" onClick={() => navigate('shop-search-filters', { q })}>
            <Search size={12} aria-hidden="true" /> {q}
          </button>
        ))}
      </div>
      <div className="gvd-state-actions">
        <button type="button" className="gvd-state-btn is-ghost" onClick={() => navigate('shop-browse')}>
          Browse all products
        </button>
      </div>
    </div>
  );
}

// Under an out-of-stock product: up to four in-stock products from the same category (then others), each opens its page.
export function OutOfStockSimilar({ product }: { product: SkincareProduct }) {
  const { navigate } = useApp();
  const catalog = useLiveCatalog();
  const items = useMemo(() => {
    const ok = catalog.filter((c) => c.id !== product.id && !isSoldOut(c));
    return [...ok.filter((c) => c.category === product.category), ...ok.filter((c) => c.category !== product.category)].slice(0, 4);
  }, [catalog, product]);
  if (items.length === 0) return null;
  return (
    <section className="gvd-state gvd-oos" aria-label="Similar products in stock">
      <span className="gvd-state-icon">
        <PackageX size={22} aria-hidden="true" />
      </span>
      <h3>This one is out of stock</h3>
      <p>These are in stock and close to what you were looking at.</p>
      <ul className="gvd-state-list">
        {items.map((c) => (
          <li key={c.id}>
            <button type="button" onClick={() => navigate('shop-product', { productId: c.id })}>
              <span>
                {c.brand} {c.name}
                <br />
                <small>{formatRupee(c.price)}</small>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
