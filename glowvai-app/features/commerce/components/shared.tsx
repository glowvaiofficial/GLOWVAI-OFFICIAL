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

export const DeliveryPill: React.FC<{ text?: string }> = ({ text = '10 min delivery' }) => (
  <span className="commerce-eta-pill">
    <Zap size={11} fill="currentColor" />
    {text}
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
      {onChange && (
        <button className="commerce-link" onClick={onChange}>
          Change
        </button>
      )}
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
  </section>
);
