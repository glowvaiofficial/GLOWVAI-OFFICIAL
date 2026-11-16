import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowUpDown, Check, ChevronRight, LayoutGrid, List, PackageSearch, RefreshCw, SlidersHorizontal, Star, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { useCatalogReady, type SkincareProduct } from '../../../core/data/indianSkincareCatalog';
import { useProductFeedStatus } from '../../../core/services/productFeed';
import { isSellable } from '../../../../lib/shop/variants';
import { ShopProductCard } from '../shared/ShopProductCard';
import { getDiscountPercent } from '../shared/shopUtils';
import { CONCERN_KEYWORDS } from '../lib/firstVisit';
import '../styles/shop-pc-browse.css';

export const PC_CATEGORY_LABELS: Record<string, string> = {
  Serums: 'Serums & Actives',
  Cleansers: 'Cleansers & Washes',
  Moisturizers: 'Moisturizers & Creams',
  Suncare: 'Sunscreen & SPF',
  Treatments: 'Spot Treatments',
};

export const PC_CONCERNS: { id: string; label: string }[] = [
  { id: 'acne', label: 'Acne & Blemishes' },
  { id: 'hydration', label: 'Hydration & Dryness' },
  { id: 'brightening', label: 'Glow & Dark Spots' },
  { id: 'antiaging', label: 'Firming & Lines' },
  { id: 'barrier', label: 'Barrier Repair' },
];

type SortId = 'relevance' | 'popularity' | 'price-asc' | 'price-desc' | 'rating' | 'discount';
const SORTS: { id: SortId; label: string }[] = [
  { id: 'relevance', label: 'Relevance' },
  { id: 'popularity', label: 'Popularity' },
  { id: 'price-asc', label: 'Price: low to high' },
  { id: 'price-desc', label: 'Price: high to low' },
  { id: 'rating', label: 'Top rated' },
  { id: 'discount', label: 'Discount' },
];
const PRICE_PRESETS: { label: string; min: number | null; max: number | null }[] = [
  { label: 'Under ₹500', min: null, max: 499 },
  { label: '₹500 – ₹1,000', min: 500, max: 1000 },
  { label: '₹1,000+', min: 1000, max: null },
];
const RATING_STEPS = [4, 3];
const DISCOUNT_STEPS = [10, 20, 30, 40];
const PAGE = 24;

const norm = (v: string) => v.toLowerCase().replace(/[^a-z0-9]/g, '');
const inStock = (p: SkincareProduct) => !p.variants || p.variants.length === 0 || p.variants.some(isSellable);

export interface PcCrumb {
  label: string;
  onClick?: () => void;
}

export interface PcListingProps {
  title: string;
  subtitle?: string;
  crumbs: PcCrumb[];
  // The products this page is about (a category, or the matches of a search). The filters narrow this list further.
  products: SkincareProduct[];
  lockedCategory?: boolean;
  initial?: { concern?: string; brand?: string | null; maxPrice?: number | null };
  // A search box (with its suggestions) shown beside the title.
  searchSlot?: ReactNode;
  // Extra content under the title (for example the category shortcuts on All Categories).
  topSlot?: ReactNode;
  // The search words in force, shown as a removable chip, and what "Clear all" also resets.
  scopeChip?: { label: string; onClear: () => void } | null;
  emptyHint?: string;
  onOpen: (product: SkincareProduct) => void;
}

interface Facet {
  value: string;
  label: string;
  count: number;
}

const FacetGroup: React.FC<{ title: string; children: ReactNode }> = ({ title, children }) => {
  const [open, setOpen] = useState(true);
  return (
    <section className="pc-facet">
      <button type="button" className="pc-facet-head" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <h3>{title}</h3>
        <ChevronRight size={16} className={open ? 'is-open' : ''} />
      </button>
      {open && <div className="pc-facet-body">{children}</div>}
    </section>
  );
};

const CheckRow: React.FC<{ checked: boolean; label: ReactNode; count?: number; onChange: () => void; radio?: boolean }> = ({ checked, label, count, onChange, radio }) => (
  <label className={`pc-check${checked ? ' is-on' : ''}`}>
    <input type={radio ? 'radio' : 'checkbox'} checked={checked} onChange={onChange} />
    <span className={`pc-check-box${radio ? ' is-radio' : ''}`} aria-hidden="true">{checked && !radio && <Check size={12} strokeWidth={3} />}</span>
    <span className="pc-check-label">{label}</span>
    {count !== undefined && <span className="pc-check-count">{count}</span>}
  </label>
);

export const PcListing: React.FC<PcListingProps> = ({ title, subtitle, crumbs, products, lockedCategory, initial, searchSlot, topSlot, scopeChip, emptyHint, onOpen }) => {
  const ready = useCatalogReady();
  const feedError = useProductFeedStatus((s) => s.error);
  const retryFeed = useProductFeedStatus((s) => s.retry);

  const [cats, setCats] = useState<string[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [concern, setConcern] = useState<string>(initial?.concern && initial.concern !== 'all' ? initial.concern : '');
  const [minP, setMinP] = useState('');
  const [maxP, setMaxP] = useState(initial?.maxPrice ? String(initial.maxPrice - 1) : '');
  const [rating, setRating] = useState(0);
  const [disc, setDisc] = useState(0);
  const [stockOnly, setStockOnly] = useState(false);
  const [sort, setSort] = useState<SortId>('relevance');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [brandQuery, setBrandQuery] = useState('');
  const [shown, setShown] = useState(PAGE);

  // A brand handed over from the home ("Brands" strip) selects the matching brand names once the catalogue is here.
  const brandSeed = initial?.brand ?? null;
  const hasProducts = products.length > 0;
  useEffect(() => {
    if (!brandSeed) return;
    const want = norm(brandSeed);
    const names = Array.from(new Set(products.map((p) => p.brand))).filter((b) => norm(b).includes(want));
    if (names.length > 0) setBrands(names);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brandSeed, hasProducts]);

  const toggle = (list: string[], set: (v: string[]) => void, v: string) => set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const categoryFacets: Facet[] = useMemo(() => {
    const m = new Map<string, number>();
    products.forEach((p) => m.set(p.category, (m.get(p.category) ?? 0) + 1));
    return Array.from(m, ([value, count]) => ({ value, label: PC_CATEGORY_LABELS[value] ?? value, count }));
  }, [products]);
  const brandFacets: Facet[] = useMemo(() => {
    const m = new Map<string, number>();
    products.forEach((p) => m.set(p.brand, (m.get(p.brand) ?? 0) + 1));
    return Array.from(m, ([value, count]) => ({ value, label: value, count })).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  }, [products]);

  const priceRange = useMemo(() => {
    if (products.length === 0) return { lo: 0, hi: 0 };
    const prices = products.map((p) => p.price);
    return { lo: Math.floor(Math.min(...prices)), hi: Math.ceil(Math.max(...prices)) };
  }, [products]);

  const results = useMemo(() => {
    const lo = minP === '' ? null : Number(minP);
    const hi = maxP === '' ? null : Number(maxP);
    const kws = concern ? CONCERN_KEYWORDS[concern] : null;
    const list = products.filter((p) => {
      if (cats.length > 0 && !cats.includes(p.category)) return false;
      if (brands.length > 0 && !brands.includes(p.brand)) return false;
      if (kws) {
        const hay = `${p.name} ${p.description} ${p.keyActives.join(' ')}`.toLowerCase();
        if (!kws.some((k) => hay.includes(k))) return false;
      }
      if (lo !== null && Number.isFinite(lo) && p.price < lo) return false;
      if (hi !== null && Number.isFinite(hi) && p.price > hi) return false;
      if (rating > 0 && (p.rating ?? 0) < rating) return false;
      if (disc > 0 && getDiscountPercent(p) < disc) return false;
      if (stockOnly && !inStock(p)) return false;
      return true;
    });
    const out = [...list];
    if (sort === 'price-asc') out.sort((a, b) => a.price - b.price);
    else if (sort === 'price-desc') out.sort((a, b) => b.price - a.price);
    else if (sort === 'rating') out.sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1));
    else if (sort === 'popularity') out.sort((a, b) => (b.reviewCount ?? 0) - (a.reviewCount ?? 0));
    else if (sort === 'discount') out.sort((a, b) => getDiscountPercent(b) - getDiscountPercent(a));
    return out;
  }, [products, cats, brands, concern, minP, maxP, rating, disc, stockOnly, sort]);

  // Filters and sorting restart the list at its first page.
  useEffect(() => setShown(PAGE), [cats, brands, concern, minP, maxP, rating, disc, stockOnly, sort, products]);

  const chips: { key: string; label: string; clear: () => void }[] = [];
  if (scopeChip) chips.push({ key: 'scope', label: scopeChip.label, clear: scopeChip.onClear });
  cats.forEach((c) => chips.push({ key: `c-${c}`, label: PC_CATEGORY_LABELS[c] ?? c, clear: () => setCats((l) => l.filter((x) => x !== c)) }));
  brands.forEach((b) => chips.push({ key: `b-${b}`, label: b, clear: () => setBrands((l) => l.filter((x) => x !== b)) }));
  if (concern) chips.push({ key: 'concern', label: PC_CONCERNS.find((c) => c.id === concern)?.label ?? concern, clear: () => setConcern('') });
  if (minP !== '' || maxP !== '') {
    const fmt = (v: string) => `₹${Number(v).toLocaleString('en-IN')}`;
    const label = minP !== '' && maxP !== '' ? `${fmt(minP)} – ${fmt(maxP)}` : maxP !== '' ? `Up to ${fmt(maxP)}` : `${fmt(minP)}+`;
    chips.push({ key: 'price', label, clear: () => { setMinP(''); setMaxP(''); } });
  }
  if (rating > 0) chips.push({ key: 'rating', label: `${rating} stars & up`, clear: () => setRating(0) });
  if (disc > 0) chips.push({ key: 'disc', label: `${disc}% off or more`, clear: () => setDisc(0) });
  if (stockOnly) chips.push({ key: 'stock', label: 'In stock only', clear: () => setStockOnly(false) });

  const clearAll = () => {
    setCats([]); setBrands([]); setConcern(''); setMinP(''); setMaxP(''); setRating(0); setDisc(0); setStockOnly(false);
    scopeChip?.onClear();
  };

  const visibleBrands = brandFacets.filter((b) => !brandQuery.trim() || b.label.toLowerCase().includes(brandQuery.trim().toLowerCase()));
  const n = results.length;
  const loading = !ready && products.length === 0 && !feedError;
  const failed = !ready && feedError && products.length === 0;

  const chipList = (centered?: boolean) => (
    <div className={`pc-chips${centered ? ' is-center' : ''}`}>
      {chips.map((c) => (
        <span key={c.key} className="pc-chip">
          {c.label}
          <button type="button" onClick={c.clear} aria-label={`Remove ${c.label}`}><X size={12} /></button>
        </span>
      ))}
      {!centered && <button type="button" className="pc-chips-clear" onClick={clearAll}>Clear all</button>}
    </div>
  );

  return (
    <div className="shop-screen pc-browse">
      <div className="pc-wrap">
        <nav className="pc-crumbs" aria-label="Breadcrumb">
          {crumbs.map((c, i) => (
            <React.Fragment key={`${c.label}-${i}`}>
              {i > 0 && <ChevronRight size={13} aria-hidden="true" />}
              {c.onClick && i < crumbs.length - 1 ? (
                <button type="button" onClick={c.onClick}>{c.label}</button>
              ) : (
                <span aria-current={i === crumbs.length - 1 ? 'page' : undefined}>{c.label}</span>
              )}
            </React.Fragment>
          ))}
        </nav>

        <div className="pc-title-row">
          <div>
            <h1>{title}</h1>
            {subtitle && <p>{subtitle}</p>}
          </div>
          {searchSlot && <div className="pc-search-slot">{searchSlot}</div>}
        </div>
        {topSlot}

        <div className="pc-layout">
          <aside className="pc-filters" aria-label="Filters">
            <div className="pc-filters-head">
              <h2><SlidersHorizontal size={16} /> Filters</h2>
              {chips.length > 0 && <button type="button" onClick={clearAll}>Clear all</button>}
            </div>

            {!lockedCategory && categoryFacets.length > 1 && (
              <FacetGroup title="Category">
                {categoryFacets.map((f) => (
                  <CheckRow key={f.value} checked={cats.includes(f.value)} label={f.label} count={f.count} onChange={() => toggle(cats, setCats, f.value)} />
                ))}
              </FacetGroup>
            )}

            {brandFacets.length > 0 && (
              <FacetGroup title="Brand">
                {brandFacets.length > 7 && (
                  <input className="pc-facet-search" type="search" value={brandQuery} onChange={(e) => setBrandQuery(e.target.value)} placeholder="Search brands" aria-label="Search brands" />
                )}
                <div className="pc-facet-scroll">
                  {visibleBrands.map((f) => (
                    <CheckRow key={f.value} checked={brands.includes(f.value)} label={f.label} count={f.count} onChange={() => toggle(brands, setBrands, f.value)} />
                  ))}
                  {visibleBrands.length === 0 && <p className="pc-facet-none">No brand matches.</p>}
                </div>
              </FacetGroup>
            )}

            <FacetGroup title="Skin concern">
              {PC_CONCERNS.map((c) => (
                <CheckRow key={c.id} radio checked={concern === c.id} label={c.label} onChange={() => setConcern(concern === c.id ? '' : c.id)} />
              ))}
            </FacetGroup>

            <FacetGroup title="Price">
              <div className="pc-price-inputs">
                <label><span>Min ₹</span><input type="number" inputMode="numeric" min={0} value={minP} placeholder={String(priceRange.lo)} onChange={(e) => setMinP(e.target.value)} aria-label="Minimum price" /></label>
                <i aria-hidden="true">to</i>
                <label><span>Max ₹</span><input type="number" inputMode="numeric" min={0} value={maxP} placeholder={String(priceRange.hi)} onChange={(e) => setMaxP(e.target.value)} aria-label="Maximum price" /></label>
              </div>
              <div className="pc-price-presets">
                {PRICE_PRESETS.map((p) => {
                  const on = (p.min === null ? '' : String(p.min)) === minP && (p.max === null ? '' : String(p.max)) === maxP;
                  return (
                    <button
                      key={p.label}
                      type="button"
                      className={`pc-pill${on ? ' is-on' : ''}`}
                      aria-pressed={on}
                      onClick={() => {
                        setMinP(on || p.min === null ? '' : String(p.min));
                        setMaxP(on || p.max === null ? '' : String(p.max));
                      }}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </FacetGroup>

            <FacetGroup title="Customer rating">
              {RATING_STEPS.map((r) => (
                <CheckRow key={r} radio checked={rating === r} onChange={() => setRating(rating === r ? 0 : r)} label={<span className="pc-stars">{r} <Star size={12} fill="currentColor" /> &amp; up</span>} />
              ))}
            </FacetGroup>

            <FacetGroup title="Discount">
              {DISCOUNT_STEPS.map((d) => (
                <CheckRow key={d} radio checked={disc === d} onChange={() => setDisc(disc === d ? 0 : d)} label={`${d}% off or more`} />
              ))}
            </FacetGroup>

            <FacetGroup title="Availability">
              <CheckRow checked={stockOnly} onChange={() => setStockOnly((v) => !v)} label="In stock only" />
            </FacetGroup>
          </aside>

          <section className="pc-results" aria-label="Results">
            <div className="pc-sortbar">
              <p className="pc-count" aria-live="polite">
                {loading ? 'Loading products' : <><b>{n.toLocaleString('en-IN')}</b> {n === 1 ? 'product' : 'products'}</>}
              </p>
              <div className="pc-sortbar-tools">
                <label className="pc-sort">
                  <ArrowUpDown size={14} />
                  <span>Sort by</span>
                  <select value={sort} onChange={(e) => setSort(e.target.value as SortId)} aria-label="Sort products">
                    {SORTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                </label>
                <div className="pc-view" role="group" aria-label="Layout">
                  <button type="button" className={view === 'grid' ? 'is-on' : ''} aria-pressed={view === 'grid'} aria-label="Grid view" onClick={() => setView('grid')}><LayoutGrid size={16} /></button>
                  <button type="button" className={view === 'list' ? 'is-on' : ''} aria-pressed={view === 'list'} aria-label="List view" onClick={() => setView('list')}><List size={16} /></button>
                </div>
              </div>
            </div>

            {chips.length > 0 && chipList()}

            {loading ? (
              <div className="pc-grid" aria-busy="true" aria-label="Loading products">
                {Array.from({ length: 10 }, (_, i) => (
                  <div key={i} className="pc-skel">
                    <div className="shop-skeleton pc-skel-img" />
                    <div className="shop-skeleton pc-skel-line" style={{ width: '40%' }} />
                    <div className="shop-skeleton pc-skel-line" />
                    <div className="shop-skeleton pc-skel-line" style={{ width: '70%' }} />
                    <div className="shop-skeleton pc-skel-btn" />
                  </div>
                ))}
              </div>
            ) : failed ? (
              <div className="pc-state is-error">
                <span className="pc-state-icon"><AlertTriangle size={26} /></span>
                <h2>We couldn't load the products</h2>
                <p>Check your connection and try again.</p>
                <button type="button" className="shop-btn-primary" onClick={retryFeed}><RefreshCw size={16} /> Try again</button>
              </div>
            ) : n === 0 ? (
              <div className="pc-state">
                <span className="pc-state-icon"><PackageSearch size={26} /></span>
                <h2>{emptyHint ? `No products found for "${emptyHint}"` : chips.length > 0 ? 'No products match these filters' : 'No products here yet'}</h2>
                <p>{chips.length > 0 ? 'Try removing a filter or widening the price range.' : 'Check back soon, new products are added often.'}</p>
                {chips.length > 0 && (
                  <>
                    {chipList(true)}
                    <button type="button" className="shop-btn-primary" onClick={clearAll}>Clear all filters</button>
                  </>
                )}
              </div>
            ) : (
              <>
                <div className={`pc-grid${view === 'list' ? ' is-list' : ''}`}>
                  {results.slice(0, shown).map((p) => (
                    <ShopProductCard key={p.id} product={p} onOpen={onOpen} rich layout={view} />
                  ))}
                </div>
                {n > shown && (
                  <div className="pc-more">
                    <p>Showing {Math.min(shown, n)} of {n}</p>
                    <button type="button" className="shop-btn-secondary" onClick={() => setShown((s) => s + PAGE)}>Show more products</button>
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};
