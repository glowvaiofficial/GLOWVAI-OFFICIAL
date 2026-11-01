import type { ComponentType } from 'react';
import type { PortedScreenName } from '../../core/routes/names';
import './commerce.css';
import '../../responsive/commerce-ported.css';
import { CartScreen } from './CartScreen';
import { CheckoutReviewScreen } from './CheckoutReviewScreen';
import { ExpressCheckoutScreen } from './ExpressCheckoutScreen';
import { PaymentMethodScreen } from './PaymentMethodScreen';
import { PaymentProcessingScreen } from './PaymentProcessingScreen';
import { PaymentSuccessScreen, PaymentFailedScreen } from './PaymentResultScreens';
import { AddressListScreen, AddAddressScreen } from './AddressScreens';
import { LocationSetupScreen, LocationMapPickerScreen, ServiceabilityScreen } from './LocationScreens';

export const routes: Partial<Record<PortedScreenName, ComponentType>> = {
  'cart-tab': CartScreen,
  checkout: CheckoutReviewScreen,
  'checkout-review': CheckoutReviewScreen,
  'checkout-express': ExpressCheckoutScreen,
  'checkout-payment-method': PaymentMethodScreen,
  'checkout-payment-processing': PaymentProcessingScreen,
  'checkout-payment-success': PaymentSuccessScreen,
  'checkout-payment-failed': PaymentFailedScreen,
  'address-list': AddressListScreen,
  'address-add': AddAddressScreen,
  'address-saved': AddressListScreen,
  'location-setup': LocationSetupScreen,
  'location-map-picker': LocationMapPickerScreen,
  'location-serviceability': ServiceabilityScreen,
};
