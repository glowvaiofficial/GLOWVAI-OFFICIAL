import React, { useEffect, useMemo, useState } from 'react';
import { Check, Search, ShoppingBag, SlidersHorizontal, X } from 'lucide-react';
import { useApp } from '../../../context/useApp';
import { useCatalog } from '../../../core/state/catalogStore';
import { useCartStore } from '../../../core/state/cartStore';
import { ShopProductCard } from '../shared/ShopProductCard';
import {
  SHOP_CATEGORIES,
  SHOP_CONCERNS,
  brandKey,
  categoryCount,
  getShopBrands,
  matchesConcern,
  productsInCategory,
  useScrollTopOn,
} from '../shared/shopCatalog';
import { getProductImageUrl } from '../shared/shopUtils';
import '../styles/shop-browse.css';

const VALID_CONCERN_IDS = new Set(SHOP_CONCERNS.map((c) => c.id));
const VALID_CATEGORY_IDS = new Set<string>(SHOP_CATEGORIES.map((c) => c.id));

const categoryImage = (id: string) => {
  const items = productsInCategory(id);
  const product = items.find((p) => p.price > 1) ?? items[0];
  return product ? getProductImageUrl(product) : '';
};

export const ShopBrowseScreen: React.FC = () => {
  const { navigate, activeParams } = useApp();
  const params: Record<string, string | undefined> = activeParams ?? {};
  const catalog = useCatalog();
  const shopBrands = getShopBrands();
  const cartCount = useCartStore((s) => s.totalCount);
  const topRef = useScrollTopOn(`${params.concern ?? ''}|${params.brand ?? ''}`);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedConcern, setSelectedConcern] = useState(
    params.concern && VALID_CONCERN_IDS.has(params.concern) ? params.concern : 'all'
  );
  const [selectedBrand, setSelectedBrand] = useState<string | null>(params.brand ?? null);

  // A `cat` param opens the dedicated category page instead of filtering here.
  useEffect(() => {
    if (params.cat && VALID_CATEGORY_IDS.has(params.cat)) navigate('shop-category', { categoryId: params.cat });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.cat]);

  useEffect(() => {
    if (params.concern && VALID_CONCERN_IDS.has(params.concern)) setSelectedConcern(params.concern);
    if (params.brand) setSelectedBrand(params.brand);
  }, [params.concern, params.brand]);

  const brandLabel = useMemo(() => {
    if (!selectedBrand) return null;
    return shopBrands.find((b) => brandKey(b.brand) === brandKey(selectedBrand))?.brand ?? selectedBrand;
  }, [selectedBrand, shopBrands]);

  const q = searchQuery.trim().toLowerCase();
  const filteredProducts = catalog.filter((product) => {
    const matchesSearch =
      !q ||
      product.name.toLowerCase().includes(q) ||
      product.brand.toLowerCase().includes(q) ||
      product.keyActives.some((a) => a.toLowerCase().includes(q));
    const matchesBrand = !selectedBrand || brandKey(product.brand) === brandKey(selectedBrand);
    return matchesSearch && matchesBrand && (selectedConcern === 'all' || matchesConcern(product, selectedConcern));
  });

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedConcern('all');
    setSelectedBrand(null);
  };

  const hasActiveFilters = Boolean(selectedBrand) || selectedConcern !== 'all' || Boolean(q);
  const concernLabel = SHOP_CONCERNS.find((c) => c.id === selectedConcern)?.label;
  const resultsTitle = brandLabel ?? concernLabel ?? (q ? 'Search results' : 'All products');
  const openCategory = (id: string) => navigate('shop-category', { categoryId: id });

  return (
    <div ref={topRef} className="shop-screen shop-browse">
      <header className="shop-header shop-browse-header">
        <h1>Categories</h1>
        <button type="button" className="shop-icon-btn" onClick={() => navigate('shop-search-filters')} aria-label="Search and filters">
          <SlidersHorizontal size={18} />
        </button>
        <button type="button" className="shop-icon-btn shop-header-cart" onClick={() => navigate('cart-tab')} aria-label={`Open bag, ${cartCount} items`}>
          <ShoppingBag size={18} />
          {cartCount > 0 && <span className="shop-icon-count">{cartCount}</span>}
        </button>
      </header>

      <div className="shop-browse-toolbar">
        <label className="shop-browse-search">
          <Search size={18} />
          <input
            type="text"
            enterKeyHint="search"
            placeholder="Search products, brands or actives"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search products"
          />
          {searchQuery && (
            <button type="button" onClick={() => setSearchQuery('')} aria-label="Clear search">
              <X size={16} />
            </button>
          )}
        </label>
      </div>

      <div className="shop-browse-body">
        <aside className="shop-browse-sidebar" aria-label="Filters">
          <h3>Categories</h3>
          {SHOP_CATEGORIES.map((cat) => (
            <button key={cat.id} type="button" className="shop-browse-side-item" onClick={() => openCategory(cat.id)}>
              <span className="shop-browse-side-badge">
                <cat.Icon size={15} />
              </span>
              <span className="shop-browse-side-name">{cat.short}</span>
              <span className="shop-browse-side-count">{categoryCount(cat.id)}</span>
            </button>
          ))}

          <h3>Skin concern</h3>
          {[{ id: 'all', label: 'All concerns' }, ...SHOP_CONCERNS].map((concern) => {
            const isSelected = selectedConcern === concern.id;
            return (
              <button
                key={concern.id}
                type="button"
                className={`shop-browse-side-option${isSelected ? ' is-active' : ''}`}
                aria-pressed={isSelected}
                onClick={() => setSelectedConcern(concern.id)}
              >
                <span>{concern.label}</span>
                {isSelected && <Check size={16} />}
              </button>
            );
          })}

          <h3>Brand</h3>
          {[{ brand: 'All brands', count: catalog.length }, ...shopBrands].map((b) => {
            const isAll = b.brand === 'All brands';
            const isSelected = isAll ? !selectedBrand : Boolean(selectedBrand) && brandKey(b.brand) === brandKey(selectedBrand ?? '');
            return (
              <button
                key={b.brand}
                type="button"
                className={`shop-browse-side-option${isSelected ? ' is-active' : ''}`}
                aria-pressed={isSelected}
                onClick={() => setSelectedBrand(isAll ? null : b.brand)}
              >
                <span>{b.brand}</span>
                {isSelected ? <Check size={16} /> : <small>{b.count}</small>}
              </button>
            );
          })}

          {hasActiveFilters && (
            <button type="button" className="shop-browse-side-clear" onClick={clearFilters}>
              Clear all filters
            </button>
          )}
        </aside>

        <main className="shop-browse-main">
          <section className="shop-browse-directory" aria-label="Categories">
            {SHOP_CATEGORIES.map((cat) => (
              <button key={cat.id} type="button" className="shop-browse-cat" onClick={() => openCategory(cat.id)}>
                <span className="shop-browse-cat-media">
                  <img src={categoryImage(cat.id)} alt="" loading="lazy" />
                </span>
                <span className="shop-browse-cat-name">{cat.label}</span>
                <span className="shop-browse-cat-count">
                  {categoryCount(cat.id)} {categoryCount(cat.id) === 1 ? 'product' : 'products'}
                </span>
              </button>
            ))}
          </section>

          <div className="shop-chip-row shop-browse-chip-row" role="group" aria-label="Filter by skin concern">
            {[{ id: 'all', label: 'All' }, ...SHOP_CONCERNS].map((concern) => {
              const isSelected = selectedConcern === concern.id;
              return (
                <button
                  key={concern.id}
                  type="button"
                  className={`shop-chip${isSelected ? ' is-active' : ''}`}
                  aria-pressed={isSelected}
                  onClick={() => setSelectedConcern(concern.id)}
                >
                  {concern.label}
                </button>
              );
            })}
          </div>

          <section className="shop-browse-products">
            <div className="shop-browse-products-head">
              <div>
                <h2>{resultsTitle}</h2>
                <span>
                  {filteredProducts.length} {filteredProducts.length === 1 ? 'product' : 'products'}
                </span>
              </div>
              {brandLabel && (
                <button type="button" className="shop-browse-filter-pill" onClick={() => setSelectedBrand(null)} aria-label={`Remove ${brandLabel} filter`}>
                  {brandLabel}
                  <X size={14} />
                </button>
              )}
            </div>

            {filteredProducts.length === 0 ? (
              <div className="shop-empty">
                <span className="shop-empty-icon">
                  <Search size={26} />
                </span>
                <h3>No products match</h3>
                <p>Try a different search, concern or brand.</p>
                <button type="button" className="shop-btn-secondary" onClick={clearFilters}>
                  Clear filters
                </button>
              </div>
            ) : (
              <div className="shop-product-grid">
                {filteredProducts.map((product) => (
                  <ShopProductCard key={product.id} product={product} onOpen={(p) => navigate('shop-product', { productId: p.id })} />
                ))}
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
};

export default ShopBrowseScreen;
