import React, { useEffect, useRef, useState } from 'react';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Droplet,
  Droplets,
  Flame,
  Flower2,
  Headphones,
  Heart,
  Leaf,
  Lock,
  Moon,
  RotateCcw,
  ScanFace,
  Scissors,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  Sun,
  User,
  Wind,
  Zap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useApp } from '../../../context/useApp';
import type { ScreenName } from '../../../context/contextDefinition';
import { INDIAN_SKINCARE_CATALOG } from '../../../core/data/indianSkincareCatalog';
import type { SkincareProduct } from '../../../core/data/indianSkincareCatalog';
import { getDeviceCurrentLocation } from '../../../core/services/locationService';
import { useCartStore } from '../../../core/state/cartStore';
import { ShopProductCard } from '../shared/ShopProductCard';
import { formatRupee, getProductImageUrl } from '../shared/shopUtils';
import '../styles/shop-home.css';

const stock = (id: string, w = 400) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;

const DELIVERY_ETA = 10;
const HERO_PRODUCT = INDIAN_SKINCARE_CATALOG[0];

// Catalogue rails: slices of the local catalogue, same offsets as the mobile home.
const RECOMMENDED = INDIAN_SKINCARE_CATALOG.slice(0, 6);
const TOP_PICKS = INDIAN_SKINCARE_CATALOG.slice(6, 12);
const FEATURED = INDIAN_SKINCARE_CATALOG.slice(2, 8);
const STEAL_DEALS = INDIAN_SKINCARE_CATALOG.slice(4, 10);
const TRENDING = INDIAN_SKINCARE_CATALOG.slice(1, 7);
const BEST_SELLING = INDIAN_SKINCARE_CATALOG.slice(5, 11);
const NEW_LAUNCHES = INDIAN_SKINCARE_CATALOG.slice(3, 9);
const UNDER_99 = INDIAN_SKINCARE_CATALOG.slice(0, 6).map((p) => ({ ...p, price: 99 }));

interface DealItem {
  id: string;
  brand: string;
  name: string;
  price: number;
  mrp: number;
  image: string;
  rating?: number;
}

const FLASH_DEALS: DealItem[] = [
  { id: 'fd1', brand: 'Minimalist', name: 'Niacinamide 10% Serum 30ml', price: 299, mrp: 599, image: stock('1556228720-195a672e8a03') },
  { id: 'fd2', brand: 'Cetaphil', name: 'Gentle Skin Cleanser 250ml', price: 349, mrp: 649, image: stock('1556228720-195a672e8a03') },
  { id: 'fd3', brand: "L'Oréal", name: 'Hyaluronic Acid Serum 30ml', price: 649, mrp: 1299, image: stock('1617897903246-719242758050') },
  { id: 'fd4', brand: 'Dot & Key', name: 'Vitamin C+E Moisturiser 60g', price: 299, mrp: 599, image: stock('1570172619644-dfd03ed5d881') },
  { id: 'fd5', brand: 'Neutrogena', name: 'Hydro Boost Water Gel 50g', price: 499, mrp: 999, image: stock('1556228720-195a672e8a03') },
];

const HAIR_DEALS: DealItem[] = [
  { id: 'h1', brand: 'Indulekha', name: 'Bringha Hair Oil 100ml', price: 249, mrp: 395, rating: 4.5, image: stock('1535585209827-a15fcdbc4c2d') },
  { id: 'h2', brand: 'Tresemmé', name: 'Keratin Smooth Shampoo 580ml', price: 329, mrp: 479, rating: 4.4, image: stock('1621607512214-68297480165e') },
  { id: 'h3', brand: 'Dove', name: 'Intense Repair Conditioner 175ml', price: 189, mrp: 275, rating: 4.3, image: stock('1570172619644-dfd03ed5d881') },
  { id: 'h4', brand: 'Streax', name: 'Pro Vitariche Hair Serum 100ml', price: 179, mrp: 299, rating: 4.2, image: stock('1556228720-195a672e8a03') },
];

const MAKEUP_DEALS: DealItem[] = [
  { id: 'm1', brand: 'Lakme', name: '9 to 5 Foundation Beige', price: 549, mrp: 849, image: stock('1586495777744-4413f21062fa') },
  { id: 'm2', brand: 'Maybelline', name: 'Fit Me Foundation 120', price: 349, mrp: 499, image: stock('1522335789203-aabd1fc54bc9') },
  { id: 'm3', brand: 'Sugar', name: 'Ace Of Face Matte Lipstick', price: 399, mrp: 549, image: stock('1512496015851-a90fb38ba796') },
  { id: 'm4', brand: 'NYX', name: 'Professional Lip Liner', price: 449, mrp: 599, image: stock('1522335789203-aabd1fc54bc9') },
];

const UNDER_199_DEALS: DealItem[] = [
  { id: 'u1', brand: "Pond's", name: 'Light Moisturiser 75ml', price: 99, mrp: 175, image: stock('1570172619644-dfd03ed5d881') },
  { id: 'u2', brand: 'Himalaya', name: 'Neem Face Wash 150ml', price: 149, mrp: 210, image: stock('1556229010-6c3f2c9ca5f8') },
  { id: 'u3', brand: 'Nivea', name: 'Soft Moisturizing Cream 50ml', price: 125, mrp: 175, image: stock('1556228720-195a672e8a03') },
  { id: 'u4', brand: 'Garnier', name: 'Micellar Cleansing Water 100ml', price: 175, mrp: 250, image: stock('1556228720-195a672e8a03') },
  { id: 'u5', brand: 'Biotique', name: 'Bio Morning Nectar SPF30 120ml', price: 149, mrp: 225, image: stock('1617897903246-719242758050') },
];

const WELLNESS_DEALS: DealItem[] = [
  { id: 'w1', brand: 'Saffola', name: 'Immuniveda Chyawanprash 500g', price: 299, mrp: 449, image: stock('1540555700478-4be289fbecef') },
  { id: 'w2', brand: 'Kapiva', name: 'Aloe Vera Juice 1L', price: 249, mrp: 399, image: stock('1540555700478-4be289fbecef') },
  { id: 'w3', brand: 'Oziva', name: 'Plant Based Biotin 30 tabs', price: 449, mrp: 699, image: stock('1512069772995-ec65ed45afd6') },
  { id: 'w4', brand: 'Himalaya', name: 'Pure Herbs Hair Growth 60 tabs', price: 195, mrp: 295, image: stock('1540555700478-4be289fbecef') },
];

const FESTIVAL_BANNERS: { id: string; image: string; title: string; subtitle: string; params: Record<string, string> }[] = [
  { id: 'b1', image: stock('1522337360788-8b13dee7a37e', 800), title: 'Festive Glow Drop', subtitle: 'Flat 40% OFF on Raksha Bandhan Skincare Hampers', params: { promo: 'festive' } },
  { id: 'b2', image: stock('1571781926291-c477ebfd024b', 800), title: 'Monsoon Hydration Sale', subtitle: 'Dermatologist-recommended ultra-light moisturizers', params: { promo: 'monsoon' } },
  { id: 'b3', image: stock('1556228720-195a672e8a03', 800), title: 'Zero-Cast SPF Fest', subtitle: 'Broad-spectrum sunscreens starting at ₹299', params: { promo: 'sunscreen' } },
];

const FLASH_TILES: { id: string; label: string; image: string; categoryId: string }[] = [
  { id: 'm1', label: 'Serums', image: stock('1556228720-195a672e8a03', 200), categoryId: 'Serums' },
  { id: 'm2', label: 'Zero-Cast SPF', image: stock('1598440947619-2c35fc9aa908', 200), categoryId: 'Suncare' },
  { id: 'm3', label: 'Barrier Creams', image: stock('1571781926291-c477ebfd024b', 200), categoryId: 'Moisturizers' },
  { id: 'm4', label: 'Acne Cleansers', image: stock('1556229010-6c3f2c9ca5f8', 200), categoryId: 'Cleansers' },
];

// Category ids match SkincareProduct['category']. A null categoryId opens the full browse list.
const CATEGORY_GRID: { id: string; name: string; image: string; categoryId: string | null }[] = [
  { id: 'c1', name: 'Serums', image: stock('1556228720-195a672e8a03'), categoryId: 'Serums' },
  { id: 'c2', name: 'Facial Creams', image: stock('1570172619644-dfd03ed5d881'), categoryId: 'Moisturizers' },
  { id: 'c3', name: 'Ointments', image: stock('1611930022073-b7a4ba5fcccd'), categoryId: 'Treatments' },
  { id: 'c4', name: 'Lotions', image: stock('1535585209827-a15fcdbc4c2d'), categoryId: 'Moisturizers' },
  { id: 'c5', name: 'Sunscreen', image: stock('1598440947619-2c35fc9aa908'), categoryId: 'Suncare' },
  { id: 'c6', name: 'Cleansers', image: stock('1601049541289-9b1b7bbbfe19'), categoryId: 'Cleansers' },
  { id: 'c7', name: 'Facial Masks', image: stock('1571781926291-c477ebfd024b'), categoryId: 'Treatments' },
  { id: 'c8', name: 'All Products', image: stock('1540555700478-4be289fbecef'), categoryId: null },
];

const SHOP_BY_CATEGORY: { id: string; title: string; imageUrl: string; Icon: LucideIcon }[] = [
  { id: 'Serums', title: 'Serums & Actives', imageUrl: stock('1611930022073-b7a4ba5fcccd'), Icon: Sparkles },
  { id: 'Cleansers', title: 'Cleansers & Washes', imageUrl: stock('1556229010-6c3f2c9ca5f8'), Icon: Droplet },
  { id: 'Moisturizers', title: 'Moisturizers & Creams', imageUrl: stock('1570172619644-dfd03ed5d881'), Icon: Leaf },
  { id: 'Suncare', title: 'Sunscreen & SPF', imageUrl: stock('1598440947619-2c35fc9aa908'), Icon: Flame },
  { id: 'Treatments', title: 'Spot Treatments', imageUrl: stock('1586495777744-4413f21062fa'), Icon: Heart },
];

const CONCERNS: { id: string; label: string; count: string; Icon: LucideIcon; concernId: string | null }[] = [
  { id: 'cc1', label: 'Acne', count: '68 products', Icon: Leaf, concernId: 'acne' },
  { id: 'cc2', label: 'Hydration', count: '54 products', Icon: Droplets, concernId: 'hydration' },
  { id: 'cc3', label: 'Dark Spots', count: '41 products', Icon: Sun, concernId: 'brightening' },
  { id: 'cc4', label: 'Anti-Ageing', count: '35 products', Icon: Flower2, concernId: 'antiaging' },
  { id: 'cc5', label: 'Glow', count: '47 products', Icon: Sparkles, concernId: 'brightening' },
  { id: 'cc6', label: 'Oily Skin', count: '29 products', Icon: Wind, concernId: 'barrier' },
  { id: 'cc7', label: 'Sensitive', count: '22 products', Icon: Heart, concernId: 'barrier' },
  { id: 'cc8', label: 'Hair Growth', count: '33 products', Icon: Scissors, concernId: null },
];

const BRAND_DEALS: { id: string; brand: string; off: string; count: string }[] = [
  { id: 'bd1', brand: 'Minimalist', off: 'Up to 50% OFF', count: '28 products' },
  { id: 'bd2', brand: 'Cetaphil', off: 'Up to 45% OFF', count: '14 products' },
  { id: 'bd3', brand: 'Mamaearth', off: 'Up to 40% OFF', count: '52 products' },
  { id: 'bd4', brand: 'WOW Science', off: 'Up to 48% OFF', count: '35 products' },
  { id: 'bd5', brand: 'Plum', off: 'Up to 42% OFF', count: '41 products' },
  { id: 'bd6', brand: 'Dot & Key', off: 'Up to 35% OFF', count: '19 products' },
];

const ROUTINES: { id: string; label: string; desc: string; Icon: LucideIcon; steps: string[]; accent: string }[] = [
  { id: 'r1', label: 'AM Routine', desc: '4-step morning glow', Icon: Sun, steps: ['Cleanser', 'Toner', 'Serum', 'SPF 50+'], accent: 'var(--primary)' },
  { id: 'r2', label: 'PM Routine', desc: 'Repair & restore overnight', Icon: Moon, steps: ['Micellar Water', 'Cleanser', 'Retinol', 'Night Cream'], accent: 'var(--primary-dark)' },
  { id: 'r3', label: 'Glow Boost', desc: 'Instant radiance in 4 steps', Icon: Sparkles, steps: ['Exfoliant', 'Vitamin C', 'HA Serum', 'Moisturiser'], accent: 'var(--primary)' },
  { id: 'r4', label: 'Acne Control', desc: 'Calm & clear breakout skin', Icon: Wind, steps: ['SA Wash', 'Niacinamide', 'Spot Treat', 'Oil-Free SPF'], accent: 'var(--primary-dark)' },
];

const TRUST_ITEMS: { title: string; sub: string; Icon: LucideIcon }[] = [
  { title: '100% Authentic', sub: 'Genuine products only', Icon: ShieldCheck },
  { title: '10 Min Delivery', sub: 'Express zone', Icon: Zap },
  { title: 'Easy Returns', sub: '7-day policy', Icon: RotateCcw },
  { title: 'Secure Pay', sub: 'Cashfree certified', Icon: Lock },
  { title: '24/7 Support', sub: 'WhatsApp & call', Icon: Headphones },
  { title: 'Free AI Scan', sub: 'Skin intelligence', Icon: Sparkles },
];

const TESTIMONIALS = [
  { id: 't1', name: 'Priya S.', role: 'Skincare Enthusiast', loc: 'Vijayawada', text: 'GlowVAI delivered in literally 9 minutes. The AI scan was spot on!' },
  { id: 't2', name: 'Riya M.', role: 'Beauty Blogger', loc: 'Hyderabad', text: 'The AI skin report identified my combination skin zones perfectly.' },
  { id: 't3', name: 'Ananya K.', role: 'Student', loc: 'Vijayawada', text: 'Student discount + Glow Coins + free delivery on my first order!' },
  { id: 't4', name: 'Sneha T.', role: 'Professional', loc: 'Vijayawada', text: 'First app that understands Indian skin tones. Products actually worked!' },
];

const FOOTER_LINKS: { label: string; screen: ScreenName; params?: Record<string, string> }[] = [
  { label: 'Skin Care', screen: 'shop-category', params: { categoryId: 'Serums' } },
  { label: 'Hair Care', screen: 'shop-browse', params: { cat: 'Hair Care' } },
  { label: 'Makeup', screen: 'shop-browse', params: { cat: 'Makeup' } },
  { label: 'Body Care', screen: 'shop-browse' },
  { label: 'Wellness', screen: 'shop-browse', params: { cat: 'Wellness' } },
  { label: 'AI Skin Scan', screen: 'scan-camera' },
  { label: 'Beauty Protection', screen: 'profile-support' },
  { label: 'Glow Coins', screen: 'profile-referrals' },
  { label: 'Student Discount', screen: 'profile-referrals' },
  { label: 'Returns & Refunds', screen: 'profile-support' },
  { label: 'Help & Support', screen: 'profile-support' },
  { label: 'About GlowVAI', screen: 'profile-support' },
];

const discountPercent = (price: number, mrp: number) => Math.round((1 - price / mrp) * 100);

// Flash deals reset at real midnight, so count down to the next one.
function secondsUntilMidnight(): number {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return Math.max(0, Math.floor((midnight.getTime() - now.getTime()) / 1000));
}

function MidnightTimer() {
  const [seconds, setSeconds] = useState(secondsUntilMidnight);

  useEffect(() => {
    const timer = window.setInterval(() => setSeconds(secondsUntilMidnight()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const pad = (n: number) => n.toString().padStart(2, '0');
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  return (
    <span className="shop-home-timer">
      <Clock size={12} />
      {`${pad(h)}:${pad(m)}:${pad(s)}`}
    </span>
  );
}

function ExpiryCountdown({ expiresAt }: { expiresAt: number }) {
  const [remaining, setRemaining] = useState(() => Math.max(0, expiresAt - Date.now()));

  useEffect(() => {
    const timer = window.setInterval(() => setRemaining(Math.max(0, expiresAt - Date.now())), 1000);
    return () => window.clearInterval(timer);
  }, [expiresAt]);

  const isUrgent = remaining < 60000 && remaining > 0;
  const mins = Math.floor(remaining / 60000);
  const secs = Math.floor((remaining % 60000) / 1000);

  return (
    <span className={`shop-home-countdown${isUrgent ? ' is-urgent' : ''}`}>
      {`${mins}:${secs.toString().padStart(2, '0')}`}
    </span>
  );
}

function Rail({
  title,
  className = '',
  arrows = true,
  onSeeAll,
  children,
}: {
  title: string;
  className?: string;
  arrows?: boolean;
  onSeeAll?: () => void;
  children: React.ReactNode;
}) {
  const railRef = useRef<HTMLDivElement>(null);

  const scrollRail = (dir: 1 | -1) => {
    const rail = railRef.current;
    rail?.scrollBy({ left: dir * rail.clientWidth * 0.8, behavior: 'smooth' });
  };

  return (
    <section className={`shop-home-section ${className}`}>
      <div className="shop-home-section-head">
        <h2>{title}</h2>
        <div className="shop-home-section-actions">
          {arrows && (
            <>
              <button type="button" className="shop-home-arrow" onClick={() => scrollRail(-1)} aria-label={`Scroll ${title} left`}>
                <ChevronLeft size={14} />
              </button>
              <button type="button" className="shop-home-arrow" onClick={() => scrollRail(1)} aria-label={`Scroll ${title} right`}>
                <ChevronRight size={14} />
              </button>
            </>
          )}
          {onSeeAll && (
            <button type="button" className="shop-home-see-all" onClick={onSeeAll}>
              See All
              <ChevronRight size={14} />
            </button>
          )}
        </div>
      </div>
      <div ref={railRef} className="shop-home-rail">
        {children}
      </div>
    </section>
  );
}

function ProductRail({ title, products, section }: { title: string; products: SkincareProduct[]; section: string }) {
  const { navigate } = useApp();

  return (
    <Rail title={title} onSeeAll={() => navigate('shop-browse', { section })}>
      {products.map((product) => (
        <div key={product.id} className="shop-home-rail-item">
          <ShopProductCard product={product} onOpen={(p) => navigate('shop-product', { productId: p.id })} />
        </div>
      ))}
    </Rail>
  );
}

function DealCard({ item, rating }: { item: DealItem; rating?: boolean }) {
  const { navigate } = useApp();
  const addItem = useCartStore((s) => s.addItem);

  return (
    <article className="shop-home-deal">
      <span className="shop-home-deal-badge">{discountPercent(item.price, item.mrp)}% OFF</span>
      <button type="button" className="shop-home-deal-open" onClick={() => navigate('shop-product', { productId: item.id })}>
        <span className="shop-home-deal-media">
          <img src={item.image} alt={item.name} loading="lazy" />
        </span>
        <small className="shop-home-deal-brand">{item.brand}</small>
        <span className="shop-home-deal-name">{item.name}</span>
        <span className="shop-home-deal-price">
          <b>{formatRupee(item.price)}</b>
          <s>{formatRupee(item.mrp)}</s>
        </span>
      </button>
      <button
        type="button"
        className="shop-home-deal-add"
        onClick={() =>
          addItem({
            productId: item.id,
            name: item.name,
            brand: item.brand,
            image: item.image,
            price: item.price,
            mrp: item.mrp,
          })
        }
      >
        ADD
      </button>
    </article>
  );
}

function DealRail({ title, items, section, rating, className }: { title: string; items: DealItem[]; section?: Record<string, string>; rating?: boolean; className?: string }) {
  const { navigate } = useApp();

  return (
    <Rail title={title} className={className} onSeeAll={() => navigate('shop-browse', section)}>
      {items.map((item) => (
        <DealCard key={item.id} item={item} rating={rating} />
      ))}
    </Rail>
  );
}

function AdBannerCarousel() {
  const { navigate } = useApp();
  const trackRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const count = FESTIVAL_BANNERS.length;
  const GAP = 12;

  useEffect(() => {
    const timer = window.setInterval(() => setActiveIndex((prev) => (prev + 1) % count), 4000);
    return () => window.clearInterval(timer);
  }, [count]);

  useEffect(() => {
    const track = trackRef.current;
    const slide = track?.children[activeIndex] as HTMLElement | undefined;
    if (track && slide) track.scrollTo({ left: slide.offsetLeft - 16, behavior: 'smooth' });
  }, [activeIndex]);

  const handleScroll = () => {
    const track = trackRef.current;
    const slide = track?.children[0] as HTMLElement | undefined;
    if (!track || !slide) return;
    setActiveIndex(Math.min(count - 1, Math.round(track.scrollLeft / (slide.offsetWidth + GAP))));
  };

  return (
    <section className="shop-home-banners">
      <div ref={trackRef} className="shop-home-banner-track" onScroll={handleScroll}>
        {FESTIVAL_BANNERS.map((b) => (
          <button key={b.id} type="button" className="shop-home-banner" onClick={() => navigate('shop-browse', b.params)}>
            <img src={b.image} alt="" loading="lazy" />
            <span className="shop-home-banner-shade" />
            <span className="shop-home-banner-copy">
              <b>{b.title}</b>
              <small>{b.subtitle}</small>
            </span>
          </button>
        ))}
      </div>
      <div className="shop-home-dots">
        {FESTIVAL_BANNERS.map((b, i) => (
          <span key={b.id} className={i === activeIndex ? 'is-active' : ''} />
        ))}
      </div>
    </section>
  );
}

function CategoryRail() {
  const { navigate } = useApp();

  return (
    <Rail title="Shop by Category" onSeeAll={() => navigate('shop-browse')} className="shop-home-category-rail">
      {SHOP_BY_CATEGORY.map(({ id, title, imageUrl, Icon }) => (
        <button key={id} type="button" className="shop-home-category-card" onClick={() => navigate('shop-category', { categoryId: id })} aria-label={`Browse ${title}`}>
          <span className="shop-home-category-media">
            <img src={imageUrl} alt="" loading="lazy" />
          </span>
          <span className="shop-home-category-foot">
            <span className="shop-home-category-icon">
              <Icon size={14} />
            </span>
            <span>{title}</span>
          </span>
        </button>
      ))}
    </Rail>
  );
}

function CategoryGrid() {
  const { navigate } = useApp();

  return (
    <section className="shop-home-section">
      <div className="shop-home-section-head">
        <h2>Shop by Category</h2>
        <button type="button" className="shop-home-see-all" onClick={() => navigate('shop-browse')}>
          See All
          <ChevronRight size={14} />
        </button>
      </div>
      <div className="shop-home-category-grid">
        {CATEGORY_GRID.map((cat) => (
          <button
            key={cat.id}
            type="button"
            className="shop-home-category-tile"
            onClick={() => (cat.categoryId ? navigate('shop-category', { categoryId: cat.categoryId }) : navigate('shop-browse'))}
          >
            <span className="shop-home-category-circle">
              <img src={cat.image} alt="" loading="lazy" />
            </span>
            <span>{cat.name}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

export const ShopHomeScreen: React.FC = () => {
  const { navigate } = useApp();
  const totalCount = useCartStore((s) => s.totalCount);
  const [userLocation, setUserLocation] = useState('Payikapuram, Vijayawada');
  const [flashDealExpiry] = useState(() => Date.now() + 15 * 60 * 1000 + 30 * 1000);

  useEffect(() => {
    let active = true;
    getDeviceCurrentLocation()
      .then((loc) => {
        if (active && loc?.formattedAddress) setUserLocation(loc.formattedAddress);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="shop-screen shop-home">
      <header className="shop-home-hero">
        <div className="shop-home-topbar">
          <div className="shop-home-location">
            <span className="shop-home-eta">
              <Zap size={16} fill="currentColor" />
              {DELIVERY_ETA} MINS
            </span>
            <button type="button" className="shop-home-location-btn" onClick={() => navigate('location-setup')}>
              <span>{userLocation}</span>
              <ChevronRight size={14} />
            </button>
          </div>
          <button type="button" className="shop-home-profile" onClick={() => navigate('profile-tab')} aria-label="Profile">
            <User size={18} />
          </button>
        </div>

        <div className="shop-home-search">
          <button type="button" className="shop-home-search-input" onClick={() => navigate('shop-search-filters')} aria-label="Search products">
            <Search size={18} />
            <span>Search "Niacinamide, Sunscreen & more"</span>
          </button>
          <button type="button" className="shop-home-ai-btn" onClick={() => navigate('scan-camera')} aria-label="Open AI scanner">
            <ScanFace size={14} />
            AI Scan
          </button>
        </div>

        <div className="shop-home-flash">
          <div className="shop-home-flash-head">
            <span className="shop-home-flash-label">
              <Zap size={12} fill="currentColor" />
              FLASH GLOW DROP · 98% MATCH
            </span>
            <span className="shop-home-flash-timer">
              <ExpiryCountdown expiresAt={flashDealExpiry} />
            </span>
          </div>

          <h1>Flat ₹100 Off Today</h1>

          <div className="shop-home-flash-grid">
            {HERO_PRODUCT && (
              <button type="button" className="shop-home-featured" onClick={() => navigate('shop-product', { productId: HERO_PRODUCT.id })}>
                <span className="shop-home-featured-media">
                  <img src={getProductImageUrl(HERO_PRODUCT)} alt="" loading="lazy" />
                </span>
                <span className="shop-home-featured-body">
                  <span className="shop-home-featured-name">Instant Glow Booster (1₹ Trial Sample)</span>
                  <span className="shop-home-featured-price">
                    <b>₹1</b>
                    <s>₹99</s>
                  </span>
                </span>
              </button>
            )}
            <div className="shop-home-flash-tiles">
              {FLASH_TILES.map((t) => (
                <button key={t.id} type="button" className="shop-home-flash-tile" onClick={() => navigate('shop-category', { categoryId: t.categoryId })}>
                  <img src={t.image} alt="" loading="lazy" />
                  <span className="shop-home-flash-tile-shade" />
                  <span className="shop-home-flash-tile-label">{t.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <CategoryRail />

      <button type="button" className="shop-home-campaign" onClick={() => navigate('shop-browse', { promo: 'rakhi' })}>
        <span className="shop-home-campaign-copy">
          <b>Festive Glow Drop · Raksha Bandhan Specials</b>
          <small>Curated clinical gift hampers delivered in 15 mins</small>
        </span>
        <span className="shop-home-campaign-date">28th Aug</span>
      </button>

      <ProductRail title="Recommended for You" products={RECOMMENDED} section="recommended" />
      <ProductRail title="Top Picks for You" products={TOP_PICKS} section="topPicks" />

      <AdBannerCarousel />

      <ProductRail title="Featured Clinical Formulations" products={FEATURED} section="featured" />
      <ProductRail title="Steal Deals" products={STEAL_DEALS} section="stealDeals" />
      <ProductRail title="Trending Near You" products={TRENDING} section="trending" />
      <ProductRail title="Best Selling" products={BEST_SELLING} section="bestSelling" />

      <button type="button" className="shop-home-spotlight" onClick={() => navigate('shop-browse', { brand: 'mamaearth' })}>
        <span className="shop-home-spotlight-copy">
          <small>BRAND SPOTLIGHT · FEATURED</small>
          <strong>Mamaearth</strong>
          <span>Toxin-free, natural ingredient clinical solutions</span>
          <span className="shop-home-spotlight-cta">Shop Now →</span>
        </span>
        <span className="shop-home-spotlight-media">
          <img src={stock('1556228720-195a672e8a03')} alt="" loading="lazy" />
        </span>
      </button>

      <CategoryGrid />

      <ProductRail title="New Launches" products={NEW_LAUNCHES} section="newLaunches" />
      <ProductRail title="Deals Starting @ ₹99" products={UNDER_99} section="under99" />

      <section className="shop-home-marquee">
        <p>100% AUTHENTIC CLINICAL PARTNERS</p>
        <div className="shop-home-marquee-row">
          {['Minimalist', 'The Derma Co', 'Plum', 'Dot & Key', 'Forest Essentials', 'Biotique', "Dr. Sheth's", "Re'equil"].map((brandName) => (
            <button key={brandName} type="button" onClick={() => navigate('shop-browse', { brand: brandName })}>
              {brandName}
            </button>
          ))}
        </div>
      </section>

      <section className="shop-home-flash-deals">
        <div className="shop-home-flash-strip">
          <h2>
            <Zap size={18} fill="currentColor" />
            Flash Glow Deals
          </h2>
          <MidnightTimer />
        </div>
        <div className="shop-home-rail">
          {FLASH_DEALS.map((item) => (
            <DealCard key={item.id} item={item} />
          ))}
        </div>
      </section>

      <section className="shop-home-ai-cta">
        <span className="shop-home-ai-tag">
          <Sparkles size={12} />
          FREE AI SKIN SCAN
        </span>
        <h2>
          Know your skin's
          <br />
          <span>true needs</span>
        </h2>
        <p>Personalized cosmetic skin report in 30 sec. Free. Non-medical.</p>
        <button type="button" className="shop-home-ai-btn-white" onClick={() => navigate('scan-camera')}>
          <ScanFace size={16} />
          Start AI Skin Scan →
        </button>
        <div className="shop-home-ai-stats">
          {[
            { l: 'Skin Type', v: 'Combination' },
            { l: 'Hydration', v: '74/100' },
            { l: 'AI Match', v: '3 Picks' },
          ].map((c) => (
            <div key={c.l} className="shop-home-ai-stat">
              <span>{c.l}</span>
              <strong>{c.v}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="shop-home-section">
        <div className="shop-home-section-head">
          <h2>Shop by Concern</h2>
          <button type="button" className="shop-home-see-all" onClick={() => navigate('shop-browse')}>
            See All
            <ChevronRight size={14} />
          </button>
        </div>
        <div className="shop-home-concerns">
          {CONCERNS.map((c) => (
            <button
              key={c.id}
              type="button"
              className="shop-home-concern"
              onClick={() => (c.concernId ? navigate('shop-browse', { concern: c.concernId }) : navigate('shop-browse'))}
            >
              <span className="shop-home-concern-icon">
                <c.Icon size={14} />
              </span>
              <strong>{c.label}</strong>
              <small>{c.count}</small>
            </button>
          ))}
        </div>
      </section>

      <Rail title="Brand Deals" arrows={false} className="shop-home-brand-deals">
        {BRAND_DEALS.map((b) => (
          <button key={b.id} type="button" className="shop-home-brand-card" onClick={() => navigate('shop-browse')}>
            <strong>{b.brand}</strong>
            <b>{b.off}</b>
            <small>{b.count}</small>
            <span className="shop-home-outline-btn">Shop →</span>
          </button>
        ))}
      </Rail>

      <Rail title="Build Your Routine" arrows={false}>
        {ROUTINES.map((r) => (
          <div key={r.id} className="shop-home-routine">
            <span className="shop-home-routine-icon" style={{ color: r.accent }}>
              <r.Icon size={20} />
            </span>
            <h3>{r.label}</h3>
            <small>{r.desc}</small>
            <div className="shop-home-routine-steps">
              {r.steps.map((step, i) => (
                <span key={step} className="shop-home-routine-step">
                  <span className="shop-home-routine-num" style={{ background: r.accent }}>
                    {i + 1}
                  </span>
                  {step}
                </span>
              ))}
            </div>
            <button type="button" className="shop-home-routine-btn" onClick={() => navigate('scan-camera')}>
              Shop Routine →
            </button>
          </div>
        ))}
      </Rail>

      <DealRail title="Hair Care Picks" items={HAIR_DEALS} section={{ cat: 'Hair Care' }} rating />
      <DealRail title="Makeup Must-Haves" items={MAKEUP_DEALS} section={{ cat: 'Makeup' }} />

      <section className="shop-home-under199">
        <DealRail title="Under ₹199" items={UNDER_199_DEALS} className="shop-home-under199-rail" />
      </section>

      <DealRail title="Wellness & Nutrition" items={WELLNESS_DEALS} section={{ cat: 'Wellness' }} />

      <section className="shop-home-protect">
        <div className="shop-home-protect-head">
          <span className="shop-home-protect-icon">
            <ShieldCheck size={26} />
          </span>
          <div>
            <h2>GlowVAI Beauty Protection</h2>
            <p>100% coverage if your skin reacts. Full refund + free dermatologist consult.</p>
          </div>
        </div>
        <ul>
          {['Full refund if skin reacts', 'Free dermat consultation', 'No questions asked', 'Valid on every order'].map((pt) => (
            <li key={pt}>
              <Check size={14} />
              {pt}
            </li>
          ))}
        </ul>
        <button type="button" className="shop-home-pill-btn" onClick={() => navigate('profile-support')}>
          Learn More →
        </button>
      </section>

      <section className="shop-home-trust">
        <h2>Why GlowVAI?</h2>
        <div className="shop-home-trust-grid">
          {TRUST_ITEMS.map(({ title, sub, Icon }) => (
            <div key={title} className="shop-home-trust-item">
              <span className="shop-home-trust-icon">
                <Icon size={18} />
              </span>
              <strong>{title}</strong>
              <small>{sub}</small>
            </div>
          ))}
        </div>
      </section>

      <Rail title="Customer Love" arrows={false}>
        {TESTIMONIALS.map((t) => (
          <div key={t.id} className="shop-home-testimonial">
            <div className="shop-home-stars">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} size={13} fill="currentColor" />
              ))}
            </div>
            <p>"{t.text}"</p>
            <div className="shop-home-author">
              <span className="shop-home-avatar">{t.name[0]}</span>
              <div>
                <strong>{t.name}</strong>
                <small>
                  {t.role} · {t.loc}
                </small>
              </div>
            </div>
          </div>
        ))}
      </Rail>

      <section className="shop-home-refer">
        <h2>Give ₹100, Get ₹100</h2>
        <p>Invite friends to GlowVAI. They get ₹100 off, you earn ₹100 Glow Cash.</p>
        <button type="button" className="shop-home-pill-btn" onClick={() => navigate('profile-referrals')}>
          Invite Friends →
        </button>
      </section>

      <footer className="shop-home-footer">
        <div className="shop-home-footer-brand">
          <Sparkles size={16} />
          <strong>GlowVAI</strong>
        </div>
        <p>India's first AI-powered beauty quick-commerce. Personalized skincare delivered in 10 minutes.</p>
        <div className="shop-home-footer-links-wrap">
          <span>Quick Links</span>
          <div className="shop-home-footer-links">
            {FOOTER_LINKS.map((link) => (
              <button key={link.label} type="button" onClick={() => navigate(link.screen, link.params)}>
                {link.label}
              </button>
            ))}
          </div>
        </div>
        <div className="shop-home-footer-legal">
          <span>© 2026 GlowVAI Technologies Pvt. Ltd. All rights reserved.</span>
          <span>Privacy Policy · Terms of Use · Disclaimer</span>
        </div>
      </footer>

      <section className="shop-home-end">
        <Sparkles size={36} />
        <h2>You've seen it all!</h2>
        <p>Explore our complete 500+ clinical product catalog</p>
        <button type="button" className="shop-home-end-btn" onClick={() => navigate('shop-browse')}>
          Explore Full Catalog →
        </button>
      </section>

      <div className="shop-home-watermark" aria-hidden="true">
        GlowVAI
      </div>

      {totalCount > 0 && (
        <button type="button" className="shop-home-cart-pill" onClick={() => navigate('cart-tab')}>
          <ShoppingBag size={16} />
          <span>
            {totalCount} item{totalCount > 1 ? 's' : ''}
          </span>
          <ChevronRight size={14} />
        </button>
      )}
    </div>
  );
};
