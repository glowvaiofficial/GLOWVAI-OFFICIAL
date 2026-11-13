import React, { useEffect, useState } from 'react';
import '../styles/home-placeholders.css';
import type { BlockSettings } from '../lib/useHomeLayout';

// Shows a block with the content the admin published. Used once the block has at least one item.
function LiveBlock({ kind, settings, fallbackTitle, aria }: { kind: 'cards' | 'chips' | 'tiles'; settings: BlockSettings; fallbackTitle: string; aria: string }) {
  const style: React.CSSProperties = {};
  if (settings.background) style.background = settings.background;
  if (settings.textColor) style.color = settings.textColor;
  const title = settings.title || fallbackTitle;
  return (
    <section className="hp-section" aria-label={aria}>
      {title && <div className="hp-head"><h2 className="hp-title">{title}</h2></div>}
      <div className={kind === 'tiles' ? 'hp-brands' : kind === 'chips' ? 'hp-grid is-three' : 'hp-grid is-three'} style={{ ...style }}>
        {settings.items.map((item, i) => {
          const pic = item.image || '';
          const inner = kind === 'tiles' ? (
            pic ? (
              <span className="hp-brand hp-brand-pic" style={style}><img src={pic} alt={item.label} /></span>
            ) : (
              <span className="hp-brand" style={style}>{item.label}</span>
            )
          ) : kind === 'chips' ? (
            // The label sits next to the picture, so the picture is decorative (empty alt).
            <span className="hp-chip" style={style}>{pic ? <img className="hp-dot hp-dot-img" src={pic} alt="" /> : <span className="hp-dot" />}<span><b>{item.label}</b>{item.sub && <small>{item.sub}</small>}</span></span>
          ) : pic ? (
            // The label is printed on the card, so the background picture is decorative. The gradient keeps the text readable.
            <span className="hp-card hp-card-pic" style={{ backgroundImage: `linear-gradient(to top, rgba(0,0,0,.75), rgba(0,0,0,.05) 65%), url("${pic}")` }}><strong>{item.label}</strong>{item.sub && <span>{item.sub}</span>}</span>
          ) : (
            <span className="hp-card" style={{ ...style, background: settings.background || undefined }}><strong>{item.label}</strong>{item.sub && <span>{item.sub}</span>}</span>
          );
          return item.link ? <a key={i} href={item.link} style={{ textDecoration: 'none', color: 'inherit' }}>{inner}</a> : <div key={i}>{inner}</div>;
        })}
      </div>
    </section>
  );
}

// Home page sections the GlowVai team fills in from the admin designer. Each one is a placeholder block until its content
// is published. Placeholders show only in a staff preview (the preview link carries ?preview=...), so customers never see
// an empty slot. Once a slot has published content, it shows for everyone.

const isStaffPreview = (): boolean => {
  try {
    return new URLSearchParams(window.location.search).has('preview');
  } catch {
    return false;
  }
};

// Only in a staff preview. On the live page these blocks stay hidden until their content is published.
export function usePlaceholdersVisible(): boolean {
  const [visible, setVisible] = useState(false);
  useEffect(() => setVisible(isStaffPreview()), []);
  return visible;
}

const Tag: React.FC<{ children: React.ReactNode }> = ({ children }) => <span className="hp-tag">{children}</span>;

// 1. Mini banners: three equal promo slots under the hero.
export function MiniBannersPlaceholder({ settings }: { settings?: BlockSettings }) {
  const visible = usePlaceholdersVisible();
  if (settings && settings.items.length > 0) return <LiveBlock kind='cards' settings={settings} fallbackTitle='' aria='Featured promotions' />;
  if (!visible) return null;
  return (
    <section className="hp-section" aria-label="Featured promotions">
      <div className="hp-grid is-three">
        {['Mini banner 1', 'Mini banner 2', 'Mini banner 3'].map((t) => (
          <div key={t} className="hp-card"><Tag>Placeholder</Tag><strong>{t}</strong><span>Picture and link set in the designer.</span></div>
        ))}
      </div>
    </section>
  );
}

// 2. Offers strip: coupons, cashback and bank offers, as chips.
export function OffersStripPlaceholder({ settings }: { settings?: BlockSettings }) {
  const visible = usePlaceholdersVisible();
  if (settings && settings.items.length > 0) return <LiveBlock kind='chips' settings={settings} fallbackTitle='' aria='Offers' />;
  if (!visible) return null;
  return (
    <section className="hp-section" aria-label="Offers">
      <div className="hp-chips">
        {['Coupon offer', 'Cashback offer', 'Bank or wallet offer'].map((t) => (
          <div key={t} className="hp-chip"><span className="hp-dot" /><div><b>{t}</b><small>Offer text set in the designer.</small></div></div>
        ))}
      </div>
    </section>
  );
}

// 3. Deals of the day, with a countdown to the end of the IST day (computed locally, no server time needed).
function secondsToIstMidnight(now: Date): number {
  const ist = new Date(now.getTime() + 5.5 * 3600_000);
  const next = Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate() + 1);
  return Math.max(0, Math.floor((next - ist.getTime()) / 1000));
}

export function FlashDealsPlaceholder() {
  const visible = usePlaceholdersVisible();
  const [left, setLeft] = useState(() => secondsToIstMidnight(new Date()));
  useEffect(() => {
    const id = window.setInterval(() => setLeft(secondsToIstMidnight(new Date())), 1000);
    return () => window.clearInterval(id);
  }, []);
  if (!visible) return null;
  const h = String(Math.floor(left / 3600)).padStart(2, '0');
  const m = String(Math.floor((left % 3600) / 60)).padStart(2, '0');
  const s = String(left % 60).padStart(2, '0');
  return (
    <section className="hp-section" aria-label="Deals of the day">
      <div className="hp-head"><h2 className="hp-title">Deals of the day</h2><span className="hp-timer">Ends in {h}:{m}:{s}</span></div>
      <div className="hp-grid hp-grid-4">
        {[1, 2, 3, 4].map((i) => <div key={i} className="hp-skel" aria-hidden="true" />)}
      </div>
    </section>
  );
}

// 4. Buy it again: the customer's past products (signed-in only; placeholder until then).
export function ReorderPlaceholder({ settings: _settings }: { settings?: BlockSettings } = {}) {
  if (!usePlaceholdersVisible()) return null;
  return (
    <section className="hp-section" aria-label="Buy it again">
      <div className="hp-head"><h2 className="hp-title">Buy it again</h2><p className="hp-sub">Shows your past orders after you sign in.</p></div>
      <div className="hp-grid is-three">{[1, 2, 3].map((i) => <div key={i} className="hp-skel" aria-hidden="true" />)}</div>
    </section>
  );
}

// 5. Top brands strip.
export function BrandStripPlaceholder({ settings }: { settings?: BlockSettings }) {
  const visible = usePlaceholdersVisible();
  if (settings && settings.items.length > 0) return <LiveBlock kind='tiles' settings={settings} fallbackTitle='Top brands' aria='Top brands' />;
  if (!visible) return null;
  return (
    <section className="hp-section" aria-label="Top brands">
      <div className="hp-head"><h2 className="hp-title">Top brands</h2></div>
      <div className="hp-brands">{[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="hp-brand">Brand logo</div>)}</div>
    </section>
  );
}

// 6. Trust block: delivery, quality and returns, in three equal blocks.
export function TrustBlockPlaceholder({ settings }: { settings?: BlockSettings }) {
  const visible = usePlaceholdersVisible();
  if (settings && settings.items.length > 0) return <LiveBlock kind='cards' settings={settings} fallbackTitle='' aria='Why shop with us' />;
  if (!visible) return null;
  return (
    <section className="hp-section" aria-label="Why shop with us">
      <div className="hp-grid is-three">
        {['Delivery promise', 'Quality promise', 'Returns promise'].map((t) => (
          <div key={t} className="hp-card"><Tag>Placeholder</Tag><strong>{t}</strong><span>Wording set by the team.</span></div>
        ))}
      </div>
    </section>
  );
}

// 7. Help strip and gift or referral card.
export function HelpGiftPlaceholder({ settings }: { settings?: BlockSettings }) {
  const visible = usePlaceholdersVisible();
  if (settings && settings.items.length > 0) return <LiveBlock kind='cards' settings={settings} fallbackTitle='' aria='Help, gifts and referrals' />;
  if (!visible) return null;
  return (
    <section className="hp-section" aria-label="Help, gifts and referrals">
      <div className="hp-grid is-three">
        <div className="hp-card"><Tag>Placeholder</Tag><strong>Need help?</strong><span>Support channels set by the team.</span></div>
        <div className="hp-card"><Tag>Placeholder</Tag><strong>Gift cards</strong><span>Gift card banner.</span></div>
        <div className="hp-card"><Tag>Placeholder</Tag><strong>Refer and earn</strong><span>Referral banner.</span></div>
      </div>
    </section>
  );
}

// Live flash sales: each sale with a countdown, the units left and the sale price per product. Shows nothing when no
// sale is running, so the page only carries a sale while it is on.
type FlashSaleView = {
  id: string;
  name: string;
  endsAt: number;
  discountPercent: number;
  remaining: number | null;
  items: { productId: string; name: string; price: number; salePrice: number }[];
};

const countdown = (ms: number): string => {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = String(Math.floor(total / 3600)).padStart(2, '0');
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
  const s = String(total % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
};

export function FlashSaleStrip() {
  const [sales, setSales] = useState<FlashSaleView[]>([]);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    let alive = true;
    fetch('/api/shop/flash-sales', { credentials: 'same-origin', cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (alive && d && Array.isArray(d.sales)) setSales(d.sales as FlashSaleView[]);
      })
      .catch(() => {
        // No sales shown when the list cannot be loaded.
      });
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, []);
  const live = sales.filter((s) => s.endsAt > now);
  if (live.length === 0) return null;
  return (
    <>
      {live.map((s) => (
        <section key={s.id} className="hp-section" aria-label={s.name}>
          <div className="hp-head">
            <h2 className="hp-title">{s.name}</h2>
            <span className="hp-timer">Ends in {countdown(s.endsAt - now)}</span>
          </div>
          {s.remaining !== null && <p className="hp-sub" style={{ margin: '0 16px 8px' }}>{s.remaining} left at this price</p>}
          <div className="hp-grid is-three">
            {s.items.map((i) => (
              <div key={i.productId} className="hp-card" style={{ background: '#fff', borderStyle: 'solid' }}>
                <span className="hp-tag">{s.discountPercent}% off</span>
                <strong>{i.name}</strong>
                <span>
                  <b style={{ color: 'var(--ds-ink)' }}>₹{i.salePrice}</b> <s>₹{i.price}</s>
                </span>
              </div>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
