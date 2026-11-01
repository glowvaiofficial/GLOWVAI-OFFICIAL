import React, { useMemo, useState } from 'react';
import { ArrowLeft, Check, Mic, Search, SlidersHorizontal, X } from 'lucide-react';
import { useApp } from '../../../context/useApp';
import { INDIAN_SKINCARE_CATALOG } from '../../../core/data/indianSkincareCatalog';
import { ShopProductCard } from '../shared/ShopProductCard';
import { SHOP_BRANDS, SHOP_CATEGORIES, useScrollTopOn } from '../shared/shopCatalog';
import { getDiscountPercent } from '../shared/shopUtils';
import '../styles/shop-search-filters.css';

const PRICE_BUCKETS: { id: string; label: string; test: (price: number) => boolean }[] = [
  { id: 'lt400', label: 'Under ₹400', test: (p) => p < 400 },
  { id: '400to499', label: '₹400 – ₹499', test: (p) => p >= 400 && p < 500 },
  { id: 'gte500', label: '₹500 and above', test: (p) => p >= 500 },
];

// Search ideas drawn from ingredients and product types that are actually in the catalogue.
const SEARCH_IDEAS = ['Niacinamide', 'Sunscreen', 'Ceramide', 'Salicylic', 'Kojic', 'Hyaluronic', 'Vitamin C', 'Cleanser'];

type FilterKey = 'category' | 'brand' | 'price';
type ActiveFilters = Record<FilterKey, string>;
type SortId = 'relevance' | 'price_low' | 'price_high' | 'discount';

const EMPTY_FILTERS: ActiveFilters = { category: 'all', brand: 'all', price: 'all' };

const FILTER_GROUPS: { title: string; key: FilterKey; options: { id: string; label: string }[] }[] = [
  { title: 'Category', key: 'category', options: SHOP_CATEGORIES.map((c) => ({ id: c.id, label: c.short })) },
  { title: 'Brand', key: 'brand', options: SHOP_BRANDS.map((b) => ({ id: b.brand, label: b.brand })) },
  { title: 'Price', key: 'price', options: PRICE_BUCKETS.map((b) => ({ id: b.id, label: b.label })) },
];

const SORTS: { id: SortId; label: string }[] = [
  { id: 'relevance', label: 'Relevance' },
  { id: 'price_low', label: 'Price: low to high' },
  { id: 'price_high', label: 'Price: high to low' },
  { id: 'discount', label: 'Biggest discount' },
];

const labelFor = (key: FilterKey, id: string) => FILTER_GROUPS.find((g) => g.key === key)?.options.find((o) => o.id === id)?.label ?? id;

export const ShopSearchFiltersScreen: React.FC = () => {
  const { navigate, goBack, activeParams } = useApp();
  const topRef = useScrollTopOn('search');
  // Opened from a "See all" link, the search can start with a query or a sort order (for example lowest price first).
  const initialSort = SORTS.find((s) => s.id === activeParams?.sort)?.id ?? 'relevance';

  const [query, setQuery] = useState(typeof activeParams?.query === 'string' ? activeParams.query : '');
  const [isListening, setIsListening] = useState(false);
  const [voiceNote, setVoiceNote] = useState<string | null>(null);
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>(EMPTY_FILTERS);
  const [sortBy, setSortBy] = useState<SortId>(initialSort);

  const w = typeof window !== 'undefined' ? (window as any) : undefined;
  const Recognition = w?.SpeechRecognition || w?.webkitSpeechRecognition;

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matched = INDIAN_SKINCARE_CATALOG.filter((p) => {
      const matchesQuery =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        (q.includes('sunscreen') && p.category === 'Suncare') ||
        (q.includes('cleanser') && p.category === 'Cleansers') ||
        p.keyActives.some((a) => a.toLowerCase().includes(q));
      const matchesCategory = activeFilters.category === 'all' || p.category === activeFilters.category;
      const matchesBrand = activeFilters.brand === 'all' || p.brand === activeFilters.brand;
      const bucket = PRICE_BUCKETS.find((b) => b.id === activeFilters.price);
      const matchesPrice = !bucket || bucket.test(p.price);
      return matchesQuery && matchesCategory && matchesBrand && matchesPrice;
    });
    const sorted = [...matched];
    if (sortBy === 'price_low') sorted.sort((a, b) => a.price - b.price);
    if (sortBy === 'price_high') sorted.sort((a, b) => b.price - a.price);
    if (sortBy === 'discount') sorted.sort((a, b) => getDiscountPercent(b) - getDiscountPercent(a));
    return sorted;
  }, [query, activeFilters, sortBy]);

  const activeChips = (Object.keys(activeFilters) as FilterKey[])
    .filter((key) => activeFilters[key] !== 'all')
    .map((key) => ({ key, label: labelFor(key, activeFilters[key]) }));

  const toggleOption = (key: FilterKey, option: string) =>
    setActiveFilters((prev) => ({ ...prev, [key]: prev[key] === option ? 'all' : option }));
  const clearAll = () => {
    setActiveFilters(EMPTY_FILTERS);
    setQuery('');
  };

  const handleVoiceSearch = () => {
    if (!Recognition) return;
    try {
      const recognition = new Recognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-IN';
      setVoiceNote(null);
      setIsListening(true);
      recognition.onresult = (event: any) => {
        const transcript = event.results?.[0]?.[0]?.transcript;
        if (transcript) setQuery(transcript);
        setIsListening(false);
      };
      recognition.onerror = () => {
        setIsListening(false);
        setVoiceNote('Voice search could not hear you. Check microphone permission and try again.');
      };
      recognition.onend = () => setIsListening(false);
      recognition.start();
    } catch {
      setIsListening(false);
      setVoiceNote('Voice search is not available right now.');
    }
  };

  const count = results.length;
  const trimmed = query.trim();

  return (
    <div ref={topRef} className="shop-screen shop-search">
      <header className="shop-header shop-search-header">
        <button type="button" className="shop-icon-btn" onClick={goBack} aria-label="Go back">
          <ArrowLeft size={18} />
        </button>
        <label className="shop-search-bar">
          <Search size={18} />
          <input
            type="text"
            enterKeyHint="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products, brands or actives"
            aria-label="Search products"
          />
          {query.length > 0 && (
            <button type="button" className="shop-search-clear" onClick={() => setQuery('')} aria-label="Clear search">
              <X size={16} />
            </button>
          )}
          {Recognition && (
            <button
              type="button"
              className={`shop-search-mic${isListening ? ' is-listening' : ''}`}
              onClick={handleVoiceSearch}
              aria-label={isListening ? 'Listening' : 'Search by voice'}
            >
              <Mic size={17} />
            </button>
          )}
        </label>
      </header>

      {(isListening || voiceNote) && (
        <p className="shop-search-voice" role="status">
          {isListening ? 'Listening… say a product, brand or ingredient.' : voiceNote}
        </p>
      )}

      {!trimmed && (
        <div className="shop-search-ideas">
          <span>Try</span>
          <div className="shop-search-ideas-row">
            {SEARCH_IDEAS.map((idea) => (
              <button key={idea} type="button" className="shop-chip" onClick={() => setQuery(idea)}>
                <Search size={13} />
                {idea}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="shop-search-layout">
        <aside className="shop-search-filters" aria-label="Filters">
          <div className="shop-search-filters-head">
            <h2>
              <SlidersHorizontal size={16} /> Filters
            </h2>
            {activeChips.length > 0 && (
              <button type="button" onClick={() => setActiveFilters(EMPTY_FILTERS)}>
                Reset
              </button>
            )}
          </div>
          {FILTER_GROUPS.map((group) => (
            <section key={group.key} className="shop-search-group">
              <h3>{group.title}</h3>
              <div className="shop-search-options" role="group" aria-label={group.title}>
                {group.options.map((opt) => {
                  const isSelected = activeFilters[group.key] === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      className={`shop-chip${isSelected ? ' is-active' : ''}`}
                      aria-pressed={isSelected}
                      onClick={() => toggleOption(group.key, opt.id)}
                    >
                      {isSelected && <Check size={13} />}
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </aside>

        <section className="shop-search-results" aria-live="polite">
          <div className="shop-search-toolbar">
            <div className="shop-search-count">
              <h2>
                {count} {count === 1 ? 'product' : 'products'}
              </h2>
              <p>{trimmed ? `for "${trimmed}"` : 'in the shop'}</p>
            </div>
            <label className="shop-search-sort">
              <span>Sort</span>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortId)} aria-label="Sort results">
                {SORTS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {activeChips.length > 0 && (
            <div className="shop-search-applied">
              {activeChips.map((chip) => (
                <button key={chip.key} type="button" className="shop-search-applied-chip" onClick={() => toggleOption(chip.key, activeFilters[chip.key])} aria-label={`Remove ${chip.label} filter`}>
                  {chip.label}
                  <X size={13} />
                </button>
              ))}
            </div>
          )}

          {count > 0 ? (
            <div className="shop-product-grid shop-search-grid">
              {results.map((product) => (
                <ShopProductCard key={product.id} product={product} onOpen={(p) => navigate('shop-product', { productId: p.id })} />
              ))}
            </div>
          ) : (
            <div className="shop-empty">
              <span className="shop-empty-icon">
                <Search size={26} />
              </span>
              <h3>No products match</h3>
              <p>Try another ingredient, brand or price range.</p>
              <button type="button" className="shop-btn-secondary" onClick={clearAll}>
                Clear search and filters
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
