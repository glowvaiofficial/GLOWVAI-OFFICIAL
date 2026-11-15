import React, { useEffect, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { pickPromos } from '../orderProgress';

// Banners the GlowVai team published for the shop home (GET /api/shop/home, the same list the home's carousel shows),
// reused on the tracking page. Sponsored banners are left out; nothing shows when none is live or the request fails.
type HomeSection = {
  id: string;
  kind: string;
  title: string;
  subtitle: string;
  ctaLabel: string;
  link: string;
  image: string;
  background: string;
  textColor: string;
};

const isInternal = (link: string) => link.startsWith('/') && !link.startsWith('//');

export function useTrackingPromos(count: number): HomeSection[] {
  const [sections, setSections] = useState<HomeSection[]>([]);
  useEffect(() => {
    let alive = true;
    fetch('/api/shop/home', { credentials: 'same-origin', cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (alive && data && Array.isArray(data.sections)) setSections(data.sections as HomeSection[]);
      })
      .catch(() => {
        // No promos is a normal state.
      });
    return () => {
      alive = false;
    };
  }, []);
  return pickPromos(sections, count);
}

export const TrackingPromoCard: React.FC<{ section: HomeSection }> = ({ section: s }) => (
  <a
    className={`trk-promo${s.image ? ' has-image' : ''}`}
    href={isInternal(s.link) ? s.link : '/shop'}
    style={{ background: s.background || undefined, color: s.textColor || undefined }}
  >
    {s.image && <img src={s.image} alt="" loading="lazy" decoding="async" />}
    <span className="trk-promo-copy">
      <b>{s.title}</b>
      {s.subtitle && <small>{s.subtitle}</small>}
      <span className="trk-promo-cta">
        {s.ctaLabel || 'Shop now'} <ChevronRight size={15} aria-hidden="true" />
      </span>
    </span>
  </a>
);
