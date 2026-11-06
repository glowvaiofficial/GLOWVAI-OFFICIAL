import React from 'react';
import { useProductFeedStatus } from '../../core/services/productFeed';

// Shown when the product list could not be loaded. The last good list stays on screen; this tells the customer that it
// may be out of date and offers a retry. Renders nothing while the list loads fine.
export const ProductFeedNotice: React.FC = () => {
  const { error, retry } = useProductFeedStatus();
  if (!error) return null;
  return (
    <div
      role="alert"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        margin: '8px 16px 0',
        padding: '10px 14px',
        borderRadius: '10px',
        backgroundColor: '#FEF3C7',
        color: '#78350F',
        fontSize: '13px',
        fontWeight: 600,
      }}
    >
      <span>We could not load the latest products. Check your connection.</span>
      <button
        type="button"
        onClick={retry}
        style={{ border: 0, borderRadius: '8px', padding: '6px 12px', background: '#78350F', color: '#FFFFFF', fontWeight: 700, cursor: 'pointer' }}
      >
        Retry
      </button>
    </div>
  );
};
