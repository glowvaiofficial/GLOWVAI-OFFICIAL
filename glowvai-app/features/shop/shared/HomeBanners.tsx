import React, { useEffect, useState } from 'react';

// Banners the GlowVai team publishes from the admin panel (siteContent/home). Shows nothing when no banner is live,
// so the page looks the same as before until a banner is published. A banner with a picture uses it as its background.
// Links are internal paths only (checked on the server as well).

type HomeBanner = {
  id: string;
  kind: 'banner' | 'offer' | 'festival';
  title: string;
  subtitle: string;
  ctaLabel: string;
  link: string;
  image: string;
  background: string;
  textColor: string;
};

const isInternal = (link: string) => link.startsWith('/') && !link.startsWith('//');

export const HomeBanners: React.FC = () => {
  const [banners, setBanners] = useState<HomeBanner[]>([]);

  useEffect(() => {
    let alive = true;
    fetch('/api/shop/home', { credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (alive && data && Array.isArray(data.sections)) setBanners(data.sections as HomeBanner[]);
      })
      .catch(() => {
        // No banners is a normal state: the page keeps its usual content.
      });
    return () => {
      alive = false;
    };
  }, []);

  if (banners.length === 0) return null;

  return (
    <section className="shop-home-banners" aria-label="Offers and announcements" style={{ display: 'grid', gap: 12, padding: '12px 16px' }}>
      {banners.map((b) => (
        <a
          key={b.id}
          href={isInternal(b.link) ? b.link : '/shop'}
          data-kind={b.kind}
          style={{
            position: 'relative',
            display: 'flex',
            minHeight: 120,
            alignItems: 'center',
            borderRadius: 16,
            overflow: 'hidden',
            background: b.background,
            color: b.textColor,
            textDecoration: 'none',
            padding: '18px 20px',
            backgroundImage: b.image ? `url(${b.image})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <span style={{ display: 'grid', gap: 4, maxWidth: 360 }}>
            <strong style={{ fontSize: 20, lineHeight: 1.2 }}>{b.title}</strong>
            {b.subtitle && <span style={{ fontSize: 14, opacity: 0.92 }}>{b.subtitle}</span>}
            {b.ctaLabel && (
              <span style={{ marginTop: 8, alignSelf: 'start', borderRadius: 999, background: '#fff', color: '#111', padding: '6px 14px', fontSize: 14, fontWeight: 700 }}>
                {b.ctaLabel}
              </span>
            )}
          </span>
        </a>
      ))}
    </section>
  );
};
