import React, { useEffect, useMemo, useState } from 'react';
import { Activity, Check, Droplet, Leaf, Search, ShoppingBag, Sparkles, Sun, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useApp } from '../../../context/useApp';
import { INDIAN_SKINCARE_CATALOG } from '../../../core/data/indianSkincareCatalog';
import { ShopProductCard } from '../shared/ShopProductCard';
import '../styles/shop-browse.css';

const stock = (id: string) => `https://images.unsplash.com/photo-${id}?w=400&auto=format&fit=crop&q=80`;

// Category ids match SkincareProduct['category'] exactly.
const CATEGORY_ITEMS: { id: string; name: string; color: string; imageUri: string; Icon: LucideIcon }[] = [
  { id: 'Serums', name: 'Serums & Actives', color: '#EBF5FF', imageUri: stock('1617897903246-719242758050'), Icon: Sparkles },
  { id: 'Cleansers', name: 'Cleansers & Washes', color: '#F0FDF4', imageUri: stock('1556228720-195a672e8a03'), Icon: Droplet },
  { id: 'Moisturizers', name: 'Moisturizers & Creams', color: '#FFF7ED', imageUri: stock('1571781926291-c477ebfd024b'), Icon: Leaf },
  { id: 'Suncare', name: 'Sunscreen & SPF', color: '#FEF3C7', imageUri: stock('1598440947619-2c35fc9aa908'), Icon: Sun },
  { id: 'Treatments', name: 'Spot Treatments', color: '#EFF6FF', imageUri: stock('1617897903246-719242758050'), Icon: Activity },
];

const CATEGORY_TINTS = ['#E8F0FE', '#E8F5E9', '#FFF8E1', '#F3E5F5', '#FCE4EC'];

// Keyword groups matched against product name/description/keyActives.
const CONCERN_KEYWORDS: Record<string, string[]> = {
  acne: ['acne', 'blemish', 'salicylic', 'niacinamide', 'tea tree', 'breakout'],
  hydration: ['hydrat', 'moistur', 'dry', 'hyaluronic', 'ceramide', 'glycerin'],
  brightening: ['bright', 'dark spot', 'vitamin c', 'glow', 'pigment', 'tone'],
  antiaging: ['anti-aging', 'anti aging', 'firm', 'wrinkle', 'retinol', 'peptide', 'collagen'],
  barrier: ['barrier', 'repair', 'ceramide', 'soothe', 'sensitive'],
};

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
  const { navigate, activeParams } = useApp();
  const params: Record<string, string | undefined> = activeParams ?? {};

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedConcern, setSelectedConcern] = useState(
    params.concern && VALID_CONCERN_IDS.has(params.concern) ? params.concern : 'all'
  );
  const [selectedBrand, setSelectedBrand] = useState<string | null>(params.brand ?? null);

  // A `cat` param opens the dedicated category page instead of filtering here.
  useEffect(() => {
    if (params.cat && VALID_CATEGORY_IDS.has(params.cat)) {
      navigate('shop-category', { categoryId: params.cat });
    }
  }, [params.cat]);

  useEffect(() => {
    if (params.concern && VALID_CONCERN_IDS.has(params.concern)) setSelectedConcern(params.concern);
    if (params.brand) setSelectedBrand(params.brand);
  }, [params.concern, params.brand]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of CATEGORY_ITEMS) {
      counts[item.id] = INDIAN_SKINCARE_CATALOG.filter((p) => p.category === item.id).length;
    }
    return counts;
  }, []);

  const filteredProducts = INDIAN_SKINCARE_CATALOG.filter((product) => {
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

    return matchesSearch && matchesConcern && matchesBrand;
  });

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedConcern('all');
    setSelectedBrand(null);
  };

  const hasActiveFilters = Boolean(selectedBrand) || selectedConcern !== 'all';
  const emptyHint = searchQuery || selectedBrand || (selectedConcern !== 'all' ? selectedConcern : '');

  return (
    <div className="shop-screen shop-browse">
      <header className="shop-header shop-browse-header">
        <h1>All Categories</h1>
        <button type="button" className="shop-icon-btn" onClick={() => navigate('cart-tab')} aria-label="Open cart">
          <ShoppingBag size={20} />
        </button>
      </header>

      <div className="shop-browse-toolbar">
        <label className="shop-browse-search">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search categories, products & active ingredients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button type="button" onClick={() => setSearchQuery('')} aria-label="Clear search">
              <X size={16} />
            </button>
          )}
        </label>

        <div className="shop-chip-row shop-browse-chip-row">
          {SKIN_CONCERNS.map((concern) => {
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
      </div>

      <div className="shop-browse-body">
        <aside className="shop-browse-sidebar" aria-label="Filters">
          <h3>Shop by Category</h3>
          {CATEGORY_ITEMS.map((cat) => (
            <button key={cat.id} type="button" className="shop-browse-side-item" onClick={() => navigate('shop-category', { categoryId: cat.id })}>
              <span className="shop-browse-side-badge" style={{ background: cat.color }}>
                <cat.Icon size={15} />
              </span>
              <span className="shop-browse-side-name">{cat.name}</span>
              <span className="shop-browse-side-count">{categoryCounts[cat.id] ?? 0}</span>
            </button>
          ))}

          <div className="shop-browse-side-divider" />

          <h3>Shop by Concern</h3>
          {SKIN_CONCERNS.map((concern) => {
            const isSelected = selectedConcern === concern.id;
            return (
              <button
                key={concern.id}
                type="button"
                className={`shop-browse-side-concern${isSelected ? ' is-active' : ''}`}
                aria-pressed={isSelected}
                onClick={() => setSelectedConcern(concern.id)}
              >
                {concern.label}
                {isSelected && <Check size={16} />}
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
          {selectedBrand && (
            <div className="shop-browse-banner">
              <span>
                Showing: {selectedBrand} ({filteredProducts.length} items)
              </span>
              <button type="button" onClick={() => setSelectedBrand(null)}>
                Show All
              </button>
            </div>
          )}

          <section className="shop-browse-directory">
            <h2>Browse Skincare Directory</h2>
            <div className="shop-browse-category-grid">
              {CATEGORY_ITEMS.map((cat, index) => (
                <button
                  key={cat.id}
                  type="button"
                  className="shop-browse-cat"
                  style={{ background: CATEGORY_TINTS[index % CATEGORY_TINTS.length] }}
                  onClick={() => navigate('shop-category', { categoryId: cat.id })}
                >
                  <img src={cat.imageUri} alt="" loading="lazy" />
                  <span className="shop-browse-cat-icon">
                    <cat.Icon size={16} />
                  </span>
                  <span className="shop-browse-cat-name">{cat.name}</span>
                  <span className="shop-browse-cat-count">{categoryCounts[cat.id] ?? 0} Items</span>
                </button>
              ))}
            </div>
          </section>

          <section className="shop-browse-products">
            <div className="shop-browse-products-head">
              <h2>Featured Products</h2>
              <span>{filteredProducts.length} results</span>
            </div>

            {filteredProducts.length === 0 ? (
              <div className="shop-empty">
                <Search size={48} />
                <h3>No products found</h3>
                <p>We couldn't find any products matching "{emptyHint}".</p>
                <button type="button" className="shop-browse-clear" onClick={clearFilters}>
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
        </main>
      </div>
    </div>
  );
};

export default ShopBrowseScreen;
