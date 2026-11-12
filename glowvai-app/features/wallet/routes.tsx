import type { ComponentType } from 'react';
import type { PortedScreenName } from '../../core/routes/names';
import { WalletScreen } from './WalletScreen';

export const routes: Partial<Record<PortedScreenName, ComponentType>> = {
  'wallet-home': WalletScreen,
};
