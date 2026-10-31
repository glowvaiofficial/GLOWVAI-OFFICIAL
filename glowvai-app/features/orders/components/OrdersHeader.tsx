import React from 'react';
import { ArrowLeft } from 'lucide-react';

export interface OrdersHeaderProps {
  title: string;
  subtitle?: string;
  onBack: () => void;
  right?: React.ReactNode;
}

export const OrdersHeader: React.FC<OrdersHeaderProps> = ({ title, subtitle, onBack, right }) => (
  <header className="orders-header">
    <button className="orders-icon-button" onClick={onBack} aria-label="Go back">
      <ArrowLeft size={20} />
    </button>
    <div className="orders-header-copy">
      <h1>{title}</h1>
      {subtitle && <p>{subtitle}</p>}
    </div>
    <div className="orders-header-right">{right}</div>
  </header>
);
