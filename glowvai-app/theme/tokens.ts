/**
 * Glowvai Production Design System Tokens
 * Brand Theme: White & Soft-Blue oriented, Minimal, Premium, Commerce-first.
 * Market: Vijayawada, Andhra Pradesh, India
 */

export const colors = {
  // Brand Primary & Accents (Soft Blue)
  primary: '#2854C5',         // Glowvai Soft Signature Blue
  primaryDark: '#1D3F9D',     // Darker blue for active/pressed states
  primaryLight: '#EDF2FF',    // Very soft blue tint for badges, subtle highlights
  primaryBorder: '#CDD9FB',   // Border highlight

  // Secondary & Accents
  accent: '#2854C5',          // Sky blue highlight
  accentLight: '#EDF2FF',

  // Surfaces & Backgrounds
  background: '#FFFFFF',      // Clean White
  surface: '#F7F8FB',         // Off-white / Subdued Slate Surface
  surfaceMuted: '#F0F2F6',    // Input backgrounds, chip backgrounds
  surfaceElevated: '#FFFFFF', // Elevated cards
  border: '#E2E5EB',          // Subtle border for crisp definition
  borderLight: '#ECEEF2',     // Ultra light divider

  // Typography
  textPrimary: '#161A22',     // Near-black dark charcoal for readability
  textSecondary: '#545B69',   // Muted charcoal for descriptions & secondary info
  textMuted: '#818896',       // Captions, subtle metadata
  textInverse: '#FFFFFF',     // White text on dark buttons/chips

  // Semantic Status
  success: '#19734F',         // Confirmed stock, verified badges, delivered
  successBg: '#F0FDF4',
  successBorder: '#BBF7D0',

  warning: '#A76516',         // Low stock, pending verification
  warningBg: '#FFFBEB',
  warningBorder: '#FDE68A',

  error: '#DC2626',           // Out of stock, payment failed, validation error
  errorBg: '#FEF2F2',
  errorBorder: '#FECACA',

  // Commerce Specific: Beauty Insurance & Tags
  insurance: '#2854C5',       // Beauty Insurance badge
  insuranceBg: '#EFF6FF',
  insuranceBorder: '#BFDBFE',

  tagDiscount: '#15803D',     // Honest discount tag
  tagDiscountBg: '#DCFCE7',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  giant: 48,
};

export const borderRadius = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
};

export const typography = {
  fontFamily: "'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  headingFont: "'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

export const shadows = {
  none: 'none',
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -4px rgba(0, 0, 0, 0.04)',
};
