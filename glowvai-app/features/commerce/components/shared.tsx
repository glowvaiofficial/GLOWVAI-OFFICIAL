import React from 'react';
import { AlertTriangle, ArrowLeft, Check, MapPin, Plus, Zap } from 'lucide-react';
import { useApp } from '../../../context/useApp';
import { useAddressStore, toDeliveryAddress, novAddressToDelivery, type DeliveryAddress } from '../lib/addressStore';
import type { CartTotals } from '../lib/pricing';

interface FlowHeaderProps {
  title: string;
  subtitle?: React.ReactNode;
  onBack: () => void;
  right?: React.ReactNode;
}

export const FlowHeader: React.FC<FlowHeaderProps> = ({ title, subtitle, onBack, right }) => (
  <header className="commerce-head">
    <button className="commerce-icon-btn" onClick={onBack} aria-label="Go back">
      <ArrowLeft size={20} />
    </button>
    <div className="commerce-head-copy">
      <h1>{title}</h1>
      {subtitle && <p>{subtitle}</p>}
    </div>
    {right}
  </header>
);

// Shows the area's delivery estimate when the address is in a known service area, otherwise neutral copy.
export const DeliveryPill: React.FC<{ minutes?: number }> = ({ minutes }) => (
  <span className="commerce-eta-pill">
    <Zap size={11} fill="currentColor" />
    {minutes ? `${minutes} min delivery` : 'Fast delivery'}
  </span>
);

const STEP_LABELS = ['Cart', 'Review', 'Pay'];

// Checkout progress: step is 1 (cart), 2 (review) or 3 (pay).
export const CheckoutSteps: React.FC<{ step: 1 | 2 | 3 }> = ({ step }) => (
  <ol className="commerce-steps" aria-label="Checkout progress">
    {STEP_LABELS.map((label, index) => {
      const n = index + 1;
      const state = n < step ? 'is-done' : n === step ? 'is-active' : '';
      return (
        <li key={label} className={state} aria-current={n === step ? 'step' : undefined}>
          <span>{n < step ? <Check size={12} /> : n}</span>
          <b>{label}</b>
        </li>
      );
    })}
  </ol>
);

// The sample addresses in data/serviceability.ts are placeholders, never the customer's own address.
const SAMPLE_ADDRESS_IDS = new Set(['addr-default-1', 'addr-work-2']);

// Selected saved address, then the header address the customer chose. Null when there is no real address yet.
export const useDeliveryAddress = (): DeliveryAddress | null => {
  const { currentAddress, customerDetails, user } = useApp();
  const saved = useAddressStore((s) => s.addresses.find((a) => a.id === s.selectedId));
  if (saved) return toDeliveryAddress(saved);
  if (!currentAddress || SAMPLE_ADDRESS_IDS.has(currentAddress.id) || !currentAddress.street?.trim() || !currentAddress.pincode?.trim()) {
    return null;
  }
  return novAddressToDelivery(
    currentAddress,
    customerDetails?.phoneNumber || user?.phoneNumber || '',
    customerDetails?.fullName || user?.name || ''
  );
};

// The customer's saved details. The account itself is the Firebase session the server reads from the ID token.
export const useCustomer = () => {
  const { customerDetails, user } = useApp();
  return {
    name: customerDetails?.fullName || user?.name || '',
    phone: customerDetails?.phoneNumber || user?.phoneNumber || '',
    email: customerDetails?.email || user?.email || '',
  };
};

export const DeliveryAddressCard: React.FC<{ address: DeliveryAddress | null; onChange: () => void; onAdd: () => void }> = ({ address, onChange, onAdd }) => {
  if (!address) {
    return (
      <section className="commerce-card commerce-address-card is-missing">
        <div className="commerce-card-head">
          <h2>Delivery address</h2>
        </div>
        <div className="commerce-address-body">
          <MapPin size={18} />
          <div>
            <b>No delivery address yet</b>
            <p>Add where this order should go to see delivery charges and continue.</p>
          </div>
        </div>
        <button className="commerce-ghost is-block" onClick={onAdd}>
          <Plus size={16} /> Add delivery address
        </button>
      </section>
    );
  }
  return (
    <section className="commerce-card commerce-address-card">
      <div className="commerce-card-head">
        <h2>Delivering to</h2>
        <button className="commerce-link" onClick={onChange}>
          Change
        </button>
      </div>
      <div className="commerce-address-body">
        <MapPin size={18} />
        <div>
          <span className="commerce-tag">{address.label}</span>
          {address.recipientName && <b>{address.recipientName}</b>}
          <p>{address.fullAddress}</p>
          {address.landmark && <small>Landmark: {address.landmark}</small>}
        </div>
      </div>
      {!address.serviceable && (
        <p className="commerce-warn" role="alert">
          <AlertTriangle size={14} /> We deliver only to Vijayawada pincodes (520xxx) right now. Choose another address to continue.
        </p>
      )}
    </section>
  );
};

// Bill rows shared by the cart, review, payment and express screens so every step shows the same numbers.
export const BillRows: React.FC<{ totals: CartTotals; tip?: number; totalLabel?: string }> = ({ totals, tip = 0, totalLabel = 'To pay' }) => (
  <dl>
    <div>
      <dt>Item total (MRP)</dt>
      <dd>₹{totals.itemTotal}</dd>
    </div>
    {totals.catalogSavings > 0 && (
      <div className="is-saving">
        <dt>Product discount</dt>
        <dd>−₹{totals.catalogSavings}</dd>
      </div>
    )}
    {totals.couponDiscount > 0 && (
      <div className="is-saving">
        <dt>Coupon ({totals.couponCode})</dt>
        <dd>−₹{totals.couponDiscount}</dd>
      </div>
    )}
    <div>
      <dt>Delivery</dt>
      <dd className={totals.deliveryFee === 0 ? 'is-good' : undefined}>{totals.deliveryFee === 0 ? 'FREE' : `₹${totals.deliveryFee}`}</dd>
    </div>
    {tip > 0 && (
      <div>
        <dt>Delivery partner tip</dt>
        <dd>₹{tip}</dd>
      </div>
    )}
    <div className="commerce-bill-total">
      <dt>{totalLabel}</dt>
      <dd>₹{totals.grandTotal + tip}</dd>
    </div>
  </dl>
);
