import React, { useEffect, useState } from 'react';

// Banners the GlowVai team publishes from the admin panel (siteContent/home). Shows nothing when no banner is live,
// so the page looks the same as before until a banner is published. With more than one live banner they form a slide
// show: one at a time, sliding every few seconds, with dots to pick one. The slide show stops for people who prefer
// reduced motion, and pauses while the pointer is over it. A banner with a picture uses it as its background.
// Links are internal paths only (checked on the server as well).

type HomeBanner = {
  id: string;
  kind: 'banner' | 'offer' | 'festival' | 'sponsored';
  title: string;
  subtitle: string;
  ctaLabel: string;
  link: string;
  image: string;
  background: string;
  textColor: string;
};

const isInternal = (link: string) => link.startsWith('/') && !link.startsWith('//');
const SLIDE_MS = 5000;

// A staff preview link carries ?preview=<token> (minted by the admin panel). The page then shows the draft, and says so.
const readPreviewToken = (): string | null => {
  try {
    return new URLSearchParams(window.location.search).get('preview');
  } catch {
    return null;
  }
};

const reducedMotion = (): boolean => {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
};

export const HomeBanners: React.FC = () => {
  const [banners, setBanners] = useState<HomeBanner[]>([]);
  const [previewing, setPreviewing] = useState(false);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    let alive = true;
    const token = readPreviewToken();
    const url = token ? `/api/shop/home?preview=${encodeURIComponent(token)}` : '/api/shop/home';
    fetch(url, { credentials: 'same-origin', cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!alive || !data || !Array.isArray(data.sections)) return;
        setBanners(data.sections as HomeBanner[]);
        setPreviewing(Boolean(token && data.preview));
      })
      .catch(() => {
        // No banners is a normal state: the page keeps its usual content.
      });
    return () => {
      alive = false;
    };
  }, []);

  // Slide show: advance every few seconds, unless paused or the customer prefers less motion.
  useEffect(() => {
    if (banners.length < 2 || paused || reducedMotion()) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % banners.length), SLIDE_MS);
    return () => window.clearInterval(id);
  }, [banners.length, paused]);

  if (banners.length === 0 && !previewing) return null;

  const current = banners.length ? Math.min(index, banners.length - 1) : 0;

  return (
    <section
      className="shop-home-banners"
      aria-label="Offers and announcements"
      style={{ display: 'grid', gap: 10, padding: '12px 16px' }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {previewing && (
        <p role="status" style={{ margin: 0, borderRadius: 10, background: '#fff4d6', color: '#6b4a00', padding: '8px 12px', fontSize: 13, fontWeight: 700 }}>
          Staff preview: these banners are a draft and are not live for customers yet.
        </p>
      )}
      {banners.length === 0 && previewing && (
        <p style={{ margin: 0, color: '#6b7280', fontSize: 14 }}>The draft has no banners open right now.</p>
      )}
      {banners.length > 0 && (
        <div style={{ overflow: 'hidden', borderRadius: 16 }}>
          <div
            style={{
              display: 'flex',
              transform: `translateX(-${current * 100}%)`,
              transition: reducedMotion() ? 'none' : 'transform .6s cubic-bezier(.2,.7,.2,1)',
            }}
          >
            {banners.map((b, i) => (
              <a
                key={b.id}
                href={isInternal(b.link) ? b.link : '/shop'}
                data-kind={b.kind}
                aria-hidden={i !== current}
                tabIndex={i === current ? 0 : -1}
                style={{
                  flex: '0 0 100%',
                  boxSizing: 'border-box',
                  position: 'relative',
                  display: 'flex',
                  minHeight: 120,
                  alignItems: 'center',
                  borderRadius: 16,
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
                  {b.kind === 'sponsored' && (
                    <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase', opacity: 0.85 }}>Sponsored</span>
                  )}
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
          </div>
        </div>
      )}
      {banners.length > 1 && (
        <div role="tablist" aria-label="Choose a banner" style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
          {banners.map((b, i) => (
            <button
              key={b.id}
              type="button"
              role="tab"
              aria-selected={i === current}
              aria-label={`Show banner ${i + 1}: ${b.title}`}
              onClick={() => setIndex(i)}
              style={{ width: i === current ? 22 : 8, height: 8, borderRadius: 999, border: 0, padding: 0, background: i === current ? 'var(--ds-brand)' : 'var(--ds-line)', transition: 'width .3s ease' }}
            />
          ))}
        </div>
      )}
    </section>
  );
};
