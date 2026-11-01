import React, { useEffect, useState } from 'react';
import { ArrowLeft, ArrowUpDown, Search, ShoppingBag, X } from 'lucide-react';
import { useApp } from '../../../context/useApp';
import { useCartStore } from '../../../core/state/cartStore';
import { ShopProductCard } from '../shared/ShopProductCard';
import { SHOP_CATEGORIES, categoryCount, getCategoryMeta, productsInCategory, useScrollTopOn } from '../shared/shopCatalog';
import { getDiscountPercent } from '../shared/shopUtils';
import '../styles/shop-category.css';

type SortId = 'featured' | 'price_low' | 'price_high' | 'discount';

// "Featured" keeps the catalogue order; there is no sales or popularity data to sort by.
const SORT_OPTIONS: { id: SortId; label: string }[] = [
  { id: 'featured', label: 'Featured' },
  { id: 'price_low', label: 'Price: low to high' },
  { id: 'price_high', label: 'Price: high to low' },
  { id: 'discount', label: 'Biggest discount' },
];

export const ShopCategoryScreen: React.FC = () => {
  const { navigate, goBack, activeParams } = useApp();
  const paramId: string = activeParams?.categoryId ?? activeParams?.id ?? '';
  const cartCount = useCartStore((s) => s.totalCount);

  const [categoryId, setCategoryId] = useState(paramId);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortId>('featured');
  const topRef = useScrollTopOn(categoryId);

  useEffect(() => setCategoryId(paramId), [paramId]);

  const meta = getCategoryMeta(categoryId);
  const categoryLabel = meta?.label ?? (categoryId || 'Category');

  const q = searchQuery.trim().toLowerCase();
  const products = productsInCategory(categoryId)
    .filter((p) => !q || p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q) || p.keyActives.some((a) => a.toLowerCase().includes(q)))
    .map((p, index) => ({ p, index }))
    .sort((a, b) => {
      switch (sortBy) {
        case 'price_low':
          return a.p.price - b.p.price;
        case 'price_high':
          return b.p.price - a.p.price;
        case 'discount':
          return getDiscountPercent(b.p) - getDiscountPercent(a.p);
        default:
          return a.index - b.index;
      }
    })
    .map(({ p }) => p);

  const switchCategory = (id: string) => {
    setCategoryId(id);
    setSearchQuery('');
  };

  return (
    <div ref={topRef} className="shop-screen shop-category">
      <header className="shop-header shop-category-header">
        <button type="button" className="shop-icon-btn" onClick={goBack} aria-label="Go back">
          <ArrowLeft size={20} />
        </button>
        <div className="shop-category-heading">
          <h1>{categoryLabel}</h1>
          <small>
            {categoryCount(categoryId)} {categoryCount(categoryId) === 1 ? 'product' : 'products'}
          </small>
        </div>
        <button type="button" className="shop-icon-btn" onClick={() => navigate('shop-search-filters')} aria-label="Search all products">
          <Search size={18} />
        </button>
        <button type="button" className="shop-icon-btn shop-header-cart" onClick={() => navigate('cart-tab')} aria-label={`Open bag, ${cartCount} items`}>
          <ShoppingBag size={18} />
          {cartCount > 0 && <span className="shop-icon-count">{cartCount}</span>}
        </button>
      </header>

      <nav className="shop-chip-row shop-category-tabs" aria-label="Categories">
        {SHOP_CATEGORIES.map((cat) => {
          const isActive = cat.id === categoryId;
          return (
            <button
              key={cat.id}
              type="button"
              className={`shop-chip${isActive ? ' is-active' : ''}`}
              aria-current={isActive ? 'page' : undefined}
              onClick={() => switchCategory(cat.id)}
            >
              <cat.Icon size={14} />
              {cat.short}
            </button>
          );
        })}
      </nav>

      <div className="shop-category-toolbar">
        <label className="shop-category-search">
          <Search size={18} />
          <input
            type="text"
            enterKeyHint="search"
            placeholder={`Search in ${meta?.short.toLowerCase() ?? 'this category'}`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label={`Search in ${categoryLabel}`}
          />
          {searchQuery && (
            <button type="button" onClick={() => setSearchQuery('')} aria-label="Clear search">
              <X size={16} />
            </button>
          )}
        </label>

        <label className="shop-category-sort">
          <ArrowUpDown size={15} />
          <span className="shop-category-sort-label">Sort</span>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortId)} aria-label="Sort products">
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <main className="shop-category-main">
        {products.length === 0 ? (
          <div className="shop-empty">
            <span className="shop-empty-icon">
              <Search size={26} />
            </span>
            <h3>{searchQuery ? 'No matches here' : 'Nothing in this category yet'}</h3>
            <p>{searchQuery ? `Nothing in ${categoryLabel} matches "${searchQuery}".` : 'Pick another category above, or browse everything.'}</p>
            {searchQuery ? (
              <button type="button" className="shop-btn-secondary" onClick={() => setSearchQuery('')}>
                Clear search
              </button>
            ) : (
              <button type="button" className="shop-btn-secondary" onClick={() => navigate('shop-browse')}>
                Browse all products
              </button>
            )}
          </div>
        ) : (
          <div className="shop-product-grid">
            {products.map((product) => (
              <ShopProductCard key={product.id} product={product} onOpen={(p) => navigate('shop-product', { productId: p.id })} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default ShopCategoryScreen;
