import React, { useState } from 'react';
import { Search, X, ArrowLeft, Clock, Sparkles } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ProductCard } from '../components/cards/ProductCard';
import { PRODUCTS } from '../data/products';
import '../responsive/home-products.css';

export const SearchScreen: React.FC = () => {
  const { goBack, activeParams } = useApp();
  const [query, setQuery] = useState(activeParams?.query || '');
  const [recentSearches, setRecentSearches] = useState<string[]>([
    'Salicylic Acid',
    'SPF 50',
    'Niacinamide',
    'Cetaphil',
  ]);

  const q = query.toLowerCase().trim();

  const results = q
    ? PRODUCTS.filter((p) => {
        const matchName = p.name.toLowerCase().includes(q);
        const matchBrand = p.brand.toLowerCase().includes(q);
        const matchSub = p.subcategory.toLowerCase().includes(q);
        const matchIngr = p.ingredients.some((i) => i.toLowerCase().includes(q));
        const matchSkin = p.skinTypes.some((s) => s.toLowerCase().includes(q));
        return matchName || matchBrand || matchSub || matchIngr || matchSkin;
      })
    : [];

  const handleRecentClick = (term: string) => {
    setQuery(term);
  };

  const clearQuery = () => {
    setQuery('');
  };

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#FFFFFF',
        overflowY: 'auto',
      }}
    >
      {/* Search Input Header */}
      <div
        className="zq-search-head"
        style={{
          padding: 'var(--zq-search-pad, 10px 16px)',
          borderBottom: '1px solid #E2E5EB',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          backgroundColor: '#FFFFFF',
          position: 'var(--zq-search-pos, sticky)' as React.CSSProperties['position'],
          top: 0,
          zIndex: 30,
        }}
      >
        <button
          onClick={goBack}
          style={{
            padding: '6px',
            borderRadius: '8px',
            backgroundColor: '#F7F8FB',
            color: '#161A22',
          }}
          aria-label="Back"
        >
          <ArrowLeft size={20} />
        </button>

        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: '#F0F2F6',
            borderRadius: '10px',
            padding: '8px 12px',
          }}
        >
          <Search size={18} color="#687080" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products, brands, or actives..."
            style={{
              flex: 1,
              border: 'none',
              backgroundColor: 'transparent',
              outline: 'none',
              fontSize: '14px',
              color: '#161A22',
            }}
            autoFocus
          />
          {query && (
            <button onClick={clearQuery} style={{ color: '#687080' }}>
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      <div className="zq-search-body" style={{ padding: 'var(--zq-search-body-pad, 16px)', flex: 1 }}>
        {/* If no query, show Recent Searches & Popular Tags */}
        {!query ? (
          <div>
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                <Clock size={15} color="#687080" />
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#161A22' }}>
                  Recent Searches
                </span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {recentSearches.map((term) => (
                  <button
                    key={term}
                    onClick={() => handleRecentClick(term)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '999px',
                      backgroundColor: '#F7F8FB',
                      border: '1px solid #E2E5EB',
                      fontSize: '12px',
                      color: '#545B69',
                      fontWeight: 500,
                    }}
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                <Sparkles size={15} color="#2854C5" />
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#161A22' }}>
                  Trending Formulations
                </span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {['Ceramides', 'Salicylic Acid', 'Vitamin B5', 'Oily Skin', 'Dark Spots'].map((tag) => (
                  <button
                    key={tag}
                    onClick={() => handleRecentClick(tag)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '8px',
                      backgroundColor: '#F0F7FF',
                      border: '1px solid #CDD9FB',
                      fontSize: '12px',
                      color: '#2854C5',
                      fontWeight: 600,
                    }}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div>
            {/* Results count header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '13px', color: '#687080' }}>
                Found <strong>{results.length}</strong> {results.length === 1 ? 'product' : 'products'} for "{query}"
              </span>
            </div>

            {results.length > 0 ? (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'var(--zq-grid-cols, repeat(2, 1fr))',
                  gap: 'var(--zq-grid-gap, 12px)',
                }}
              >
                {results.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            ) : (
              <div
                style={{
                  padding: '48px 20px',
                  textAlign: 'center',
                  backgroundColor: '#F7F8FB',
                  borderRadius: '16px',
                  border: '1px dashed #CBD5E1',
                }}
              >
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>🔍</div>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#161A22', marginBottom: '4px' }}>
                  We couldn't find that product
                </h3>
                <p style={{ fontSize: '12px', color: '#687080', maxWidth: '280px', margin: '0 auto 16px auto' }}>
                  Try searching for general ingredients like Niacinamide, Salicylic Acid, or browse our launch categories.
                </p>
                <button
                  onClick={() => setQuery('')}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    backgroundColor: '#2854C5',
                    color: '#FFFFFF',
                    fontSize: '12px',
                    fontWeight: 600,
                  }}
                >
                  Clear Search
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
