import React, { useEffect, useMemo, useState } from 'react';
import { Activity, Check, ChevronRight, Droplet, LayoutGrid, Leaf, Search, ShoppingBag, Sparkles, Sun, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useApp } from '../../../context/useApp';
import { useLiveCatalog } from '../../../core/data/indianSkincareCatalog';
import type { SkincareProduct } from '../../../core/data/indianSkincareCatalog';
import { ShopProductCard } from '../shared/ShopProductCard';
import { getProductThumbUrl, isTrialProduct } from '../shared/shopUtils';
import { CONCERN_KEYWORDS } from '../lib/firstVisit';
import { hideEmpty } from '../lib/hideEmpty';
import { SearchSuggestions } from '../shared/StateScreens';
import { PcListing } from '../desktop/PcListing';
import { useIsPc } from '../desktop/useIsPc';
import '../styles/shop-browse.css';
import '../styles/v2-browse.css';

// Each tile shows the first full-size catalogue product in that category, as on the shop home.
const categoryImage = (catalog: SkincareProduct[], id: string) => {
  const sample = catalog.find((p) => p.category === id && !isTrialProduct(p));
  return sample ? getProductThumbUrl(sample) : '';
};

// Category ids match SkincareProduct['category'] exactly.
const CATEGORY_ITEMS: { id: string; name: string; imageUri: string; Icon: LucideIcon }[] = [
  { id: 'Serums', name: 'Serums & Actives', imageUri: '', Icon: Sparkles },
  { id: 'Cleansers', name: 'Cleansers & Washes', imageUri: '', Icon: Droplet },
  { id: 'Moisturizers', name: 'Moisturizers & Creams', imageUri: '', Icon: Leaf },
  { id: 'Suncare', name: 'Sunscreen & SPF', imageUri: '', Icon: Sun },
  { id: 'Treatments', name: 'Spot Treatments', imageUri: '', Icon: Activity },
];


const SKIN_CONCERNS = [
  { id: 'all', label: 'All Items' },
  { id: 'acne', label: 'Acne & Blemishes' },
  { id: 'hydration', label: 'Hydration & Dryness' },
  { id: 'brightening', label: 'Glow & Dark Spots' },
  { id: 'antiaging', label: 'Firming & Lines' },
  { id: 'barrier', label: 'Barrier Repair' },
];

const VALID_CATEGORY_IDS = new Set(CATEGORY_ITEMS.map((c) => c.id));
const VALID_CONCERN_IDS = new Set(SKIN_CONCERNS.map((c) => c.id));

export const ShopBrowseScreen: React.FC = () => {
  const catalog = useLiveCatalog();
  const categoryItems = CATEGORY_ITEMS.map((item) => ({ ...item, imageUri: categoryImage(catalog, item.id) }));
  const { navigate, activeParams } = useApp();
  const isPc = useIsPc();
  const params: Record<string, string | undefined> = activeParams ?? {};

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedConcern, setSelectedConcern] = useState(
    params.concern && VALID_CONCERN_IDS.has(params.concern) ? params.concern : 'all'
  );
  const [showAll, setShowAll] = useState(false);
  const [railCat, setRailCat] = useState('Serums');
  const [selectedBrand, setSelectedBrand] = useState<string | null>(params.brand ?? null);
  // A price point from the home ("Under ₹499") narrows the list to products priced below it.
  const readMaxPrice = (v: string | undefined) => (v && /^d{2,5}$/.test(v) ? Number(v) : null);
  const [maxPrice, setMaxPrice] = useState<number | null>(readMaxPrice(params.maxPrice));

  // A `cat` param opens the dedicated category page instead of filtering here.
  useEffect(() => {
    if (params.cat && VALID_CATEGORY_IDS.has(params.cat)) {
      navigate('shop-category', { categoryId: params.cat });
    }
  }, [params.cat]);

  useEffect(() => {
    if (params.concern && VALID_CONCERN_IDS.has(params.concern)) setSelectedConcern(params.concern);
    if (params.brand) setSelectedBrand(params.brand);
    if (params.maxPrice) setMaxPrice(readMaxPrice(params.maxPrice));
  }, [params.concern, params.brand, params.maxPrice]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of categoryItems) {
      counts[item.id] = catalog.filter((p) => p.category === item.id).length;
    }
    return counts;
  }, [catalog]); // eslint-disable-line react-hooks/exhaustive-deps

  // Categories with no products are hidden once the catalogue has loaded.
  const shownCategories = hideEmpty(categoryItems, (c) => categoryCounts[c.id] ?? 0, catalog.length > 0);

  const filteredProducts = catalog.filter((product) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      searchQuery === '' || product.name.toLowerCase().includes(q) || product.brand.toLowerCase().includes(q);

    const concernKeywords = selectedConcern !== 'all' ? CONCERN_KEYWORDS[selectedConcern] : null;
    const haystack = concernKeywords
      ? `${product.name} ${product.description} ${product.keyActives.join(' ')}`.toLowerCase()
      : '';
    const matchesConcern = !concernKeywords || concernKeywords.some((kw) => haystack.includes(kw));

    const matchesBrand =
      !selectedBrand ||
      product.brand.toLowerCase().replace(/[^a-z0-9]/g, '').includes(selectedBrand.toLowerCase().replace(/[^a-z0-9]/g, ''));

    const matchesPrice = maxPrice === null || product.price < maxPrice;

    return matchesSearch && matchesConcern && matchesBrand && matchesPrice;
  });

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedConcern('all');
    setSelectedBrand(null);
    setMaxPrice(null);
    setShowAll(false);
  };

  const hasActiveFilters = Boolean(selectedBrand) || selectedConcern !== 'all' || maxPrice !== null;
  const concernLabel = SKIN_CONCERNS.find((c) => c.id === selectedConcern)?.label ?? '';
  const emptyHint = searchQuery || selectedBrand || (maxPrice !== null ? `under ₹${maxPrice}` : '') || (selectedConcern !== 'all' ? concernLabel : '');
  const itemsLabel = (n: number) => `${n} ${n === 1 ? 'item' : 'items'}`;

  if (isPc) {
    return (
      <PcListing
        title={selectedConcern !== 'all' ? concernLabel : 'All products'}
        subtitle="Browse the full GlowVai range. Filter by category, brand, concern, price and more."
        crumbs={[{ label: 'Home', onClick: () => navigate('shop-home') }, { label: 'All Categories' }]}
        products={catalog.filter((p) => !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.brand.toLowerCase().includes(searchQuery.toLowerCase()))}
        initial={{ concern: selectedConcern, brand: selectedBrand, maxPrice }}
        scopeChip={searchQuery ? { label: `"${searchQuery}"`, onClear: () => setSearchQuery('') } : null}
        emptyHint={searchQuery || undefined}
        onOpen={(p) => navigate('shop-product', { productId: p.id })}
        searchSlot={
          <label className="shop-input shop-browse-search">
            <Search size={18} />
            <input type="text" placeholder="Search categories, products & active ingredients..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            {searchQuery && (
              <button type="button" className="shop-input-clear" onClick={() => setSearchQuery('')} aria-label="Clear search">
                <X size={16} />
              </button>
            )}
          </label>
        }
        topSlot={
          <div className="pc-cats">
            {shownCategories.map((cat) => (
              <button key={cat.id} type="button" className="pc-cat" onClick={() => navigate('shop-category', { categoryId: cat.id })}>
                <span className="pc-cat-ico">{cat.imageUri ? <img src={cat.imageUri} alt="" width={40} height={40} loading="lazy" /> : <cat.Icon size={18} />}</span>
                <span style={{ minWidth: 0 }}>
                  <b>{cat.name}</b>
                  <small>{itemsLabel(categoryCounts[cat.id] ?? 0)}</small>
                </span>
              </button>
            ))}
          </div>
        }
      />
    );
  }

  const showResults = searchQuery.trim() !== '' || hasActiveFilters || showAll;
  const railItems = [
    ...shownCategories.map((c) => ({ id: c.id, name: c.name.split(' & ')[0].split(' ')[0], full: c.name, count: categoryCounts[c.id] ?? 0, img: c.imageUri, Icon: c.Icon })),
    { id: '__all', name: 'All products', full: 'All products', count: catalog.length, img: catalog[0] ? getProductThumbUrl(catalog[0]) : '', Icon: LayoutGrid },
  ];
  const activeRail = railItems.find((r) => r.id === railCat) ?? railItems[0];
  const loadingCatalog = catalog.length === 0;
  const concernCount = (id: string) => {
    const kws = CONCERN_KEYWORDS[id];
    if (!kws) return catalog.length;
    return catalog.filter((p) => {
      const hay = `${p.name} ${p.description} ${p.keyActives.join(' ')}`.toLowerCase();
      return kws.some((k) => hay.includes(k));
    }).length;
  };

  const shownConcerns = hideEmpty(SKIN_CONCERNS, (c) => (c.id === 'all' || c.id === selectedConcern ? 1 : concernCount(c.id)), catalog.length > 0);

  return (
    <div className="shop-screen shop-browse v2-browse">
      <div className="v2-bluebar">
        <header className="shop-header shop-browse-header">
          <h1>{showResults ? 'Search & browse' : 'Categories'}</h1>
          <button type="button" className="shop-icon-btn" onClick={() => navigate('cart-tab')} aria-label="Open cart">
            <ShoppingBag size={20} />
          </button>
        </header>
        <label className="shop-input shop-browse-search">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search categories, products & active ingredients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search products"
          />
          {searchQuery && (
            <button type="button" className="shop-input-clear" onClick={() => setSearchQuery('')} aria-label="Clear search">
              <X size={16} />
            </button>
          )}
        </label>
      </div>

      <div className="v2-chips shop-chip-row shop-browse-chip-row">
        {shownConcerns.map((concern) => {
          const isSelected = selectedConcern === concern.id;
          return (
            <button
              key={concern.id}
              type="button"
              className={`shop-chip${isSelected ? ' is-active' : ''}`}
              aria-pressed={isSelected}
              onClick={() => {
                setSelectedConcern(concern.id);
                if (concern.id === 'all') setShowAll(false);
              }}
            >
              {isSelected && <Check size={14} />}
              {concern.label}
            </button>
          );
        })}
      </div>

      <div className="shop-browse-body">
        <main className="shop-browse-main">
          {selectedBrand && (
            <div className="shop-browse-banner">
              <span>
                Showing: {selectedBrand} ({itemsLabel(filteredProducts.length)})
              </span>
              <button type="button" onClick={() => setSelectedBrand(null)}>
                Show All
              </button>
            </div>
          )}

          {maxPrice !== null && (
            <div className="shop-browse-banner">
              <span>
                Showing: Under ₹{maxPrice} ({itemsLabel(filteredProducts.length)})
              </span>
              <button type="button" onClick={() => setMaxPrice(null)}>
                Show All
              </button>
            </div>
          )}

          {!showResults ? (
            <section className="v2-cats" aria-label="Shop by category">
              <h2 className="v2-cats-title">Shop by category</h2>
              <div className="v2-cats-card">
                <div className="v2-rail" role="tablist" aria-label="Categories">
                  {loadingCatalog
                    ? Array.from({ length: 5 }, (_, i) => (
                        <div key={i} className="v2-rail-item is-skel" aria-hidden="true">
                          <span className="shop-skeleton v2-rail-img" />
                          <span className="shop-skeleton v2-skel-line" />
                        </div>
                      ))
                    : railItems.map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          role="tab"
                          aria-selected={activeRail.id === r.id}
                          className={`v2-rail-item${activeRail.id === r.id ? ' is-active' : ''}`}
                          onClick={() => setRailCat(r.id)}
                        >
                          <span className="v2-rail-img">{r.img ? <img src={r.img} alt="" width={64} height={64} loading="lazy" decoding="async" /> : <r.Icon size={22} />}</span>
                          <span className="v2-rail-name">{r.name}</span>
                          <span className="v2-rail-count">{r.count}</span>
                        </button>
                      ))}
                </div>
                <div className="v2-pane" role="tabpanel">
                  {loadingCatalog ? (
                    <div className="shop-skeleton v2-hero-skel" aria-busy="true" />
                  ) : (
                    <button
                      type="button"
                      className="v2-hero"
                      onClick={() => (activeRail.id === '__all' ? setShowAll(true) : navigate('shop-category', { categoryId: activeRail.id }))}
                    >
                      <span className="v2-hero-copy">
                        <b>{activeRail.full}</b>
                        <small>{itemsLabel(activeRail.count)}</small>
                        <span className="v2-hero-link">
                          See all <ChevronRight size={16} />
                        </span>
                      </span>
                      <span className="v2-hero-img">{activeRail.img ? <img src={activeRail.img} alt="" width={120} height={120} loading="lazy" decoding="async" /> : <activeRail.Icon size={32} />}</span>
                    </button>
                  )}
                  <h3 className="v2-concern-title">Shop by concern</h3>
                  <ul className="v2-concerns">
                    {shownConcerns.filter((c) => c.id !== 'all').map((c) => (
                      <li key={c.id}>
                        <button type="button" onClick={() => setSelectedConcern(c.id)}>
                          <span>{c.label}</span>
                          <b>{loadingCatalog ? '' : concernCount(c.id)}</b>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>
          ) : (
            <section className="shop-browse-products">
              <div className="shop-section-head shop-browse-products-head">
                <h2>{selectedConcern !== 'all' ? concernLabel : 'All products'}</h2>
                <span>
                  {filteredProducts.length} {filteredProducts.length === 1 ? 'result' : 'results'}
                </span>
              </div>

              {filteredProducts.length === 0 ? (
                <div className="shop-empty v2-empty">
                  <span className="shop-empty-icon">
                    <Search size={24} />
                  </span>
                  <h3>No products found</h3>
                  <p>We couldn't find any products matching "{emptyHint}".</p>
                  <SearchSuggestions />
                  <button type="button" className="shop-btn-primary" onClick={clearFilters}>
                    Clear Filters
                  </button>
                </div>
              ) : (
                <div className="shop-product-grid">
                  {filteredProducts.map((product) => (
                    <ShopProductCard
                      key={product.id}
                      product={product}
                      onOpen={(p) => navigate('shop-product', { productId: p.id })}
                    />
                  ))}
                </div>
              )}
            </section>
          )}
        </main>
      </div>
    </div>
  );
};
