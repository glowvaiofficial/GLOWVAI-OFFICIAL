import React, { useState } from 'react';
import { ArrowLeft, Heart, ShieldCheck, Zap, AlertCircle, CheckCircle2, ChevronRight, Share2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { PRODUCTS } from '../data/products';
import '../responsive/home-products.css';

export const ProductDetailScreen: React.FC = () => {
  const { goBack, activeParams, addToCart, cart, wishlist, toggleWishlist, navigate } = useApp();
  const productId = activeParams?.productId || PRODUCTS[0].id;
  const product = PRODUCTS.find((p) => p.id === productId) || PRODUCTS[0];

  const [selectedVariantId, setSelectedVariantId] = useState(
    product.currentVariantId || product.variants[0].id
  );
  const [optInInsurance, setOptInInsurance] = useState(product.insuranceEligible);
  const [showFullIngredients, setShowFullIngredients] = useState(false);

  const selectedVariant =
    product.variants.find((v) => v.id === selectedVariantId) || product.variants[0];

  const inWishlist = wishlist.includes(product.id);

  // Check if item in cart
  const cartItem = cart.find(
    (item) => item.product.id === product.id && item.variantId === selectedVariant.id
  );

  const handleAddToCart = () => {
    addToCart(product, selectedVariant.id, optInInsurance);
  };

  const isRemoteSourced = !product.isSourcedNearby;

  return (
    <div
      className="zq-pdp"
      style={{
        flex: 1,
        display: 'var(--zq-pdp-display, flex)',
        flexDirection: 'column',
        backgroundColor: '#FFFFFF',
        position: 'relative',
        overflowY: 'auto',
      }}
    >
      {/* Top Floating Navigation Header */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          left: 0,
          right: 0,
          padding: '12px 16px',
          display: 'var(--zq-pdp-head-display, flex)',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid #ECEEF2',
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

        <span style={{ fontSize: '13px', fontWeight: 600, color: '#687080' }}>
          {product.brand}
        </span>

        <button
          onClick={() => toggleWishlist(product.id)}
          style={{
            padding: '6px',
            borderRadius: '8px',
            backgroundColor: '#F7F8FB',
            color: inWishlist ? '#DC2626' : '#687080',
          }}
          aria-label="Save to wishlist"
        >
          <Heart size={18} fill={inWishlist ? '#DC2626' : 'none'} />
        </button>
      </div>

      <div className="zq-pdp-media">
      {/* Main Image Container */}
      <div
        style={{
          width: '100%',
          height: 'var(--zq-pdp-media-h, 280px)',
          backgroundColor: '#F7F8FB',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <img
          src={product.images[0]}
          alt={product.name}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />

        {/* ETA pill */}
        <div
          style={{
            position: 'absolute',
            bottom: '12px',
            left: '16px',
            backgroundColor: 'rgba(255, 255, 255, 0.92)',
            backdropFilter: 'blur(4px)',
            padding: '4px 10px',
            borderRadius: '999px',
            fontSize: '11px',
            fontWeight: 700,
            color: '#19734F',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
          }}
        >
          <Zap size={13} fill="#19734F" />
          <span>⚡ {product.deliveryMinutes} mins to Vijayawada</span>
        </div>
      </div>

      </div>

      <div className="zq-pdp-info">
      {/* Details Body */}
      <div style={{ padding: 'var(--zq-pdp-body-pad, 16px 20px 100px 20px)', display: 'flex', flexDirection: 'column', gap: '18px' }}>
        {/* Brand & Title */}
        <div>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#2854C5', textTransform: 'uppercase' }}>
            {product.brand}
          </span>
          <h1
            style={{
              fontSize: '18px',
              fontWeight: 800,
              color: '#161A22',
              fontFamily: 'var(--font-heading)',
              marginTop: '4px',
              lineHeight: '24px',
            }}
          >
            {product.name}
          </h1>

          {/* Pricing Row */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '10px' }}>
            <span style={{ fontSize: '22px', fontWeight: 800, color: '#161A22' }}>
              ₹{selectedVariant.price}
            </span>
            {selectedVariant.discountPercent > 0 && (
              <>
                <span style={{ fontSize: '14px', color: '#818896', textDecoration: 'line-through' }}>
                  ₹{selectedVariant.mrp}
                </span>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#15803D',
                    backgroundColor: '#DCFCE7',
                    padding: '2px 8px',
                    borderRadius: '4px',
                  }}
                >
                  {selectedVariant.discountPercent}% OFF
                </span>
              </>
            )}
          </div>
          <span style={{ fontSize: '11px', color: '#687080' }}>Inclusive of all taxes</span>
        </div>

        {/* Multi-source sourcing notice (PRD Section 16.6) */}
        {isRemoteSourced && (
          <div
            style={{
              padding: '12px 14px',
              backgroundColor: '#FFFBEB',
              borderRadius: '10px',
              border: '1px solid #FDE68A',
              display: 'flex',
              gap: '10px',
              alignItems: 'flex-start',
            }}
          >
            <AlertCircle size={16} color="#A76516" style={{ marginTop: '2px', flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#92400E' }}>
                Multi-Source Fulfilment Notice
              </div>
              <p style={{ fontSize: '11px', color: '#B45309', marginTop: '2px', lineHeight: '16px' }}>
                {product.sourceNote || 'This product is dispatched from our regional hub in Auto Nagar to complete your order.'}
              </p>
            </div>
          </div>
        )}

        {/* Size / Variant Selector */}
        {product.variants.length > 1 && (
          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, color: '#161A22', marginBottom: '8px', display: 'block' }}>
              Select Size
            </label>
            <div style={{ display: 'flex', gap: '10px' }}>
              {product.variants.map((v) => {
                const isSelected = v.id === selectedVariantId;
                return (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVariantId(v.id)}
                    style={{
                      flex: 1,
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: `1.5px solid ${isSelected ? '#2854C5' : '#CBD5E1'}`,
                      backgroundColor: isSelected ? '#F0F7FF' : '#FFFFFF',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: '13px', fontWeight: 700, color: isSelected ? '#2854C5' : '#161A22' }}>
                      {v.size}
                    </div>
                    <div style={{ fontSize: '11px', color: '#687080', marginTop: '2px' }}>
                      ₹{v.price}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Beauty Insurance Section (PRD Section 20) */}
        {product.insuranceEligible ? (
          <div
            style={{
              padding: '16px',
              borderRadius: '14px',
              backgroundColor: '#EDF2FF',
              border: '1.5px solid #BAE6FD',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={20} color="#2854C5" />
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#0369A1' }}>
                  Glowvai Beauty Insurance
                </span>
              </div>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#2854C5',
                  backgroundColor: '#FFFFFF',
                  padding: '2px 8px',
                  borderRadius: '999px',
                  border: '1px solid #BFDBFE',
                }}
              >
                +₹{product.insuranceFee || 29}
              </span>
            </div>

            <p style={{ fontSize: '12px', color: '#0369A1', lineHeight: '18px', marginBottom: '12px' }}>
              {product.insuranceTerms || '14-Day Suitability Coverage. Log daily routine in the app; if clinically unsuitable, receive full refund support.'}
            </p>

            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 12px',
                backgroundColor: '#FFFFFF',
                borderRadius: '8px',
                border: '1px solid #BFDBFE',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={optInInsurance}
                onChange={(e) => setOptInInsurance(e.target.checked)}
              />
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#161A22' }}>
                Add Beauty Insurance (+₹{product.insuranceFee || 29})
              </span>
            </label>
          </div>
        ) : (
          <div
            style={{
              padding: '10px 12px',
              backgroundColor: '#F7F8FB',
              borderRadius: '8px',
              border: '1px solid #E2E5EB',
              fontSize: '11px',
              color: '#687080',
            }}
          >
            ℹ️ Beauty Insurance is strictly available on eligible targeted skincare items only.
          </div>
        )}

        {/* Product Description */}
        <div>
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#161A22', marginBottom: '6px' }}>
            Product Overview
          </h3>
          <p style={{ fontSize: '13px', color: '#545B69', lineHeight: '20px' }}>
            {product.description}
          </p>
        </div>

        {/* Key Benefits */}
        <div>
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#161A22', marginBottom: '8px' }}>
            Key Benefits
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {product.keyBenefits.map((b, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={14} color="#19734F" />
                <span style={{ fontSize: '12px', color: '#374151' }}>{b}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Complete Formulation Ingredients */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#161A22' }}>
              Full Ingredients
            </h3>
            <button
              onClick={() => setShowFullIngredients(!showFullIngredients)}
              style={{ fontSize: '11px', color: '#2854C5', fontWeight: 600 }}
            >
              {showFullIngredients ? 'Collapse' : 'Show All'}
            </button>
          </div>
          <p style={{ fontSize: '12px', color: '#687080', lineHeight: '18px' }}>
            {showFullIngredients
              ? product.ingredients.join(', ')
              : product.ingredients.slice(0, 4).join(', ') + '...'}
          </p>
        </div>

        {/* How to use */}
        <div>
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#161A22', marginBottom: '6px' }}>
            Usage Instructions
          </h3>
          <p style={{ fontSize: '12px', color: '#545B69', lineHeight: '18px' }}>
            {product.usageInstructions}
          </p>
        </div>
      </div>

      {/* Persistent Bottom Add to Cart Bar */}
      <div
        className="zq-pdp-bar"
        style={{
          position: 'fixed',
          bottom: 'var(--zq-pdp-bar-bottom, 0)',
          left: 'var(--zq-pdp-bar-left, 0)',
          right: 'var(--zq-pdp-bar-right, 0)',
          backgroundColor: '#FFFFFF',
          borderTop: '1px solid #E2E5EB',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          maxWidth: 'var(--zq-pdp-bar-max, 440px)',
          margin: 'var(--zq-pdp-bar-margin, 0 auto)',
          zIndex: 40,
        }}
      >
        <div>
          <span style={{ fontSize: '11px', color: '#687080' }}>Payable Price</span>
          <div style={{ fontSize: '18px', fontWeight: 800, color: '#161A22' }}>
            ₹{selectedVariant.price + (optInInsurance && product.insuranceEligible ? product.insuranceFee || 29 : 0)}
          </div>
        </div>

        <button
          onClick={handleAddToCart}
          style={{
            height: '46px',
            padding: '0 28px',
            backgroundColor: '#2854C5',
            color: '#FFFFFF',
            borderRadius: '10px',
            fontSize: '14px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span>ADD TO CART</span>
        </button>
      </div>
      </div>
    </div>
  );
};
