import { Typography } from './typography';

export const ModeA = {
  background: '#0B0F19',
  surface: '#151B2E',
  border: 'rgba(255, 255, 255, 0.08)',
  textPrimary: '#F8FAFC',
  textSecondary: '#94A3B8',
  primary: '#0057FB',
  accentGlow: '#7000FF',
};

export const ModeB = {
  background: '#FAF9F5',
  surface: '#FFFFFF',
  border: 'rgba(0, 0, 0, 0.08)',
  textPrimary: '#0F172A',
  textSecondary: '#64748B',
  primary: '#0084FF',
  accentGlow: '#6366F1',
};

export const StatusColors = {
  success: '#10B981',
  successBg: 'rgba(16, 185, 129, 0.15)',
  warning: '#F59E0B',
  warningBg: 'rgba(245, 158, 11, 0.15)',
  error: '#EF4444',
  errorBg: 'rgba(239, 68, 68, 0.15)',
  info: '#0057FB',
  infoBg: 'rgba(26, 115, 232, 0.15)',
};

export const Colors = {
  heroGradientTop: '#1E88F0',
  heroGradientMid: '#0057FB',
  heroGradientBottom: '#0F4FA8',
  primary: '#0057FB',
  cartMaroon: '#0057FB',
  gold: '#D4A855',
  white: '#FFFFFF',

  // Flat color properties for shop components
  textPrimary: '#1A1A1A',
  textSecondary: '#6B6B6B',
  success: '#2D9D5F',
  warning: '#F59E0B',

  // ── ONBOARDING PALETTE
  onboarding: {
    background: '#FFFFFF',
    surfaceSubtle: '#FAF9F6',
    surfaceInput: '#F5F3EE',
    primary: '#0057FB',
    primaryPressed: '#1256B0',
    primaryTint: 'rgba(26, 115, 232, 0.08)',
    textPrimary: '#1A1A1A',
    textSecondary: '#6B6B6B',
    textTertiary: '#A3A3A3',
    border: '#EDEBE6',
    borderFocus: '#0057FB',
    success: '#2D9D5F',
    successTint: 'rgba(45, 157, 95, 0.08)',
  },

  // ── IN-APP SHOPPING PALETTE
  shop: {
    background: '#FFFFFF',
    surface: '#FAFAFA',
    heroMaroon: '#0057FB',
    accentGold: '#D4A855',
    primary: '#0057FB',
    cartGreen: '#2D9D5F',
    textPrimary: '#1A1A1A',
    textSecondary: '#6B6B6B',
    border: '#EEEEEE',
  },

  status: StatusColors,
  dark: ModeA,
  light: ModeB,

  // Object structures for legacy component imports
  background: {
    primary: ModeA.background,
    secondary: ModeA.surface,
    tertiary: ModeA.surface,
    elevated: ModeA.surface,
    glass: 'rgba(21, 27, 46, 0.85)',
    default: ModeA.background,
  },
  brand: {
    primary: ModeA.primary,
    primaryDark: '#1256B0',
    primaryLight: '#D6E4FF',
    secondary: ModeA.accentGlow,
    secondaryLight: '#BAE6FD',
    accent: ModeA.accentGlow,
  },
  text: {
    primary: ModeA.textPrimary,
    secondary: ModeA.textSecondary,
    tertiary: '#64748B',
    inverse: ModeB.textPrimary,
    accent: ModeA.primary,
    default: ModeA.textPrimary,
  },
  border: {
    subtle: ModeA.border,
    default: ModeA.border,
    focus: ModeA.primary,
    glow: 'rgba(0, 194, 255, 0.35)',
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  giant: 48,
};

export const BorderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  full: 9999,
};

export const Shadows = {
  glowPrimary: {
    shadowColor: '#0057FB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
};

// Aliases for broad compatibility
export const colors = Colors;
export const spacing = Spacing;
export const borderRadius = BorderRadius;
export const shadows = Shadows;

export const typography = Typography;

export { Typography };
