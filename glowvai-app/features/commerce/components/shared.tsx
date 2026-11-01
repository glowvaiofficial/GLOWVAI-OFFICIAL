import React from 'react';
import { ArrowLeft, Check, MapPin, Zap } from 'lucide-react';
import { useApp } from '../../../context/useApp';
import { useAddressStore, toDeliveryAddress, novAddressToDelivery, type DeliveryAddress } from '../lib/addressStore';

interface FlowHeaderProps {
  title: string;
  subtitle?: string;
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

// Delivery time comes from the app's current address. Unserviceable addresses get no time at all.
export const useDeliveryMinutes = (): number | null => {
  const { currentAddress } = useApp();
  const address = useDeliveryAddress();
  if (!address.serviceable || !currentAddress.serviceable || !currentAddress.deliveryMinutes) return null;
  return currentAddress.deliveryMinutes;
};

export const DeliveryPill: React.FC<{ minutes: number | null }> = ({ minutes }) =>
  minutes ? (
    <span className="commerce-eta-pill">
      <Zap size={11} fill="currentColor" />
      {minutes} min delivery
    </span>
  ) : (
    <span className="commerce-eta-pill is-warn">Outside delivery area</span>
  );

const STEP_LABELS = ['Cart', 'Review', 'Pay'];

// Checkout progress: step is 1 (cart), 2 (review) or 3 (pay).
export const CheckoutSteps: React.FC<{ step: 1 | 2 | 3 }> = ({ step }) => (
  <ol className="commerce-steps" aria-label="Checkout progress">
    {STEP_LABELS.map((label, index) => {
      const n = index + 1;
      const state = n < step ? 'is-done' : n === step ? 'is-active' : '';
      return (
        <li key={label} className={state}>
          <span>{n < step ? <Check size={12} /> : n}</span>
          <b>{label}</b>
        </li>
      );
    })}
  </ol>
);

// Selected saved address, falling back to the NOV header address.
export const useDeliveryAddress = (): DeliveryAddress => {
  const { currentAddress, customerDetails, user } = useApp();
  const saved = useAddressStore((s) => s.addresses.find((a) => a.id === s.selectedId));
  if (saved) return toDeliveryAddress(saved);
  return novAddressToDelivery(
    currentAddress,
    customerDetails?.phoneNumber || user?.phoneNumber || '',
    customerDetails?.fullName || user?.name || ''
  );
};

export const useCustomer = () => {
  const { customerDetails, user } = useApp();
  return {
    userId: user?.id || customerDetails?.phoneNumber || 'guest',
    name: customerDetails?.fullName || user?.name || 'GlowVAI customer',
    phone: customerDetails?.phoneNumber || user?.phoneNumber || '',
    email: customerDetails?.email || user?.email || '',
  };
};

export const DeliveryAddressCard: React.FC<{ address: DeliveryAddress; onChange?: () => void }> = ({ address, onChange }) => (
  <section className="commerce-card commerce-address-card">
    <div className="commerce-card-head">
      <h2>Delivering to</h2>
      {onChange && address.fullAddress && (
        <button className="commerce-link" onClick={onChange}>
          Change
        </button>
      )}
    </div>
    {!address.fullAddress ? (
      <div className="commerce-address-body">
        <span className="commerce-suggest-icon" aria-hidden="true">
          <MapPin size={16} />
        </span>
        <div>
          <b>No delivery address yet</b>
          <p>Add the address we should deliver to before you pay.</p>
          {onChange && (
            <button className="commerce-link" onClick={onChange}>
              Add address
            </button>
          )}
        </div>
      </div>
    ) : (
    <div className="commerce-address-body">
      <span className="commerce-suggest-icon" aria-hidden="true">
        <MapPin size={16} />
      </span>
      <div>
        <span className="commerce-tag-row">
          <span className="commerce-tag">{address.label}</span>
          {address.recipientName && <b>{address.recipientName}</b>}
          {!address.serviceable && <span className="commerce-tag is-warn">Not serviceable</span>}
        </span>
        <p>{address.fullAddress || '—'}</p>
        {address.landmark && <small>Landmark: {address.landmark}</small>}
        {address.phoneNumber && <small>Phone: {address.phoneNumber}</small>}
      </div>
    </div>
    )}
  </section>
);

// Bill rows shared by the cart, review and express screens. Zero-value savings rows are left out.
export const BillRows: React.FC<{
  rows: Array<{ label: string; value: number; saving?: boolean; free?: boolean } | false | null | undefined>;
  totalLabel: string;
  total: number;
}> = ({ rows, totalLabel, total }) => (
  <dl>
    {rows.map((row) =>
      row ? (
        <div className={row.saving ? 'is-saving' : undefined} key={row.label}>
          <dt>{row.label}</dt>
          <dd className={row.free ? 'is-good' : undefined}>{row.free ? 'FREE' : `${row.saving ? '−' : ''}₹${row.value}`}</dd>
        </div>
      ) : null
    )}
    <div className="commerce-bill-total">
      <dt>{totalLabel}</dt>
      <dd>₹{total}</dd>
    </div>
  </dl>
);
