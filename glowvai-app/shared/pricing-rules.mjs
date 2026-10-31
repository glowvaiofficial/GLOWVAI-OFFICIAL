// Single source of truth for checkout pricing. Imported by the browser app and by the payments server,
// so the amount shown to the customer is the amount Razorpay charges.

export const FREE_DELIVERY_ABOVE = 499;
export const DEFAULT_DELIVERY_FEE = 29;
export const COUPON_VALUES = { GLOW50: 50, FIRST: 50 };

// Keep in step with serviceability (src/data/serviceability.ts). Matched by substring, longest name first.
export const AREA_DELIVERY_FEES = [
  ['Gannavaram', 49],
  ['Auto Nagar', 19],
  ['Bhavanipuram', 19],
  ['Benz Circle', 0],
  ['MG Road', 0],
  ['Governorpet', 0],
  ['Patamata', 0],
];

// Server-side variant catalogue. Prices and insurance fees must match src/data/products.ts.
export const VARIANTS = new Map([
  ['v-1', { productId: 'prod-min-spf50', price: 379, insurance: 29, inStock: true }],
  ['v-2', { productId: 'prod-min-spf50', price: 649, insurance: 29, inStock: true }],
  ['v-3', { productId: 'prod-min-salicylic-2', price: 499, insurance: 39, inStock: true }],
  ['v-4', { productId: 'prod-cet-gentle-cleanser', price: 359, insurance: 29, inStock: true }],
  ['v-5', { productId: 'prod-cet-gentle-cleanser', price: 579, insurance: 29, inStock: true }],
  ['v-6', { productId: 'prod-derma-niacinamide-10', price: 529, insurance: 39, inStock: true }],
  ['v-7', { productId: 'prod-dot-ceramide-moisturizer', price: 445, insurance: 29, inStock: true }],
  ['v-8', { productId: 'prod-plum-green-tea-toner', price: 349, insurance: 0, inStock: true }],
  ['v-9', { productId: 'prod-aqua-radiance-gel', price: 369, insurance: 29, inStock: true }],
  ['v-10', { productId: 'prod-neut-hydro-boost', price: 899, insurance: 49, inStock: false }],
  ['v-11', { productId: 'prod-maybelline-fit-me', price: 479, insurance: 0, inStock: true }],
  ['v-12', { productId: 'prod-maybelline-fit-me', price: 479, insurance: 0, inStock: true }],
  ['v-13', { productId: 'prod-acc-rose-quartz-roller', price: 499, insurance: 0, inStock: true }],
]);

export const areaDeliveryFee = (area = '') => {
  const match = AREA_DELIVERY_FEES.find(([name]) => area.toLowerCase().includes(name.toLowerCase()));
  return match ? match[1] : DEFAULT_DELIVERY_FEE;
};

// itemTotal is the product total after product discounts, before insurance and coupons.
export const deliveryFeeFor = ({ itemTotal, area }) => (itemTotal > FREE_DELIVERY_ABOVE ? 0 : areaDeliveryFee(area));
