import React from 'react';
import { AlertTriangle, ArrowLeft, BadgePercent, ChevronRight, Headset, MapPin, Package, ShieldCheck, ShoppingBag, Tag, Truck, Wallet } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { CartTotals } from '../lib/pricing';
import type { DeliveryAddress } from '../lib/addressStore';
import { formatAddressForDisplay } from '../lib/displayText';

// Building blocks of the premium cart, checkout and payment screens (styles in ../premium.css, all under .gvp). They show
// only what they are given: totals come from computeCartTotals (the server's bag quote applied), never from here.

export const rupee = (n: number): string => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;

// The GlowVai wordmark, as text (the app ships no logo image for it).
export const Wordmark: React.FC<{ className?: string }> = ({ className }) => (
  <span className={`gvp-wordmark${className ? ` ${className}` : ''}`} aria-label="GlowVai">
    glowvai
  </span>
);

interface HeaderProps {
  title?: string;
  /** Shows the wordmark in place of a title (the cart). */
  brand?: boolean;
  subtitle?: React.ReactNode;
  onBack?: () => void;
  backLabel?: string;
  right?: React.ReactNode;
}

export const PremiumHeader: React.FC<HeaderProps> = ({ title, brand, subtitle, onBack, backLabel = 'Go back', right }) => (
  <header className="gvp-head">
    {onBack && (
      <button type="button" className="gvp-round" onClick={onBack} aria-label={backLabel}>
        <ArrowLeft size={20} aria-hidden="true" />
      </button>
    )}
    <div className="gvp-head-copy">
      {brand ? <Wordmark /> : <h1>{title}</h1>}
      {brand && title && <h1 className="gvp-sr">{title}</h1>}
      {subtitle && <p>{subtitle}</p>}
    </div>
    {right}
  </header>
);

// The delivery address block: name, address and landmark, with Change. Missing or out-of-area addresses say so plainly.
export const AddressBlock: React.FC<{
  address: DeliveryAddress | null;
  heading: string;
  onChange: () => void;
  onAdd: () => void;
  /** 'inline': the cart's compact row. 'panel': checkout's card with an inner tinted panel. */
  variant?: 'inline' | 'panel';
}> = ({ address, heading, onChange, onAdd, variant = 'inline' }) => {
  if (!address) {
    return (
      <section className="gvp-card gvp-address is-missing" aria-label={heading}>
        <span className="gvp-address-pin" aria-hidden="true">
          <MapPin size={20} />
        </span>
        <div className="gvp-address-copy">
          <small>{heading}</small>
          <b>No delivery address yet</b>
          <p>Add where this order should go to see delivery charges and continue.</p>
        </div>
        <button type="button" className="gvp-link" onClick={onAdd}>
          Add
        </button>
      </section>
    );
  }
  const body = (
    <>
      {address.recipientName && <b>{address.recipientName}</b>}
      <p>{formatAddressForDisplay(address.fullAddress)}</p>
      {address.landmark && <small className="gvp-muted">Landmark: {address.landmark}</small>}
    </>
  );
  return (
    <section className={`gvp-card gvp-address is-${variant}`} aria-label={heading}>
      {variant === 'panel' ? (
        <>
          <div className="gvp-card-head">
            <h2>
              <span className="gvp-address-pin is-small" aria-hidden="true">
                <MapPin size={16} />
              </span>
              {heading}
            </h2>
            <button type="button" className="gvp-link" onClick={onChange}>
              Change
            </button>
          </div>
          <button type="button" className="gvp-address-panel" onClick={onChange} aria-label={`Change delivery address. Now: ${address.recipientName ? `${address.recipientName}, ` : ''}${formatAddressForDisplay(address.fullAddress)}`}>
            <span className="gvp-address-copy">{body}</span>
            <ChevronRight size={18} aria-hidden="true" />
          </button>
        </>
      ) : (
        <>
          <span className="gvp-address-pin" aria-hidden="true">
            <MapPin size={20} />
          </span>
          <div className="gvp-address-copy">
            <small>{heading}</small>
            {body}
          </div>
          <button type="button" className="gvp-link" onClick={onChange}>
            Change
          </button>
        </>
      )}
      {!address.serviceable && (
        <p className="gvp-warn" role="alert">
          <AlertTriangle size={14} aria-hidden="true" /> We deliver only to Vijayawada pincodes (520xxx) right now. Choose another address to continue.
        </p>
      )}
    </section>
  );
};

// Product image with a soft tile behind it; a bag icon when there is no image or it fails.
export const Thumb: React.FC<{ src?: string | null; size?: 'md' | 'lg'; children?: React.ReactNode }> = ({ src, size = 'lg', children }) => (
  <span className={`gvp-thumb is-${size}`}>
    {src ? <img src={src} alt="" loading="lazy" decoding="async" onError={(e) => (e.currentTarget.style.display = 'none')} /> : <ShoppingBag size={22} aria-hidden="true" />}
    {children}
  </span>
);

// Free delivery progress: the ₹ still needed (above FREE_DELIVERY_ABOVE), or that this order already has it.
export const FreeDeliveryCard: React.FC<{ totals: CartTotals; threshold: number }> = ({ totals, threshold }) => (
  <section className={`gvp-card gvp-freedel${totals.isFreeDelivery ? ' is-done' : ''}`} aria-label="Free delivery">
    <span className="gvp-freedel-icon" aria-hidden="true">
      <Truck size={22} />
    </span>
    <div className="gvp-freedel-copy">
      <b>{totals.isFreeDelivery ? 'Yay! You get free delivery on this order' : `Add ${rupee(totals.amountNeededForFreeDelivery)} more to get Free Delivery`}</b>
      <div
        className="gvp-progress"
        role="progressbar"
        aria-label="Progress to free delivery"
        aria-valuemin={0}
        aria-valuemax={threshold + 1}
        aria-valuenow={Math.min(threshold + 1, totals.discountedTotal)}
      >
        <span style={{ width: `${Math.round(totals.freeDeliveryProgress * 100)}%` }} />
      </div>
      {!totals.isFreeDelivery && <small>Free delivery on orders above {rupee(threshold)}</small>}
    </div>
  </section>
);

interface SummaryProps {
  totals: CartTotals;
  tip?: number;
  totalLabel?: string;
  /** Icons beside each row (checkout's order summary). */
  withIcons?: boolean;
  /** Shown under the rows when the delivery charge depends on the address that is not chosen yet. */
  note?: React.ReactNode;
  children?: React.ReactNode;
}

const Row: React.FC<{ Icon?: LucideIcon; label: React.ReactNode; value: React.ReactNode; tone?: 'save' | 'free' }> = ({ Icon, label, value, tone }) => (
  <div className={`gvp-sum-row${tone ? ` is-${tone}` : ''}`}>
    <dt>
      {Icon && <Icon size={17} aria-hidden="true" />}
      {label}
    </dt>
    <dd>{value}</dd>
  </div>
);

// The order summary every step shows, so the cart, checkout and payment agree: MRP total, product discount, coupon or
// automatic offer, flash sale, delivery, tip and the total.
export const PriceSummary: React.FC<SummaryProps> = ({ totals, tip = 0, totalLabel = 'Total', withIcons = false, note, children }) => (
  <div className="gvp-sum">
    <dl>
      <Row Icon={withIcons ? Package : undefined} label={`Price (${totals.itemCount} ${totals.itemCount === 1 ? 'item' : 'items'})`} value={rupee(totals.itemTotal)} />
      {totals.catalogSavings > 0 && <Row Icon={withIcons ? BadgePercent : undefined} label="Discount" value={`−${rupee(totals.catalogSavings)}`} tone="save" />}
      {totals.couponDiscount > 0 && (
        <Row Icon={withIcons ? Tag : undefined} label={totals.couponCode ? `Coupon (${totals.couponCode})` : 'Offer'} value={`−${rupee(totals.couponDiscount)}`} tone="save" />
      )}
      {totals.flashSavings > 0 && <Row Icon={withIcons ? BadgePercent : undefined} label="Flash sale" value={`−${rupee(totals.flashSavings)}`} tone="save" />}
      <Row Icon={withIcons ? Truck : undefined} label="Delivery Charges" value={totals.deliveryFee === 0 ? 'FREE' : rupee(totals.deliveryFee)} tone={totals.deliveryFee === 0 ? 'free' : undefined} />
      {tip > 0 && <Row Icon={withIcons ? Wallet : undefined} label="Delivery partner tip" value={rupee(tip)} />}
      <div className="gvp-sum-total">
        <dt>{totalLabel}</dt>
        <dd>{rupee(totals.grandTotal + tip)}</dd>
      </div>
    </dl>
    {note && <p className="gvp-sum-note">{note}</p>}
    {children}
  </div>
);

// Green savings line: the real total saved on this order (product discount, coupon or offer, flash sale).
export const SavingsBanner: React.FC<{ totals: CartTotals; onClick?: () => void; sub?: string }> = ({ totals, onClick, sub }) => {
  if (totals.totalSavings <= 0) return null;
  const detail = sub ?? (totals.couponCode ? `${totals.couponCode} applied` : totals.offerLabel ? totals.offerLabel : 'Product discounts applied');
  const inner = (
    <>
      <span className="gvp-save-icon" aria-hidden="true">
        <Tag size={18} />
      </span>
      <span className="gvp-save-copy">
        <b>You saved {rupee(totals.totalSavings)} on this order</b>
        <small>{detail}</small>
      </span>
      {onClick && <ChevronRight size={18} aria-hidden="true" />}
    </>
  );
  return onClick ? (
    <button type="button" className="gvp-save" onClick={onClick}>
      {inner}
    </button>
  ) : (
    <div className="gvp-save" role="status">
      {inner}
    </div>
  );
};

export const HelpRow: React.FC<{ onClick: () => void; title?: string; sub?: string }> = ({ onClick, title = 'Need help?', sub = 'Talk to our support team for any queries.' }) => (
  <button type="button" className="gvp-help" onClick={onClick}>
    <span className="gvp-help-icon" aria-hidden="true">
      <Headset size={18} />
    </span>
    <span className="gvp-help-copy">
      <b>{title}</b>
      <small>{sub}</small>
    </span>
    <ChevronRight size={18} aria-hidden="true" />
  </button>
);

export const SecureNote: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <p className="gvp-secure">
    <ShieldCheck size={16} aria-hidden="true" />
    <span>{children ?? 'Payments are processed securely by Razorpay. GlowVai never stores your card or UPI details.'}</span>
  </p>
);

// The empty cart and other "nothing here" states.
export const EmptyState: React.FC<{ Icon: LucideIcon; title: string; body: string; action: string; onAction: () => void }> = ({ Icon, title, body, action, onAction }) => (
  <div className="gvp-card gvp-empty">
    <span className="gvp-empty-icon" aria-hidden="true">
      <Icon size={30} />
    </span>
    <h2>{title}</h2>
    <p>{body}</p>
    <button type="button" className="gvp-btn" onClick={onAction}>
      {action}
    </button>
  </div>
);
