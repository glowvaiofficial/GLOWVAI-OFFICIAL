import React, { useMemo } from 'react';
import { Bell, Minus, Plus } from 'lucide-react';
import { useLiveCatalog } from '../../../core/data/indianSkincareCatalog';
import type { SkincareProduct } from '../../../core/data/indianSkincareCatalog';
import { useCartStore } from '../../../core/state/cartStore';
import { badgeSets, badgesFor, isSoldOut, stockBar } from '../lib/designerStyle';
import { useBlockStyle, useDesigner } from './DesignerStyle';

// What a product card gets from its section's style. Outside a styled block (or when nothing here applies) every part is
// null and the card draws exactly as before. The card calls this once and drops the parts into its own markup:
//   cls      extra class names for the <article>
//   overlay  badges, the sold-out tag and the quick-add button, placed inside the picture
//   extra    the "Almost gone" stock bar, placed above the card's foot
//   foot     replaces the card's add control (stepper card, sold-out card); null keeps the original
export interface DesignerCardParts {
  cls: string;
  overlay: React.ReactNode;
  extra: React.ReactNode;
  foot: React.ReactNode;
  soldOut: boolean;
}

const NONE: DesignerCardParts = { cls: '', overlay: null, extra: null, foot: null, soldOut: false };

export function useDesignerCard(product: SkincareProduct, opts: { discount: number; hasOptions: boolean; add: () => void; open: () => void; names: { add: string } }): DesignerCardParts {
  const style = useBlockStyle();
  const { notify } = useDesigner();
  const catalog = useLiveCatalog();
  const qty = useCartStore((s) => s.items[product.id]?.quantity ?? 0);
  const inc = useCartStore((s) => s.incrementItem);
  const dec = useCartStore((s) => s.decrementItem);
  const wantsBadges = !!style?.badges && style.badges.length > 0;
  const sets = useMemo(() => (wantsBadges ? badgeSets(catalog) : { fresh: new Set<string>(), best: new Set<string>() }), [wantsBadges, catalog]);

  // Only a section with a card style takes part (the sold-out card is part of every card style).
  if (!style || (!style.card && !style.badges && !style.stockBar)) return NONE;

  const soldOut = !!style.card && isSoldOut(product);
  const badges = wantsBadges ? badgesFor(product, style.badges!, sets, opts.discount) : [];
  const bar = style.stockBar && !soldOut ? stockBar(product) : null;
  const classes = [style.card ? `gvd-card is-${style.card}` : 'gvd-card', soldOut ? 'is-soldout' : ''].filter(Boolean).join(' ');

  const notifyMe = () => notify('Noted. This item is out of stock right now, please check back soon.');
  const overlay = (
    <>
      {badges.length > 0 && (
        <span className="gvd-badges">
          {badges.map((b) => (
            <span key={b.key} className={`gvd-badge is-${b.key}`}>
              {b.label}
            </span>
          ))}
        </span>
      )}
      {soldOut && <span className="gvd-soldout-tag">Sold out</span>}
      {!soldOut && style.card === 'quick-add' && (
        <button type="button" className="gvd-quick" onClick={opts.hasOptions ? opts.open : opts.add} aria-label={opts.names.add}>
          <Plus size={18} aria-hidden="true" />
        </button>
      )}
    </>
  );
  const extra = bar ? (
    <span className="gvd-stockbar" role="img" aria-label={`Almost gone: only ${bar.left} left`}>
      <span className="gvd-stockbar-track">
        <span className="gvd-stockbar-fill" style={{ width: `${bar.pct}%` }} />
      </span>
      <small>Almost gone: only {bar.left} left</small>
    </span>
  ) : null;

  let foot: React.ReactNode = null;
  if (soldOut) {
    foot = (
      <button type="button" className="gvd-notify" onClick={notifyMe}>
        <Bell size={14} aria-hidden="true" /> Notify me
      </button>
    );
  } else if (style.card === 'stepper' && !opts.hasOptions) {
    foot = (
      <span className="gvd-stepper" role="group" aria-label={`${product.name}: ${qty} in bag`}>
        <button type="button" onClick={() => dec(product.id)} disabled={qty === 0} aria-label={`Remove one ${product.name}`}>
          <Minus size={14} aria-hidden="true" />
        </button>
        <b aria-hidden="true">{qty}</b>
        <button type="button" onClick={() => (qty === 0 ? opts.add() : inc(product.id))} aria-label={`Add one ${product.name}`}>
          <Plus size={14} aria-hidden="true" />
        </button>
      </span>
    );
  }
  return { cls: classes, overlay, extra, foot, soldOut };
}
