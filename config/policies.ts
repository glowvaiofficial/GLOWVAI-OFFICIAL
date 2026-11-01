export interface ShippingPolicy {
  ready: boolean;
  handlingDays: number;
  transitDaysMin: number;
  transitDaysMax: number;
  cost: number;
  freeAbove: number;
  regions: string[];
}

export interface ReturnPolicy {
  ready: boolean;
  windowDays: number;
  method: string;
  fees: string;
  conditions: string;
}

export interface SitePolicies {
  shipping: ShippingPolicy;
  returns: ReturnPolicy;
}

export const sitePolicies: SitePolicies = {
  shipping: {
    ready: true,
    handlingDays: 1,
    transitDaysMin: 2,
    transitDaysMax: 4,
    cost: 0,
    freeAbove: 499,
    regions: ["IN"],
  },
  returns: {
    ready: true,
    windowDays: 14,
    method: "WhatsApp return request",
    fees: "Free return pickup",
    conditions: "Unopened original packaging or 14-day skin satisfaction guarantee",
  },
};
