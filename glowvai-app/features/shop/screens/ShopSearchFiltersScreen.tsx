import React, { useMemo, useState } from 'react';
import { ArrowLeft, Check, Mic, Search, SlidersHorizontal, Sparkles, X } from 'lucide-react';
import { useApp } from '../../../context/useApp';
import { INDIAN_SKINCARE_CATALOG, ALL_SKINCARE_BRANDS } from '../../../core/data/indianSkincareCatalog';
import { useCartStore } from '../../../core/state/cartStore';
import { ShopProductCard } from '../shared/ShopProductCard';
import '../styles/shop-search-filters.css';

const REAL_CATEGORIES = ['Serums', 'Cleansers', 'Moisturizers', 'Suncare', 'Treatments'];
const PRICE_BUCKETS: Record<string, (price: number) => boolean> = {
  'Under ₹500': (p) => p < 500,
  '₹500–₹1000': (p) => p >= 500 && p <= 1000,
  '₹1000+': (p) => p > 1000,
};

type FilterKey = 'category' | 'brand' | 'price';
type ActiveFilters = Record<FilterKey, string>;

const EMPTY_FILTERS: ActiveFilters = { category: 'All', brand: 'All', price: 'All' };

const FILTER_GROUPS: { title: string; key: FilterKey; options: string[] }[] = [
  { title: '1. Category', key: 'category', options: ['All', ...REAL_CATEGORIES] },
  { title: '2. Brand', key: 'brand', options: ['All', ...ALL_SKINCARE_BRANDS] },
  { title: '3. Price Range', key: 'price', options: ['All', ...Object.keys(PRICE_BUCKETS)] },
];

export const ShopSearchFiltersScreen: React.FC = () => {
  const { navigate, goBack } = useApp();
  const addItem = useCartStore((state) => state.addItem);

  const [query, setQuery] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>(EMPTY_FILTERS);

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    const source = q
      ? INDIAN_SKINCARE_CATALOG.filter((p) => p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q))
      : INDIAN_SKINCARE_CATALOG;
    return source
      .slice(0, 5)
      .map((p) => p.name)
      .filter((name) => !q || name.toLowerCase().includes(q));
  }, [query]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return INDIAN_SKINCARE_CATALOG.filter((p) => {
      const matchesQuery =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.keyActives.some((a) => a.toLowerCase().includes(q));
      const matchesCategory = activeFilters.category === 'All' || p.category === activeFilters.category;
      const matchesBrand = activeFilters.brand === 'All' || p.brand === activeFilters.brand;
      const matchesPrice = activeFilters.price === 'All' || PRICE_BUCKETS[activeFilters.price]?.(p.price);
      return matchesQuery && matchesCategory && matchesBrand && matchesPrice;
    });
  }, [query, activeFilters]);

  const activeChips = (Object.keys(activeFilters) as FilterKey[])
    .filter((key) => activeFilters[key] !== 'All')
    .map((key) => ({ key, value: activeFilters[key] }));

  const clearChip = (key: FilterKey) => setActiveFilters((prev) => ({ ...prev, [key]: 'All' }));
  const selectOption = (key: FilterKey, option: string) => setActiveFilters((prev) => ({ ...prev, [key]: option }));
  const clearAll = () => setActiveFilters(EMPTY_FILTERS);

  const handleVoiceSearch = () => {
    const w = window as any;
    const Recognition = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Recognition) {
      window.alert('Voice search supported on Chrome, Edge and Safari browsers.');
      return;
    }
    try {
      const recognition = new Recognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-IN';
      setIsListening(true);
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) setQuery(transcript);
        setIsListening(false);
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);
      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  const count = results.length;
  const suggestTitle = query.trim() ? `Live Autocomplete Matches for "${query}"` : 'Popular Skincare Queries';

  return (
    <div className="shop-screen shop-search">
      <header className="shop-header">
        <button type="button" className="shop-icon-btn" onClick={goBack} aria-label="Go back">
          <ArrowLeft size={18} />
        </button>
        <h1 className="shop-search-title">
          <Sparkles size={16} /> GlowVAI <span>|</span> Search &amp; Filters
        </h1>
      </header>

      <div className="shop-search-body">
        <div className="shop-search-bar-wrap">
          <div className="shop-search-bar">
            <Search size={18} />
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setIsSearchFocused(true);
              }}
              onFocus={() => setIsSearchFocused(true)}
              placeholder="Search by ingredient, product or brand..."
              aria-label="Search products"
            />
            {query.length > 0 && (
              <button type="button" className="shop-search-clear" onClick={() => setQuery('')} aria-label="Clear search">
                <X size={16} />
              </button>
            )}
            <button
              type="button"
              className={`shop-search-mic${isListening ? ' is-listening' : ''}`}
              onClick={() => {
                setIsSearchFocused(true);
                handleVoiceSearch();
              }}
              aria-label="Voice search"
            >
              <Mic size={18} />
              {isListening && <span>Listening...</span>}
            </button>
          </div>

          {isSearchFocused && (
            <>
              <button
                type="button"
                className="shop-search-backdrop"
                onClick={() => setIsSearchFocused(false)}
                aria-label="Close suggestions"
              />
              <div className="shop-search-suggest">
                <div className="shop-search-suggest-head">
                  <span>{suggestTitle}</span>
                  <button type="button" onClick={() => setIsSearchFocused(false)}>
                    Done
                  </button>
                </div>
                {suggestions.map((term) => (
                  <button
                    key={term}
                    type="button"
                    className="shop-search-suggest-row"
                    onClick={() => {
                      setQuery(term);
                      setIsSearchFocused(false);
                    }}
                  >
                    <span>
                      <Search size={14} /> {term}
                    </span>
                    <span>Select →</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="shop-search-layout">
          <aside className="shop-search-filters">
            <div className="shop-search-filters-head">
              <h2>
                <SlidersHorizontal size={18} /> Filters
              </h2>
              <button type="button" onClick={clearAll}>
                Reset All
              </button>
            </div>
            {FILTER_GROUPS.map((group) => (
              <section key={group.key} className="shop-search-group">
                <h3>{group.title}</h3>
                <div className="shop-search-options">
                  {group.options.map((opt) => {
                    const isSelected = activeFilters[group.key] === opt;
                    return (
                      <button
                        key={opt}
                        type="button"
                        className={`shop-chip${isSelected ? ' is-active' : ''}`}
                        aria-pressed={isSelected}
                        onClick={() => selectOption(group.key, opt)}
                      >
                        {isSelected && <Check size={12} />}
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}
          </aside>

          <section className="shop-search-results">
            <div className="shop-search-toolbar">
              <div>
                <h2>{count} Products Found</h2>
                <p>{query.trim() ? `Showing results matching "${query}"` : 'Showing all formulations'}</p>
              </div>
              {activeChips.length > 0 && (
                <div className="shop-search-applied">
                  {activeChips.map((chip) => (
                    <span key={chip.key} className="shop-search-applied-chip">
                      {chip.value}
                      <button type="button" onClick={() => clearChip(chip.key)} aria-label={`Remove ${chip.value} filter`}>
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {count > 0 ? (
              <div className="shop-product-grid shop-search-grid">
                {results.map((product) => (
                  <ShopProductCard
                    key={product.id}
                    product={product}
                    onOpen={(p) => navigate('shop-product', { productId: p.id })}
                  />
                ))}
              </div>
            ) : (
              <div className="shop-empty">
                <h3>No products match these filters</h3>
                <p>Try another ingredient, brand or price range.</p>
                <button type="button" className="shop-btn-secondary shop-search-empty-btn" onClick={clearAll}>
                  Clear all filters
                </button>
              </div>
            )}
          </section>
        </div>
      </div>

      <div className="shop-search-bottom">
        <button type="button" className="shop-btn-secondary" onClick={clearAll}>
          Clear All
        </button>
        <button type="button" className="shop-btn-primary" onClick={goBack}>
          Show {count} Results →
        </button>
      </div>
    </div>
  );
};
