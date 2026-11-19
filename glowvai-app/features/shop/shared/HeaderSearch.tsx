import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Clock, Search, Tag, TrendingUp, X } from 'lucide-react';
import { useApp } from '../../../context/useApp';
import { useLiveCatalog } from '../../../core/data/indianSkincareCatalog';
import { rankSuggestions } from '../../../../lib/shop/suggest';
import { SearchHint } from './SearchHint';
import { VoiceSearchButton } from './VoiceSearchButton';

// The header search for every shop header (PC home, the shared web header and the phone home). The bar is a real text
// input in place: focusing or typing opens a suggestions list, and only submitting (Enter, or choosing a suggestion)
// leaves the page for the results screen. Admin search hints still rotate inside the empty bar.
const RECENT_KEY = 'glowvai_recent_searches_v1';
const RECENT_MAX = 5;

const readRecent = (): string[] => {
  try {
    const raw = JSON.parse(window.localStorage.getItem(RECENT_KEY) || '[]');
    return Array.isArray(raw) ? raw.filter((x): x is string => typeof x === 'string').slice(0, RECENT_MAX) : [];
  } catch {
    return [];
  }
};
const saveRecent = (term: string): void => {
  try {
    const next = [term, ...readRecent().filter((t) => t.toLowerCase() !== term.toLowerCase())].slice(0, RECENT_MAX);
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    // Storage blocked: recent searches are simply not kept.
  }
};

type Kind = 'recent' | 'popular' | 'product' | 'brand' | 'category';
interface Item { key: string; kind: Kind; label: string; hint?: string; productId?: string }

const ICONS: Record<Kind, React.ReactNode> = {
  recent: <Clock size={15} aria-hidden="true" />,
  popular: <TrendingUp size={15} aria-hidden="true" />,
  product: <Search size={15} aria-hidden="true" />,
  brand: <Tag size={15} aria-hidden="true" />,
  category: <Tag size={15} aria-hidden="true" />,
};
const TITLES: Record<Kind, string> = { recent: 'Recent searches', popular: 'Popular searches', product: 'Products', brand: 'Brands', category: 'Categories' };

export const HeaderSearch: React.FC<{ hints?: readonly string[]; className?: string; voice?: boolean }> = ({ hints, className = '', voice = true }) => {
  const { navigate } = useApp();
  const catalog = useLiveCatalog();
  const uid = useId();
  const listId = `hs-list-${uid.replace(/:/g, '')}`;
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [recent, setRecent] = useState<string[]>([]);

  const popular = useMemo(() => {
    const own = (hints ?? []).map((h) => String(h).replace(/^search (for )?/i, '').replace(/["…]|\.\.\./g, '').trim()).filter(Boolean);
    const fallback = Array.from(new Set(catalog.map((p) => p.brand))).slice(0, 6);
    return Array.from(new Set(own.length ? own : fallback)).slice(0, 6);
  }, [hints, catalog]);

  const items = useMemo<Item[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return [
        ...recent.map((t): Item => ({ key: `r-${t}`, kind: 'recent', label: t })),
        ...popular.map((t): Item => ({ key: `p-${t}`, kind: 'popular', label: t })),
      ];
    }
    const products = rankSuggestions(catalog, query, 5).map((p): Item => ({ key: `prod-${p.id}`, kind: 'product', label: p.name, hint: p.brand, productId: p.id }));
    const brands = Array.from(new Set(catalog.map((p) => p.brand))).filter((b) => b.toLowerCase().includes(q)).slice(0, 3).map((b): Item => ({ key: `b-${b}`, kind: 'brand', label: b, hint: 'Brand' }));
    const cats = Array.from(new Set(catalog.map((p) => p.category))).filter((c) => c && c.toLowerCase().includes(q)).slice(0, 3).map((c): Item => ({ key: `c-${c}`, kind: 'category', label: c, hint: 'Category' }));
    return [...products, ...brands, ...cats];
  }, [query, recent, popular, catalog]);

  useEffect(() => setActive(-1), [query, open]);

  // A press outside closes the list.
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
    };
  }, [open]);

  const submit = (text: string) => {
    const term = text.trim().slice(0, 100);
    setOpen(false);
    inputRef.current?.blur();
    if (!term) return;
    saveRecent(term);
    setQuery('');
    navigate('shop-search-filters', { q: term });
  };
  const choose = (item: Item) => {
    if (item.kind === 'product' && item.productId) {
      saveRecent(item.label);
      setOpen(false);
      setQuery('');
      inputRef.current?.blur();
      navigate('shop-product', { productId: item.productId });
    } else {
      submit(item.label);
    }
  };

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' && items.length) {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (i + 1) % items.length);
    } else if (e.key === 'ArrowUp' && items.length) {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (i <= 0 ? items.length - 1 : i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (open && active >= 0 && items[active]) choose(items[active]);
      else submit(query);
    } else if (e.key === 'Escape') {
      if (open) setOpen(false);
      else if (query) setQuery('');
      else inputRef.current?.blur();
    }
  };

  const focusOpen = () => {
    setRecent(readRecent());
    setOpen(true);
  };

  const showList = open && items.length > 0;
  let lastKind: Kind | null = null;

  return (
    <div className={`gv7-hsearch ${className}`} ref={wrapRef}>
      <div className="gv7-hsearch-field">
        <Search size={18} aria-hidden="true" className="gv7-hsearch-icon" />
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          className="gv7-hsearch-input"
          aria-label="Search products"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList && active >= 0 ? `${listId}-${active}` : undefined}
          autoComplete="off"
          enterKeyHint="search"
          maxLength={100}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={focusOpen}
          onClick={focusOpen}
          onKeyDown={onKey}
        />
        {!query && !open && (
          <span className="gv7-hsearch-hint" aria-hidden="true">
            <SearchHint hints={hints} />
          </span>
        )}
        {!query && open && <span className="gv7-hsearch-hint is-focus" aria-hidden="true">Search products, brands and concerns</span>}
        {query && (
          <button type="button" className="gv7-hsearch-clear" aria-label="Clear search" onMouseDown={(e) => e.preventDefault()} onClick={() => { setQuery(''); inputRef.current?.focus(); }}>
            <X size={16} aria-hidden="true" />
          </button>
        )}
        {voice && <VoiceSearchButton onResult={(text) => submit(text)} />}
      </div>

      {showList && (
        <ul id={listId} role="listbox" aria-label="Search suggestions" className="gv7-hsearch-list">
          {items.map((item, i) => {
            const title = item.kind !== lastKind ? TITLES[item.kind] : null;
            lastKind = item.kind;
            return (
              <React.Fragment key={item.key}>
                {title && <li role="presentation" className="gv7-hsearch-title">{title}</li>}
                <li
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={i === active}
                  className={`gv7-hsearch-row${i === active ? ' is-active' : ''}`}
                  onMouseDown={(e) => { e.preventDefault(); choose(item); }}
                  onMouseEnter={() => setActive(i)}
                >
                  {ICONS[item.kind]}
                  <span className="gv7-hsearch-label">{item.label}</span>
                  {item.hint && <small>{item.hint}</small>}
                </li>
              </React.Fragment>
            );
          })}
        </ul>
      )}
    </div>
  );
};
