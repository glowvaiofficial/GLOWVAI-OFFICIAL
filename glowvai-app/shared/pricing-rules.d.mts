export interface VariantRule {
  productId: string;
  price: number;
  insurance: number;
  inStock: boolean;
}

export declare const FREE_DELIVERY_ABOVE: number;
export declare const DEFAULT_DELIVERY_FEE: number;
export declare const COUPON_VALUES: Record<string, number>;
export declare const AREA_DELIVERY_FEES: [string, number][];
export declare const VARIANTS: Map<string, VariantRule>;
export declare function areaDeliveryFee(area?: string): number;
export declare function deliveryFeeFor(input: { itemTotal: number; area: string }): number;
