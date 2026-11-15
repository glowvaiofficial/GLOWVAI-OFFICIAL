import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import type { BlockItem, BlockSettings, HeaderSettings, ItemBlockId } from '../lib/useHomeLayout';
import { accentVars } from '../mobile/accentTheme';
import { usePlaceholdersVisible } from './HomePlaceholders';
import '../styles/home-new-blocks.css';

// The blocks the admin designer added: festival strip, bank offers, cashback, partners, stories and sponsored. One component
// serves both homes; `wide` switches to the dense PC layout. Items come from the admin; an empty block shows nothing to
// customers (a labelled placeholder only in a staff preview). One colour rule: brand blue unless the admin sets an accent
// on the item (or section); the accent tints the item at rest and fills it on hover, focus and press.

const BRAND = '#0057FB';

const DEFAULT_TITLES: Record<ItemBlockId, string> = {
  'festival-strip': '',
  'bank-offers': 'Bank offers',
  cashback: 'Cashback',
  partners: 'Our partners',
  stories: 'Stories',
  sponsored: '',
};

const ARIA: Record<ItemBlockId, string> = {
  'festival-strip': 'Festival offers',
  'bank-offers': 'Bank offers',
  cashback: 'Cashback offers',
  partners: 'Partners',
  stories: 'Stories',
  sponsored: 'Sponsored',
};

const prefersReducedMotion = (): boolean => {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
};

// Item accent, else the section accent, else brand blue.
const styleFor = (settings: BlockSettings, item: BlockItem): React.CSSProperties => {
  const vars = accentVars(item.accent || settings.accent || BRAND) as Record<string, string>;
  if (settings.background) vars['--bg'] = settings.background;
  if (settings.textColor) vars['--fg'] = settings.textColor;
  return vars as React.CSSProperties;
};

const Thumb = ({ src }: { src: string }) => <img src={src} alt="" loading="lazy" decoding="async" />;

const nameOf = (item: BlockItem) => (item.sub ? `${item.label}, ${item.sub}` : item.label);

function Cards({ id, settings, onOpenLink }: { id: ItemBlockId; settings: BlockSettings; onOpenLink: (link: string) => void }) {
  return (
    <>
      {settings.items.map((item, i) => {
        const open = () => onOpenLink(item.link);
        const key = `${i}-${item.label}`;
        const style = styleFor(settings, item);
        switch (id) {
          case 'festival-strip':
            return (
              <button key={key} type="button" className="gvn-card gvn-chip" style={style} onClick={open} aria-label={nameOf(item)}>
                <span className="gvn-chip-media" aria-hidden="true">{item.image ? <Thumb src={item.image} /> : <Sparkles size={16} />}</span>
                <span className="gvn-chip-copy">
                  <b>{item.label}</b>
                  {item.sub && <small>{item.sub}</small>}
                </span>
              </button>
            );
          case 'bank-offers':
            return (
              <button key={key} type="button" className="gvn-card gvn-bank" style={style} onClick={open} aria-label={nameOf(item)}>
                {item.image && <span className="gvn-bank-logo" aria-hidden="true"><Thumb src={item.image} /></span>}
                <span className="gvn-bank-copy">
                  <b>{item.label}</b>
                  {item.sub && <small>{item.sub}</small>}
                </span>
              </button>
            );
          case 'cashback':
            return (
              <button key={key} type="button" className="gvn-card gvn-cash" style={style} onClick={open} aria-label={nameOf(item)}>
                {item.image && <span className="gvn-cash-media" aria-hidden="true"><Thumb src={item.image} /></span>}
                <span className="gvn-cash-copy">
                  <b>{item.label}</b>
                  {item.sub && <small>{item.sub}</small>}
                </span>
              </button>
            );
          case 'partners':
            return (
              <button key={key} type="button" className="gvn-card gvn-partner" style={style} onClick={open} aria-label={item.label}>
                {item.image ? <Thumb src={item.image} /> : <span>{item.label}</span>}
              </button>
            );
          case 'stories':
            return (
              <button key={key} type="button" className="gvn-card gvn-story" style={style} onClick={open} aria-label={nameOf(item)}>
                <span className="gvn-story-media" aria-hidden="true">{item.image ? <Thumb src={item.image} /> : <Sparkles size={28} />}</span>
                <span className="gvn-story-copy">
                  <b>{item.label}</b>
                  {item.sub && <small>{item.sub}</small>}
                </span>
              </button>
            );
          case 'sponsored':
            return (
              <button key={key} type="button" className="gvn-card gvn-spons" style={style} onClick={open} aria-label={`Sponsored. ${nameOf(item)}`}>
                {item.image && <span className="gvn-spons-media" aria-hidden="true"><Thumb src={item.image} /></span>}
                <span className="gvn-spons-copy">
                  <span className="gvn-spons-badge">Sponsored</span>
                  <b>{item.label}</b>
                  {item.sub && <small>Presented by {item.sub}</small>}
                </span>
              </button>
            );
        }
      })}
    </>
  );
}

export function NewItemBlock({ id, settings, wide, onOpenLink }: { id: ItemBlockId; settings?: BlockSettings; wide: boolean; onOpenLink: (link: string) => void }) {
  const preview = usePlaceholdersVisible();
  const rowRef = useRef<HTMLDivElement>(null);
  const items = settings?.items ?? [];
  if (items.length === 0) {
    if (!preview) return null;
    return (
      <section className={`gvn gvn-${id}${wide ? ' is-wide' : ''}`} aria-label={ARIA[id]}>
        <p className="gvn-placeholder">{ARIA[id]}: no items yet. Add them in the designer; this note shows only in a staff preview.</p>
      </section>
    );
  }
  const s = settings as BlockSettings;
  const title = s.title || DEFAULT_TITLES[id];
  const titleId = `gvn-${id}-title`;
  const scrollBy = (dir: number) => {
    const row = rowRef.current;
    if (row) row.scrollBy({ left: dir * Math.max(240, row.clientWidth * 0.8), behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  };
  return (
    <section className={`gvn gvn-${id}${wide ? ' is-wide' : ''}`} aria-labelledby={title ? titleId : undefined} aria-label={title ? undefined : ARIA[id]}>
      {title && (
        <div className="gvn-head">
          <h2 id={titleId}>{title}</h2>
          {id === 'stories' && wide && items.length > 4 && (
            <span className="gvn-arrows">
              <button type="button" onClick={() => scrollBy(-1)} aria-label="Previous stories"><ChevronLeft size={18} aria-hidden="true" /></button>
              <button type="button" onClick={() => scrollBy(1)} aria-label="Next stories"><ChevronRight size={18} aria-hidden="true" /></button>
            </span>
          )}
        </div>
      )}
      <div ref={rowRef} className="gvn-row">
        <Cards id={id} settings={s} onOpenLink={onOpenLink} />
      </div>
    </section>
  );
}

// The delivery-mode switch in the header (for example Quick and Scheduled). Shown only when the admin turned it on and set at
// least one mode. A mode whose link is the current page is marked as the current one.
export function DeliveryModeSwitch({ header, wide }: { header: HeaderSettings; wide?: boolean }) {
  if (!header.showDeliveryModes || header.deliveryModes.length === 0) return null;
  let here = '';
  try {
    here = window.location.pathname + window.location.search;
  } catch {
    // No current page known.
  }
  return (
    <div className={`gvn-modes${wide ? ' is-wide' : ''}`} role="group" aria-label="Delivery mode">
      {header.deliveryModes.map((m) => {
        const current = m.link !== '' && (m.link === here || m.link === here.split('?')[0]);
        return (
          <button
            key={`${m.label}-${m.link}`}
            type="button"
            className={`gvn-mode${current ? ' is-on' : ''}`}
            aria-current={current ? 'true' : undefined}
            onClick={() => {
              if (m.link) window.location.assign(m.link);
            }}
          >
            {m.label}
          </button>
        );
      })}
    </div>
  );
}
