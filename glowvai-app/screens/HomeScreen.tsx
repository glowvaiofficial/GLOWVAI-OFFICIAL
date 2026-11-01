import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Copy,
  MapPin,
  Mars,
  Mic,
  Search,
  UserRound,
  Venus,
  WalletCards,
  Zap,
} from 'lucide-react';
const herCategoryAtlas = '/glowvai/assets/home/navratri-her-categories.png';
const herHero = '/glowvai/assets/home/navratri-her-hero.png';
const himCategoryAtlas = '/glowvai/assets/home/navratri-him-categories.png';
const himHero = '/glowvai/assets/home/navratri-him-hero.png';

// The Navratri edit stays off outside the festival. Turn this on for the festival and check the dates first.
const SHOW_NAVRATRI_EDIT = false;
import { ProductCard } from '../components/cards/ProductCard';
import { AddressModal } from '../components/common/AddressModal';
import { useApp } from '../context/AppContext';
import { PRODUCTS } from '../data/products';
import '../responsive/home-products.css';

type HomeScreenProps = { embedded?: boolean };
type Mode = 'women' | 'men';
type TabId = 'top' | 'serums' | 'sun' | 'makeup' | 'hair' | 'body';
type BuyAgainTab = 'all' | 'skin' | 'hair' | 'makeup';
type CategoryTab = { id: TabId; label: string; productIndex: number; productIndexes: number[] };
type Shortcut = { title: string; subtitle: string; productIndex: number; query: string };
type FestivalCategory = { title: string; query: string };
type Offer = { value: string; condition: string; code: string };
// Only codes the cart accepts. Cart coupons: GLOW50 (and FIRST, which is applied as GLOW50).
const LIVE_OFFER: Offer = { value: 'FLAT ₹50 OFF', condition: 'on your bag', code: 'GLOW50' };
type ModeContent = {
  search: string;
  heroCopy: string;
  heroImage: string;
  categoryAtlas: string;
  categories: [FestivalCategory, FestivalCategory, FestivalCategory, FestivalCategory, FestivalCategory, FestivalCategory];
  promoTitle: string;
  promoCopy: string;
  tabs: CategoryTab[];
  shelfTitle: string;
  productOrder: number[];
  explore: [Shortcut, Shortcut, Shortcut];
  offers: Offer[];
  valueTitle: string;
};

const MODE_CONTENT: Record<Mode, ModeContent> = {
  women: {
    search: 'Search “sunscreen, lipstick, skincare...”',
    heroCopy: 'Beauty · Gifting · Festive Picks',
    heroImage: herHero,
    categoryAtlas: herCategoryAtlas,
    categories: [
      { title: 'Pooja Essentials', query: '' },
      { title: 'Skincare & Haircare', query: '' },
      { title: 'Makeup Essentials', query: 'foundation' },
      { title: 'Fragrances', query: '' },
      { title: 'Personal Care', query: '' },
      { title: 'Festive Gifts', query: '' },
    ],
    promoTitle: 'Navratri Specials · Shop the edit',
    promoCopy: 'Beauty · Skincare · Makeup · More',
    tabs: [
      { id: 'top', label: 'Top Picks', productIndex: 8, productIndexes: [8, 6, 4, 1, 9, 5] },
      { id: 'serums', label: 'Serums', productIndex: 1, productIndexes: [1, 3, 5, 4] },
      { id: 'sun', label: 'Sun Care', productIndex: 6, productIndexes: [6, 0, 4] },
      { id: 'makeup', label: 'Makeup', productIndex: 8, productIndexes: [8, 9, 6] },
      { id: 'hair', label: 'Hair Care', productIndex: 5, productIndexes: [5, 4, 7] },
      { id: 'body', label: 'Body Care', productIndex: 7, productIndexes: [7, 4, 2] },
    ],
    shelfTitle: 'Top Picks',
    productOrder: [8, 6, 4, 1, 9, 5, 0, 3, 2, 7],
    explore: [
      { title: 'Everyday skincare', subtitle: 'Cleanse. Treat. Moisturise.', productIndex: 2, query: '' },
      { title: 'Makeup favourites', subtitle: 'Easy looks, fast', productIndex: 8, query: 'foundation' },
      { title: 'Healthy hair', subtitle: 'Care from root to tip', productIndex: 5, query: '' },
    ],
    offers: [LIVE_OFFER],
    valueTitle: 'Value Picks',
  },
  men: {
    search: 'Search “sunscreen, shampoo, grooming...”',
    heroCopy: 'Style · Grooming · Festive Picks',
    heroImage: himHero,
    categoryAtlas: himCategoryAtlas,
    categories: [
      { title: 'Grooming & Skincare', query: '' },
      { title: 'Haircare', query: '' },
      { title: 'Fragrances', query: '' },
      { title: 'Shaving & Beard', query: '' },
      { title: 'Men’s Essentials', query: '' },
      { title: 'Festive Gifts', query: '' },
    ],
    promoTitle: 'Navratri Specials · Shop the edit',
    promoCopy: 'Grooming · Fragrances · More',
    tabs: [
      { id: 'top', label: 'Top Picks', productIndex: 2, productIndexes: [2, 0, 3, 1, 7, 5] },
      { id: 'serums', label: 'Face Wash', productIndex: 2, productIndexes: [2, 5, 1] },
      { id: 'sun', label: 'Daily SPF', productIndex: 0, productIndexes: [0, 1, 6] },
      { id: 'makeup', label: 'Beard', productIndex: 3, productIndexes: [3, 1, 9] },
      { id: 'hair', label: 'Hair', productIndex: 5, productIndexes: [5, 3, 7] },
      { id: 'body', label: 'Body', productIndex: 7, productIndexes: [7, 4, 2] },
    ],
    shelfTitle: 'Grooming Picks',
    productOrder: [2, 0, 3, 1, 7, 5, 4, 9, 6, 8],
    explore: [
      { title: 'Daily grooming', subtitle: 'A simple three-step edit', productIndex: 2, query: '' },
      { title: 'Beard care', subtitle: 'Clean lines, softer feel', productIndex: 3, query: '' },
      { title: 'Hair reset', subtitle: 'Shampoo and style', productIndex: 5, query: '' },
    ],
    offers: [LIVE_OFFER],
    valueTitle: 'Grooming Value Picks',
  },
};

const getProduct = (index: number) => PRODUCTS[index % PRODUCTS.length];

export const HomeScreen: React.FC<HomeScreenProps> = ({ embedded = false }) => {
  const { currentAddress, navigate, setShoppingPreference, shoppingPreference, showToast } = useApp();
  const [addressOpen, setAddressOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('top');
  const [buyAgainTab, setBuyAgainTab] = useState<BuyAgainTab>('all');
  const [loading, setLoading] = useState(false);
  const [modeChanging, setModeChanging] = useState(false);
  const shelfTimer = useRef<number | null>(null);
  const modeTimer = useRef<number | null>(null);
  const mode: Mode = shoppingPreference === 'men' ? 'men' : 'women';
  const content = MODE_CONTENT[mode];

  useEffect(() => () => {
    if (shelfTimer.current) window.clearTimeout(shelfTimer.current);
    if (modeTimer.current) window.clearTimeout(modeTimer.current);
  }, []);

  const selectedTab = content.tabs.find((tab) => tab.id === activeTab) || content.tabs[0];
  const shelfProducts = useMemo(() => selectedTab.productIndexes.map(getProduct).filter((product) => product.isSourcedNearby), [selectedTab]);
  const orderedProducts = useMemo(() => content.productOrder.map(getProduct).filter((product) => product.isSourcedNearby), [content]);
  const buyAgainProducts = useMemo(() => {
    const filters: Record<BuyAgainTab, string[]> = { all: [], skin: ['skincare'], hair: ['Toners & Mists', 'Moisturisers & Creams'], makeup: ['cosmetics'] };
    const wanted = filters[buyAgainTab];
    return orderedProducts.filter((product) => !wanted.length || wanted.includes(product.category) || wanted.includes(product.subcategory));
  }, [buyAgainTab, orderedProducts]);

  const switchMode = (next: Mode) => {
    if (next === mode) return;
    setModeChanging(true);
    setActiveTab('top');
    setBuyAgainTab('all');
    setShoppingPreference(next);
    if (modeTimer.current) window.clearTimeout(modeTimer.current);
    modeTimer.current = window.setTimeout(() => setModeChanging(false), 430);
  };

  const selectTab = (next: TabId, target: HTMLButtonElement) => {
    if (next === activeTab) return;
    setLoading(true);
    target.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    if (shelfTimer.current) window.clearTimeout(shelfTimer.current);
    shelfTimer.current = window.setTimeout(() => { setActiveTab(next); setLoading(false); }, 240);
  };

  const copyOffer = async (code: string) => {
    try { await navigator.clipboard?.writeText(code); } catch { /* clipboard can be unavailable in preview */ }
    showToast(`${code} copied`);
  };

  const productRail = (products: typeof PRODUCTS) => (
    <div className="zq-product-rail">{products.map((product) => <ProductCard key={product.id} product={product} />)}</div>
  );

  return (
    <main className={`zq-home zq-mode-${mode}${embedded ? ' is-embedded' : ''}${modeChanging ? ' is-mode-changing' : ''}`}>
      {!embedded && <AddressModal isOpen={addressOpen} onClose={() => setAddressOpen(false)} />}

      <header className="zq-header">
        <div className="zq-header-top">
          <button className="zq-wordmark" onClick={() => navigate('home')} aria-label="Glowvai home">Glowvai</button>
          <button className="zq-location" onClick={() => !embedded && setAddressOpen(true)}>
            <strong><Zap size={14} fill="currentColor" /> {currentAddress.deliveryMinutes} minutes</strong>
            <small><MapPin size={10} fill="currentColor" /><b>HOME</b> - {currentAddress.area} <ChevronDown size={12} /></small>
          </button>
          <div className="zq-header-actions">
            <button className="zq-wallet" aria-label="Wallet balance"><WalletCards size={18} /><b>₹0</b></button>
            <button className="zq-profile" onClick={() => navigate('profile')} aria-label="Open profile"><UserRound size={20} /></button>
          </div>
        </div>
        <button className="zq-search" onClick={() => navigate('search')}><Search size={20} /><span>{content.search}</span><Mic size={18} /></button>
      </header>

      <div className="zq-feed" key={mode}>
        <div className="zq-mode-wrap">
          <div className="zq-mode-toggle" data-mode={mode} role="group" aria-label="Shopping mode">
            <span className="zq-mode-thumb" aria-hidden="true" />
            <button aria-pressed={mode === 'women'} onClick={() => switchMode('women')}><Venus size={17} /><span>For Her</span></button>
            <button aria-pressed={mode === 'men'} onClick={() => switchMode('men')}><Mars size={17} /><span>For Him</span></button>
          </div>
        </div>

        {SHOW_NAVRATRI_EDIT && (
          <section className="zq-festival" aria-label={`Navratri ${content.heroCopy}`}>
            <button className="zq-festival-hero" onClick={() => navigate('categories')}>
              <img src={content.heroImage} alt="" />
              <span className="zq-festival-copy"><small>Celebrate</small><strong>NAVRATRI</strong><em>{content.heroCopy}</em></span>
            </button>
            <div className="zq-festival-grid">
              {content.categories.map((category, index) => <button key={category.title} onClick={() => (category.query ? navigate('search', { query: category.query }) : navigate('categories'))}><span className="zq-category-photo" style={{ backgroundImage: `url(${content.categoryAtlas})`, '--category-index': index } as React.CSSProperties} /><b>{category.title}</b><ChevronRight size={14} /></button>)}
            </div>
            <button className="zq-festival-promo" onClick={() => navigate('categories')}><img src={content.heroImage} alt="" /><span><b>{content.promoTitle}</b><small>{content.promoCopy}</small></span><ChevronRight size={19} /></button>
          </section>
        )}

        <section className="zq-discovery" aria-labelledby="top-picks-title">
          <div className="zq-section-title zq-featured-title"><h2 id="top-picks-title">{content.shelfTitle}</h2><button onClick={() => navigate('categories')}>See all <ChevronRight size={15} /></button></div>
          <div className="zq-scoop-tabs" role="tablist" aria-label="Beauty categories">
            {content.tabs.map((tab) => <button key={tab.id} role="tab" aria-selected={activeTab === tab.id} className={activeTab === tab.id ? 'is-active' : ''} onClick={(event) => selectTab(tab.id, event.currentTarget)}><span><img src={getProduct(tab.productIndex).images[0]} alt="" /></span><b>{tab.label}</b></button>)}
          </div>
          {loading ? <div className="zq-product-rail">{Array.from({ length: 4 }, (_, index) => <div className="zq-skeleton" key={index}><span /><i /><i /><b /></div>)}</div> : productRail(shelfProducts)}
          <button className="zq-see-all" onClick={() => navigate('categories')}>See all {selectedTab.label} <ChevronRight size={16} /></button>
        </section>

        <section className="zq-section zq-explore" aria-labelledby="explore-title">
          <div className="zq-section-title"><h2 id="explore-title">Explore</h2><button onClick={() => navigate('categories')}>See all <ChevronRight size={15} /></button></div>
          <div className="zq-explore-grid">
            {content.explore.map((shortcut, index) => <button key={shortcut.title} className={index === 0 ? 'is-wide' : ''} onClick={() => (shortcut.query ? navigate('search', { query: shortcut.query }) : navigate('categories'))}><span><b>{shortcut.title}</b><small>{shortcut.subtitle}</small><em>Shop now <ChevronRight size={13} /></em></span><img src={getProduct(shortcut.productIndex).images[0]} alt="" /></button>)}
          </div>
        </section>

        <section className="zq-section zq-offers" aria-labelledby="offers-title">
          <div className="zq-section-title"><h2 id="offers-title">Coupons & Offers</h2><button onClick={() => navigate('categories')}>See all <ChevronRight size={15} /></button></div>
          <div className="zq-offer-rail">
            {content.offers.map((offer) => <button key={offer.code} onClick={() => copyOffer(offer.code)}><b>{offer.value}</b><small>{offer.condition}</small><span>Code <strong>{offer.code}</strong><Copy size={12} /></span></button>)}
          </div>
          <button className="zq-bank-strip" onClick={() => navigate('cart')}><span className="zq-upi-mark">UPI</span><span><b>Pay online or on delivery</b><small>UPI, cards, netbanking, wallets or cash on delivery</small></span><ChevronRight size={18} /></button>
        </section>

        <section className="zq-section zq-value-picks" aria-labelledby="value-title">
          <div className="zq-section-title"><div><h2 id="value-title">{content.valueTitle}</h2><p>Everyday essentials at useful prices</p></div><button onClick={() => navigate('categories')}>See all <ChevronRight size={15} /></button></div>
          {productRail([...orderedProducts].reverse().slice(0, 7))}
          <button className="zq-see-all" onClick={() => navigate('categories')}>See all {content.valueTitle} <ChevronRight size={16} /></button>
        </section>

        <section className="zq-section zq-buy-again" aria-labelledby="buy-again-title">
          <div className="zq-section-title"><h2 id="buy-again-title">Buy Again</h2><button onClick={() => navigate('order-history')}>Past orders <ChevronRight size={15} /></button></div>
          <div className="zq-buy-tabs" role="tablist" aria-label="Buy again categories">
            {([['all', 'All items'], ['skin', 'Skin care'], ['hair', 'Hair care'], ['makeup', 'Makeup']] as [BuyAgainTab, string][]).map(([id, label]) => <button key={id} role="tab" aria-selected={buyAgainTab === id} className={buyAgainTab === id ? 'is-active' : ''} onClick={() => setBuyAgainTab(id)}>{label}</button>)}
          </div>
          {productRail((buyAgainProducts.length ? buyAgainProducts : orderedProducts).slice(0, 6))}
        </section>

        <div className="zq-bottom-clearance" aria-hidden="true" />
      </div>
    </main>
  );
};
