import React from 'react';
import { ArrowUp, Banknote, Clock, RotateCcw, Truck } from 'lucide-react';
import { siteConfig } from '../../../../config/site';
import { FREE_DELIVERY_ABOVE } from '../../../shared/pricing-rules.mjs';
import { RETURN_WINDOW_DAYS } from '@/lib/shop/settings/rules';
import { BrandLogo } from '../../../shared/BrandLogo';
import type { ScreenName } from '../../../context/contextDefinition';
import { HOME_FOOTER_GROUPS, configuredSocials, mergeFooterSocials } from '../lib/homeModel';
import type { FooterDetails } from '../lib/useHomeLayout';

// The home's closing block for the phone and the PC home. Brand and promise, a trust row of facts the product already
// has (delivery area, free delivery rule, cash on delivery, return window), link groups to real pages, and, only when the
// admin's footer settings (or the site config) give an https address, social links and store badges.
type IconType = React.ComponentType<{ size?: number; 'aria-hidden'?: boolean }>;

const TRUST: { Icon: IconType; label: string; sub: string }[] = [
  { Icon: Clock, label: 'Delivery in Vijayawada', sub: 'To your door' },
  { Icon: Truck, label: 'Free delivery', sub: `On orders above ₹${FREE_DELIVERY_ABOVE}` },
  { Icon: Banknote, label: 'Cash on delivery', sub: 'Or pay online, securely' },
  { Icon: RotateCcw, label: 'Easy returns', sub: `${RETURN_WINDOW_DAYS}-day return window` },
];

interface Props {
  variant: 'desk' | 'phone';
  footer: FooterDetails;
  categories: { id: string; label: string }[];
  onNavigate: (screen: ScreenName, params?: Record<string, string>) => void;
}

export function ShopHomeFooter({ variant, footer, categories, onNavigate }: Props) {
  const socials = configuredSocials(mergeFooterSocials(siteConfig.socials, footer));
  const stores = [
    { label: 'App Store', sub: 'Download on the', url: footer.appStoreUrl },
    { label: 'Google Play', sub: 'Get it on', url: footer.playStoreUrl },
  ].filter((s) => s.url !== '');
  const toTop = () => {
    const reduce = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  };

  return (
    <footer className={`gv7f is-${variant}`} aria-label="Site footer">
      <div className="gv7f-wrap">
        <div className="gv7f-brand">
          <BrandLogo height={variant === 'desk' ? 34 : 30} />
          <p className="gv7f-tag">The Beauty Destination for Every Indian</p>
        </div>

        <ul className="gv7f-trust" aria-label="Why shop with GlowVai">
          {TRUST.map(({ Icon, label, sub }) => (
            <li key={label}>
              <Icon size={20} aria-hidden={true} />
              <span><strong>{label}</strong><small>{sub}</small></span>
            </li>
          ))}
        </ul>

        <nav className="gv7f-cols" aria-label="Footer links">
          {HOME_FOOTER_GROUPS.map((group) => (
            <section key={group.title} className="gv7f-col">
              <h3>{group.title}</h3>
              <ul>
                {group.links.map((link) => (
                  <li key={link.label}>
                    {'href' in link ? (
                      <a href={link.href}>{link.label}</a>
                    ) : (
                      <button type="button" onClick={() => onNavigate(link.screen, link.params)}>{link.label}</button>
                    )}
                  </li>
                ))}
                {group.title === 'Shop' && categories.map(({ id, label }) => (
                  <li key={id}>
                    <button type="button" onClick={() => onNavigate('shop-category', { categoryId: id })}>{label}</button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </nav>

        {(socials.length > 0 || stores.length > 0) && (
          <div className="gv7f-reach">
            {socials.length > 0 && (
              <ul className="gv7f-social" aria-label="Follow GlowVai">
                {socials.map((s) => (
                  <li key={s.label}>
                    <a href={s.url} target="_blank" rel="noopener noreferrer" aria-label={`GlowVai on ${s.label}`}>{s.label}</a>
                  </li>
                ))}
              </ul>
            )}
            {stores.length > 0 && (
              <ul className="gv7f-stores" aria-label="Get the app">
                {stores.map((s) => (
                  <li key={s.label}>
                    <a href={s.url} target="_blank" rel="noopener noreferrer" aria-label={`${s.sub} ${s.label}`}>
                      <small>{s.sub}</small>
                      <strong>{s.label}</strong>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="gv7f-bottom">
          <span>© {new Date().getFullYear()} GlowVai</span>
          {footer.companyLine !== '' && <span>{footer.companyLine}</span>}
          {variant === 'desk' && (
            <button type="button" className="gv7f-top" onClick={toTop}>
              <ArrowUp size={16} aria-hidden={true} />
              Back to top
            </button>
          )}
        </div>
      </div>
    </footer>
  );
}
