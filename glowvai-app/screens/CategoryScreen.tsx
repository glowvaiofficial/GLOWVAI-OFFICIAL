import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { AppHeader } from '../components/common/AppHeader';
import { ProductCard } from '../components/cards/ProductCard';
import { CATEGORIES } from '../data/categories';
import { PRODUCTS } from '../data/products';
import '../responsive/home-products.css';

export const CategoryScreen: React.FC = () => {
  const [activeCategoryId, setActiveCategoryId] = useState<string>(CATEGORIES[0].id);
  const [activeSubcategory, setActiveSubcategory] = useState<string>('All');

  const currentCategory = CATEGORIES.find((c) => c.id === activeCategoryId) || CATEGORIES[0];

  const filteredProducts = PRODUCTS.filter((p) => {
    const matchCat = p.category === currentCategory.slug;
    const matchSub =
      activeSubcategory === 'All' ||
      activeSubcategory === `All ${currentCategory.name}` ||
      p.subcategory === activeSubcategory;
    return matchCat && matchSub;
  });

  return (
    <div
      className="zq-cat"
      style={{
        flex: 1,
        display: 'var(--zq-cat-display, flex)',
        flexDirection: 'column',
        backgroundColor: '#FFFFFF',
        overflowY: 'auto',
      }}
    >
      <AppHeader title="Browse Categories" showBack={false} />

      {/* Top Main Category Tabs */}
      <div
        className="zq-cat-tabs"
        style={{
          display: 'flex',
          borderBottom: '1px solid #E2E5EB',
          backgroundColor: '#FFFFFF',
        }}
      >
        {CATEGORIES.map((cat) => {
          const isActive = cat.id === activeCategoryId;
          return (
            <button
              key={cat.id}
              onClick={() => {
                setActiveCategoryId(cat.id);
                setActiveSubcategory('All');
              }}
              style={{
                flex: 1,
                padding: 'var(--zq-tab-pad, 12px 4px)',
                fontSize: '13px',
                whiteSpace: 'nowrap',
                fontWeight: isActive ? 700 : 500,
                color: isActive ? '#2854C5' : '#687080',
                borderBottom: `2.5px solid ${isActive ? '#2854C5' : 'transparent'}`,
                backgroundColor: '#FFFFFF',
                textAlign: 'var(--zq-tab-align, center)' as React.CSSProperties['textAlign'],
                transition: 'all 0.15s ease',
              }}
            >
              {cat.name}
            </button>
          );
        })}
      </div>

      {/* Subcategory Pills Strip */}
      <div
        className="zq-cat-subs"
        style={{
          display: 'flex',
          gap: '8px',
          overflowX: 'var(--zq-subs-overflow, auto)' as React.CSSProperties['overflowX'],
          flexShrink: 0,
          scrollbarWidth: 'none',
          padding: 'var(--zq-subs-pad, 12px 16px)',
          backgroundColor: '#F7F8FB',
          borderBottom: '1px solid #ECEEF2',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {['All', ...currentCategory.subcategories.filter((s) => !s.startsWith('All'))].map((sub) => {
          const isSelected = activeSubcategory === sub;
          return (
            <button
              key={sub}
              onClick={() => setActiveSubcategory(sub)}
              style={{
                padding: '6px 14px',
                borderRadius: '999px',
                fontSize: '12px',
                fontWeight: isSelected ? 700 : 500,
                whiteSpace: 'nowrap',
                backgroundColor: isSelected ? '#2854C5' : '#FFFFFF',
                color: isSelected ? '#FFFFFF' : '#545B69',
                border: `1px solid ${isSelected ? '#2854C5' : '#CBD5E1'}`,
                transition: 'all 0.15s ease',
              }}
            >
              {sub}
            </button>
          );
        })}
      </div>

      {/* Products Grid */}
      <div className="zq-cat-body" style={{ padding: 'var(--zq-body-pad, 16px)', flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div>
            <h2 style={{ fontSize: 'var(--zq-title-size, 15px)', fontWeight: 700, color: '#161A22' }}>
              {activeSubcategory === 'All' ? currentCategory.name : activeSubcategory}
            </h2>
            <p style={{ fontSize: '11px', color: '#687080' }}>
              {currentCategory.description}
            </p>
          </div>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#687080' }}>
            {filteredProducts.length} items
          </span>
        </div>

        {filteredProducts.length > 0 ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'var(--zq-grid-cols, repeat(2, 1fr))',
              gap: 'var(--zq-grid-gap, 12px)',
            }}
          >
            {filteredProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        ) : (
          <div
            style={{
              padding: '40px 20px',
              textAlign: 'center',
              backgroundColor: '#F7F8FB',
              borderRadius: '12px',
              border: '1px dashed #CBD5E1',
            }}
          >
            <p style={{ fontSize: '13px', color: '#687080' }}>
              No items currently listed under this subcategory.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
