import React, { useEffect, useState } from 'react';
import '../styles/home-placeholders.css';

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
export function MiniBannersPlaceholder() {
  if (!usePlaceholdersVisible()) return null;
  return (
    <section className="hp-section" aria-label="Featured promotions">
      <div className="hp-grid">
        {['Mini banner 1', 'Mini banner 2', 'Mini banner 3'].map((t) => (
          <div key={t} className="hp-card"><Tag>Placeholder</Tag><strong>{t}</strong><span>Picture and link set in the designer.</span></div>
        ))}
      </div>
    </section>
  );
}

// 2. Offers strip: coupons, cashback and bank offers, as chips.
export function OffersStripPlaceholder() {
  if (!usePlaceholdersVisible()) return null;
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
      <div className="hp-grid">
        {[1, 2, 3, 4].map((i) => <div key={i} className="hp-skel" aria-hidden="true" />)}
      </div>
    </section>
  );
}

// 4. Buy it again: the customer's past products (signed-in only; placeholder until then).
export function ReorderPlaceholder() {
  if (!usePlaceholdersVisible()) return null;
  return (
    <section className="hp-section" aria-label="Buy it again">
      <div className="hp-head"><h2 className="hp-title">Buy it again</h2><p className="hp-sub">Shows your past orders after you sign in.</p></div>
      <div className="hp-grid">{[1, 2, 3].map((i) => <div key={i} className="hp-skel" aria-hidden="true" />)}</div>
    </section>
  );
}

// 5. Top brands strip.
export function BrandStripPlaceholder() {
  if (!usePlaceholdersVisible()) return null;
  return (
    <section className="hp-section" aria-label="Top brands">
      <div className="hp-head"><h2 className="hp-title">Top brands</h2></div>
      <div className="hp-brands">{[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="hp-brand">Brand logo</div>)}</div>
    </section>
  );
}

// 6. Trust block: delivery, quality and returns, in three equal blocks.
export function TrustBlockPlaceholder() {
  if (!usePlaceholdersVisible()) return null;
  return (
    <section className="hp-section" aria-label="Why shop with us">
      <div className="hp-grid">
        {['Delivery promise', 'Quality promise', 'Returns promise'].map((t) => (
          <div key={t} className="hp-card"><Tag>Placeholder</Tag><strong>{t}</strong><span>Wording set by the team.</span></div>
        ))}
      </div>
    </section>
  );
}

// 7. Help strip and gift or referral card.
export function HelpGiftPlaceholder() {
  if (!usePlaceholdersVisible()) return null;
  return (
    <section className="hp-section" aria-label="Help, gifts and referrals">
      <div className="hp-grid">
        <div className="hp-card"><Tag>Placeholder</Tag><strong>Need help?</strong><span>Support channels set by the team.</span></div>
        <div className="hp-card"><Tag>Placeholder</Tag><strong>Gift cards</strong><span>Gift card banner.</span></div>
        <div className="hp-card"><Tag>Placeholder</Tag><strong>Refer and earn</strong><span>Referral banner.</span></div>
      </div>
    </section>
  );
}
