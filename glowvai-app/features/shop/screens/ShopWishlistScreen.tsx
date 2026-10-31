import React, { useState } from 'react';
import { ArrowLeft, Heart, Home, ScanFace, ShoppingBag, Star, Store, Tag, User, Zap } from 'lucide-react';
import { useApp } from '../../../context/useApp';
import { useCartStore } from '../../../core/state/cartStore';
import { formatRupee } from '../shared/shopUtils';
import '../styles/shop-wishlist.css';

interface WishlistItem {
  id: string;
  brand: string;
  name: string;
  benefit: string;
  rating: number;
  reviews: string;
  price: number;
  mrp: number;
  discount: string;
  image: string;
}

type WishlistTab = 'all' | 'pricedrops' | 'backinstock';

const TABS: { id: WishlistTab; label: string }[] = [
  { id: 'all', label: 'All Saved' },
  { id: 'pricedrops', label: 'Price Drops' },
  { id: 'backinstock', label: 'Back in Stock' },
];

const INITIAL_WISHLIST: WishlistItem[] = [
  {
    id: 'w1',
    brand: 'Laneige',
    name: 'Water Bank Blue Hyaluronic Moisture Cream',
    benefit: 'Intense 100-Hour Moisture Barrier Support',
    rating: 4.9,
    reviews: '1,420',
    price: 2150,
    mrp: 2400,
    discount: '10% OFF',
    image: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'w2',
    brand: 'CeraVe',
    name: 'Hydrating Hyaluronic Acid Serum',
    benefit: 'Restores Skin Moisture Barrier',
    rating: 4.8,
    reviews: '980',
    price: 1299,
    mrp: 1599,
    discount: '18% OFF',
    image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'w3',
    brand: 'Fenty Beauty',
    name: 'Gloss Bomb Universal Lip Luminizer',
    benefit: 'Explosive Shine & Nourishing Feel',
    rating: 4.9,
    reviews: '3,110',
    price: 1900,
    mrp: 2100,
    discount: '9% OFF',
    image: 'https://images.unsplash.com/photo-1586495777744-4413f21062fa?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'w4',
    brand: 'Kérastase',
    name: 'Elixir Ultime L’Huile Original Hair Oil',
    benefit: 'Sublime Shine & Frizz Control',
    rating: 4.9,
    reviews: '2,040',
    price: 3200,
    mrp: 3600,
    discount: '11% OFF',
    image: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=400&q=80',
  },
];

export const ShopWishlistScreen: React.FC = () => {
  const { navigate, goBack } = useApp();
  const cartTotalCount = useCartStore((state) => state.totalCount);
  const cartTotalPrice = useCartStore((state) => state.totalPrice);
  const addItem = useCartStore((state) => state.addItem);

  const [activeTab, setActiveTab] = useState<WishlistTab>('all');
  const [priceAlertsEnabled, setPriceAlertsEnabled] = useState(true);
  const [wishlistProducts, setWishlistProducts] = useState<WishlistItem[]>(INITIAL_WISHLIST);

  // Price-drop and back-in-stock tabs have no data yet, same as the mobile screen.
  const removeFromWishlist = (id: string) => setWishlistProducts((prev) => prev.filter((item) => item.id !== id));

  const moveToCart = (item: WishlistItem) =>
    addItem({
      productId: item.id,
      name: item.name,
      brand: item.brand,
      price: item.price,
      mrp: item.mrp,
      image: item.image,
    });

  return (
    <div className="shop-screen shop-wishlist">
      <header className="shop-header shop-wishlist-header">
        <button type="button" className="shop-icon-btn" onClick={goBack} aria-label="Go back">
          <ArrowLeft size={18} />
        </button>
        <h1 className="shop-wishlist-title">
          <Heart size={18} fill="var(--primary)" color="var(--primary)" />
          My Wishlist
        </h1>
        <button type="button" className="shop-icon-btn shop-wishlist-cart" onClick={() => navigate('cart-tab')} aria-label={`Cart, ${cartTotalCount} items`}>
          <ShoppingBag size={18} />
          {cartTotalCount > 0 && <span className="shop-wishlist-badge">{cartTotalCount}</span>}
          <span className="shop-wishlist-cart-text">Cart ({cartTotalCount})</span>
        </button>
      </header>

      <main className="shop-wishlist-main">
        <div className="shop-wishlist-toolbar">
          <div className="shop-wishlist-tabs" role="group" aria-label="Wishlist filter">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              const label = tab.id === 'all' ? `${tab.label} (${wishlistProducts.length})` : tab.label;
              return (
                <button
                  key={tab.id}
                  type="button"
                  className={`shop-wishlist-tab${isActive ? ' is-active' : ''}`}
                  aria-pressed={isActive}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <div className="shop-wishlist-alert">
            <span className="shop-wishlist-alert-icon">
              <Tag size={16} />
            </span>
            <div>
              <strong>Get notified on price drops</strong>
              <small>We'll alert you instantly when your saved picks go on sale.</small>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={priceAlertsEnabled}
              aria-label="Price drop notifications"
              className={`shop-wishlist-switch${priceAlertsEnabled ? ' is-on' : ''}`}
              onClick={() => setPriceAlertsEnabled((v) => !v)}
            >
              <span />
            </button>
          </div>
        </div>

        {wishlistProducts.length === 0 ? (
          <div className="shop-empty">
            <Heart size={28} />
            <h3>Your wishlist is empty</h3>
            <p>Save products you like and they will appear here.</p>
            <button type="button" className="shop-btn-secondary shop-wishlist-empty-btn" onClick={() => navigate('shop-browse')}>
              Browse products
            </button>
          </div>
        ) : (
          <div className="shop-wishlist-grid">
            {wishlistProducts.map((item) => (
              <article key={item.id} className="shop-wishlist-card">
                <span className="shop-wishlist-delivery">
                  <Zap size={9} fill="currentColor" /> 10 MIN
                </span>
                <button
                  type="button"
                  className="shop-wishlist-heart"
                  onClick={() => removeFromWishlist(item.id)}
                  aria-label={`Remove ${item.name} from wishlist`}
                >
                  <Heart size={16} fill="var(--primary)" color="var(--primary)" />
                </button>

                <div className="shop-wishlist-media">
                  <img src={item.image} alt={item.name} loading="lazy" />
                </div>

                <small className="shop-wishlist-brand">{item.brand}</small>
                <p className="shop-wishlist-name">{item.name}</p>
                <p className="shop-wishlist-benefit">{item.benefit}</p>

                <div className="shop-wishlist-price">
                  <b>{formatRupee(item.price)}</b>
                  <s>{formatRupee(item.mrp)}</s>
                  <em>{item.discount}</em>
                </div>

                <button type="button" className="shop-wishlist-add" onClick={() => moveToCart(item)}>
                  Move to cart
                </button>
              </article>
            ))}
          </div>
        )}
      </main>

      {cartTotalCount > 0 && (
        <button type="button" className="shop-wishlist-cart-pill" onClick={() => navigate('cart-tab')}>
          <span>
            <ShoppingBag size={18} />
            {cartTotalCount} items · {formatRupee(cartTotalPrice)}
          </span>
          <b>→</b>
        </button>
      )}

      <nav className="shop-wishlist-nav" aria-label="Main">
        <button type="button" onClick={() => navigate('home')}>
          <Home size={20} />
          <span>Home</span>
        </button>
        <button type="button" className="is-active" onClick={() => navigate('shop-home')}>
          <Store size={20} />
          <span>Shop</span>
        </button>
        <button type="button" className="shop-wishlist-scan" onClick={() => navigate('scan-camera')} aria-label="Open AI scanner">
          <ScanFace size={24} />
        </button>
        <button type="button" onClick={() => navigate('cart-tab')}>
          <ShoppingBag size={20} />
          <span>Cart</span>
        </button>
        <button type="button" onClick={() => navigate('profile-tab')}>
          <User size={20} />
          <span>Profile</span>
        </button>
      </nav>
    </div>
  );
};
