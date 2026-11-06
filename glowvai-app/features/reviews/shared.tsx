import React from 'react';
import { Star } from 'lucide-react';

// Shared look for the product page's review and question sections. Colours match the product screen.
export const ink = '#161A22';
export const muted = '#687080';
export const accent = '#2854C5';
export const line = '#E2E5EB';

export const sectionTitle: React.CSSProperties = { fontSize: '14px', fontWeight: 700, color: ink, margin: 0 };
export const bodyText: React.CSSProperties = { fontSize: '13px', color: '#545B69', lineHeight: '20px', margin: 0 };
export const smallText: React.CSSProperties = { fontSize: '12px', color: muted, margin: 0 };

export const buttonOutline: React.CSSProperties = {
  height: '40px',
  padding: '0 16px',
  borderRadius: '10px',
  border: `1.5px solid ${accent}`,
  backgroundColor: '#FFFFFF',
  color: accent,
  fontSize: '13px',
  fontWeight: 700,
  cursor: 'pointer',
};

export const buttonPrimary: React.CSSProperties = {
  height: '44px',
  padding: '0 20px',
  borderRadius: '10px',
  border: 'none',
  backgroundColor: accent,
  color: '#FFFFFF',
  fontSize: '13px',
  fontWeight: 700,
  cursor: 'pointer',
};

export const inputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '10px 12px',
  borderRadius: '10px',
  border: `1px solid #CBD5E1`,
  fontSize: '14px',
  color: ink,
  backgroundColor: '#FFFFFF',
  fontFamily: 'inherit',
};

// Five stars. The number is shown as text next to it; the stars are decoration and hidden from screen readers.
export function Stars({ value, size = 16 }: { value: number; size?: number }) {
  const filled = Math.round(value);
  return (
    <span aria-hidden="true" style={{ display: 'inline-flex', gap: '2px', verticalAlign: 'middle' }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={size} color={n <= filled ? '#F59E0B' : '#CBD5E1'} fill={n <= filled ? '#F59E0B' : 'none'} />
      ))}
    </span>
  );
}

export function formatDay(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

// Visually hidden, but still read by screen readers.
export const srOnly: React.CSSProperties = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: 0,
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
};
