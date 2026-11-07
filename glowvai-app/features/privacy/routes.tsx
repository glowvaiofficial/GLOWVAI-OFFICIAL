import type { ComponentType } from 'react';
import type { PortedScreenName } from '../../core/routes/names';
import { PrivacyCenterScreen } from './PrivacyCenterScreen';
import { DevicesScreen } from './DevicesScreen';
import { PaymentMethodsScreen } from './PaymentMethodsScreen';
import { GiftCardsScreen } from './GiftCardsScreen';

export const routes: Partial<Record<PortedScreenName, ComponentType>> = {
  'privacy-center': PrivacyCenterScreen,
  'privacy-devices': DevicesScreen,
  'payment-methods': PaymentMethodsScreen,
  'gift-cards': GiftCardsScreen,
};
