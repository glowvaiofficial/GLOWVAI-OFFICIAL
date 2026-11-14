import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Check, Mic, Search, SlidersHorizontal, X } from 'lucide-react';
import { useApp } from '../../../context/useApp';
import { useLiveCatalog, type SkincareProduct } from '../../../core/data/indianSkincareCatalog';
import { rankSuggestions } from '../../../../lib/shop/suggest';
import { ShopProductCard } from '../shared/ShopProductCard';
import '../styles/shop-search-filters.css';

const SUGGEST_LIST_ID = 'shop-search-suggestions';
const REAL_CATEGORIES = ['Serums', 'Cleansers', 'Moisturizers', 'Suncare', 'Treatments'];
const OPTION_LABELS: Record<string, string> = { Suncare: 'Sunscreen' };
// Only brands with at least one catalogue product, so a brand filter never empties the list on its own.
const PRICE_BUCKETS: Record<string, (price: number) => boolean> = {
  'Under ₹500': (p) => p < 500,
  '₹500–₹1000': (p) => p >= 500 && p <= 1000,
  '₹1000+': (p) => p > 1000,
};

type FilterKey = 'category' | 'brand' | 'price';
type ActiveFilters = Record<FilterKey, string>;

const EMPTY_FILTERS: ActiveFilters = { category: 'All', brand: 'All', price: 'All' };

const FILTER_GROUPS: { title: string; key: FilterKey; options: string[] }[] = [
  { title: 'Category', key: 'category', options: ['All', ...REAL_CATEGORIES] },
  { title: 'Brand', key: 'brand', options: ['All'] },
  { title: 'Price', key: 'price', options: ['All', ...Object.keys(PRICE_BUCKETS)] },
];

export const ShopSearchFiltersScreen: React.FC = () => {
  const catalog = useLiveCatalog();
  const STOCKED_BRANDS = Array.from(new Set(catalog.map((p) => p.brand))).sort();
  // Brand options come from the live products; the other groups are fixed.
  const filterGroups = FILTER_GROUPS.map((g) => (g.key === 'brand' ? { ...g, options: ['All', ...STOCKED_BRANDS] } : g));
  const { navigate, goBack, activeParams } = useApp();

  // A query handed over from the home voice search starts the search.
  const [query, setQuery] = useState<string>(() => (typeof activeParams?.q === 'string' ? activeParams.q : ''));
  const [isListening, setIsListening] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>(EMPTY_FILTERS);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const resultsRef = useRef<HTMLElement>(null);

  // The mic is shown only in browsers that have speech recognition.
  useEffect(() => {
    const w = window as any;
    setVoiceSupported(Boolean(w.SpeechRecognition || w.webkitSpeechRecognition));
  }, []);

  // Suggestions are the best matches by name and brand from the products already loaded: no request per keystroke.
  const suggestions = useMemo(() => rankSuggestions(catalog, query), [catalog, query]);
  const showSuggest = isSearchFocused && suggestions.length > 0;
  const openSuggestion = (product: SkincareProduct) => {
    setIsSearchFocused(false);
    setActiveSuggestion(-1);
    navigate('shop-product', { productId: product.id });
  };
  const closeSuggest = () => {
    setIsSearchFocused(false);
    setActiveSuggestion(-1);
  };
  const onSearchKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' && suggestions.length > 0) {
      e.preventDefault();
      setIsSearchFocused(true);
      setActiveSuggestion((i) => (i + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp' && suggestions.length > 0) {
      e.preventDefault();
      setIsSearchFocused(true);
      setActiveSuggestion((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === 'Enter' && showSuggest && activeSuggestion >= 0) {
      e.preventDefault();
      openSuggestion(suggestions[activeSuggestion]);
    } else if (e.key === 'Escape') {
      if (showSuggest) {
        e.preventDefault();
        closeSuggest();
      } else if (query) {
        setQuery('');
      }
    }
  };

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return catalog.filter((p) => {
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
    if (!Recognition) return;
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
  const showResults = () => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <div className="shop-screen shop-search">
      <header className="shop-header">
        <button type="button" className="shop-icon-btn" onClick={goBack} aria-label="Go back">
          <ArrowLeft size={18} />
        </button>
        <h1 className="shop-search-title">Search</h1>
      </header>

      <div className="shop-search-body">
        <div className="shop-search-bar-wrap">
          <div className="shop-input shop-search-bar">
            <Search size={18} />
            <input
              type="text"
              role="combobox"
              aria-expanded={showSuggest}
              aria-controls={SUGGEST_LIST_ID}
              aria-autocomplete="list"
              aria-activedescendant={showSuggest && activeSuggestion >= 0 ? `${SUGGEST_LIST_ID}-${activeSuggestion}` : undefined}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActiveSuggestion(-1);
                setIsSearchFocused(true);
              }}
              onKeyDown={onSearchKey}
              onFocus={() => setIsSearchFocused(true)}
              placeholder="Search by ingredient, product or brand..."
              aria-label="Search products"
            />
            {query.length > 0 && (
              <button type="button" className="shop-input-clear" onClick={() => setQuery('')} aria-label="Clear search">
                <X size={16} />
              </button>
            )}
            {voiceSupported && (
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
            )}
          </div>

          {showSuggest && (
            <>
              <button type="button" className="shop-search-backdrop" onClick={closeSuggest} aria-label="Close suggestions" tabIndex={-1} />
              <ul id={SUGGEST_LIST_ID} role="listbox" aria-label="Suggested products" className="shop-search-suggest">
                {suggestions.map((product, index) => (
                  <li
                    key={product.id}
                    id={`${SUGGEST_LIST_ID}-${index}`}
                    role="option"
                    aria-selected={index === activeSuggestion}
                    className={index === activeSuggestion ? 'shop-search-suggest-row is-active' : 'shop-search-suggest-row'}
                    // The input keeps focus while a suggestion is picked; the choice is made on press.
                    onMouseDown={(e) => {
                      e.preventDefault();
                      openSuggestion(product);
                    }}
                    onMouseEnter={() => setActiveSuggestion(index)}
                  >
                    <span>
                      <Search size={14} /> {product.name}
                    </span>
                    <span>{product.brand}</span>
                  </li>
                ))}
              </ul>
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
            {filterGroups.map((group) => (
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
                        {OPTION_LABELS[opt] ?? opt}
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}
          </aside>

          <section className="shop-search-results" ref={resultsRef}>
            <div className="shop-search-toolbar">
              <div>
                <h2>
                  {count} {count === 1 ? 'product' : 'products'} found
                </h2>
                <p>{query.trim() ? `Results for "${query.trim()}"` : 'Showing all products'}</p>
              </div>
              {activeChips.length > 0 && (
                <div className="shop-search-applied">
                  {activeChips.map((chip) => (
                    <span key={chip.key} className="shop-search-applied-chip">
                      {OPTION_LABELS[chip.value] ?? chip.value}
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
                <span className="shop-empty-icon">
                  <Search size={24} />
                </span>
                <h3>No products match these filters</h3>
                <p>Try another ingredient, brand or price range.</p>
                <button type="button" className="shop-btn-primary" onClick={clearAll}>
                  Clear all filters
                </button>
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Phones: filters sit above the results, so this jumps down to them. */}
      <div className="shop-search-bottom">
        <button type="button" className="shop-btn-primary" onClick={showResults}>
          Show {count} {count === 1 ? 'result' : 'results'}
        </button>
      </div>
    </div>
  );
};
