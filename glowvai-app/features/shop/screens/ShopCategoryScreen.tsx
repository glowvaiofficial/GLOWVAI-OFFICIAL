import React, { useState } from 'react';
import { ArrowLeft, ArrowUpDown, Check, ChevronDown, ChevronUp, LayoutGrid, Search, ShoppingBag, X } from 'lucide-react';
import { useApp } from '../../../context/useApp';
import { INDIAN_SKINCARE_CATALOG } from '../../../core/data/indianSkincareCatalog';
import { ShopProductCard } from '../shared/ShopProductCard';
import '../styles/shop-category.css';

const CATEGORY_LABELS: Record<string, string> = {
  Serums: 'Serums & Actives',
  Cleansers: 'Cleansers & Washes',
  Moisturizers: 'Moisturizers & Creams',
  Suncare: 'Sunscreen & SPF',
  Treatments: 'Spot Treatments',
};

const SORT_OPTIONS = [
  { id: 'popularity', label: 'Popularity' },
  { id: 'price_low', label: 'Price: Low to High' },
  { id: 'price_high', label: 'Price: High to Low' },
  { id: 'rating', label: 'Rating' },
];

export const ShopCategoryScreen: React.FC = () => {
  const { navigate, goBack, activeParams } = useApp();
  const categoryId: string = activeParams?.categoryId ?? activeParams?.id ?? '';

  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('popularity');
  const [sortMenuOpen, setSortMenuOpen] = useState(false);

  const categoryLabel = CATEGORY_LABELS[categoryId] ?? categoryId;
  const sortLabel = SORT_OPTIONS.find((s) => s.id === sortBy)?.label;

  // Opened without a known category: offer the real ones instead of an empty list.
  if (!CATEGORY_LABELS[categoryId]) {
    return (
      <div className="shop-screen shop-category">
        <header className="shop-header shop-category-header">
          <button type="button" className="shop-icon-btn" onClick={goBack} aria-label="Go back">
            <ArrowLeft size={20} />
          </button>
          <h1>Categories</h1>
          <button type="button" className="shop-icon-btn" onClick={() => navigate('cart-tab')} aria-label="Open cart">
            <ShoppingBag size={20} />
          </button>
        </header>
        <div className="shop-empty shop-category-pick">
          <span className="shop-empty-icon">
            <LayoutGrid size={24} />
          </span>
          <h3>Pick a category</h3>
          <p>Choose what you'd like to shop.</p>
          <div className="shop-category-pick-list">
            {Object.entries(CATEGORY_LABELS).map(([id, label]) => (
              <button key={id} type="button" className="shop-chip" onClick={() => navigate('shop-category', { categoryId: id })}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const q = searchQuery.trim().toLowerCase();
  const products = INDIAN_SKINCARE_CATALOG.filter((p) => {
    if (p.category !== categoryId) return false;
    if (!q) return true;
    return p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q);
  }).sort((a, b) => {
    switch (sortBy) {
      case 'price_low':
        return a.price - b.price;
      case 'price_high':
        return b.price - a.price;
      case 'rating':
        return b.rating - a.rating;
      default:
        // Popularity: the products with the most catalogue reviews first.
        return b.reviewCount - a.reviewCount;
    }
  });

  return (
    <div className="shop-screen shop-category">
      <header className="shop-header shop-category-header">
        <button type="button" className="shop-icon-btn" onClick={goBack} aria-label="Go back">
          <ArrowLeft size={20} />
        </button>
        <h1>{categoryLabel}</h1>
        <button type="button" className="shop-icon-btn" onClick={() => navigate('cart-tab')} aria-label="Open cart">
          <ShoppingBag size={20} />
        </button>
      </header>

      <div className="shop-category-toolbar">
        <label className="shop-input shop-category-search">
          <Search size={18} />
          <input
            type="text"
            placeholder={`Search in ${categoryLabel}`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button type="button" className="shop-input-clear" onClick={() => setSearchQuery('')} aria-label="Clear search">
              <X size={16} />
            </button>
          )}
        </label>

        <div className="shop-category-sort-row">
          <span className="shop-category-count">{products.length} {products.length === 1 ? 'product' : 'products'}</span>
          <div className="shop-category-sort">
            <button
              type="button"
              className="shop-category-sort-btn"
              aria-expanded={sortMenuOpen}
              onClick={() => setSortMenuOpen((v) => !v)}
            >
              <ArrowUpDown size={14} />
              {sortLabel}
              {sortMenuOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {sortMenuOpen && (
              <div className="shop-category-sort-menu">
                {SORT_OPTIONS.map((opt) => {
                  const isActive = sortBy === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      className={`shop-category-sort-item${isActive ? ' is-active' : ''}`}
                      onClick={() => {
                        setSortBy(opt.id);
                        setSortMenuOpen(false);
                      }}
                    >
                      {opt.label}
                      {isActive && <Check size={16} />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <main className="shop-category-main">
        {products.length === 0 ? (
          <div className="shop-empty">
            <span className="shop-empty-icon">
              <Search size={24} />
            </span>
            <h3>No products found</h3>
            <p>{searchQuery ? `Nothing matches "${searchQuery}" in ${categoryLabel}.` : `No products in ${categoryLabel} yet.`}</p>
            {searchQuery && (
              <button type="button" className="shop-btn-primary" onClick={() => setSearchQuery('')}>
                Clear search
              </button>
            )}
          </div>
        ) : (
          <div className="shop-product-grid">
            {products.map((product) => (
              <ShopProductCard
                key={product.id}
                product={product}
                onOpen={(p) => navigate('shop-product', { productId: p.id })}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default ShopCategoryScreen;
