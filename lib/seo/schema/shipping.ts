import { ShippingPolicy } from "@/config/policies";

export function buildShippingDetails(policy: ShippingPolicy): Record<string, any> | undefined {
  if (!policy.ready) return undefined;

  return {
    "@type": "OfferShippingDetails",
    "shippingDestination": policy.regions.map((region) => ({
      "@type": "DefinedRegion",
      "addressCountry": region,
    })),
    "shippingRate": {
      "@type": "MonetaryAmount",
      "value": policy.cost.toFixed(2),
      "currency": "INR",
    },
    "deliveryTime": {
      "@type": "ShippingDeliveryTime",
      "handlingTime": {
        "@type": "QuantitativeValue",
        "minValue": policy.handlingDays,
        "maxValue": policy.handlingDays,
        "unitCode": "DAY",
      },
      "transitTime": {
        "@type": "QuantitativeValue",
        "minValue": policy.transitDaysMin,
        "maxValue": policy.transitDaysMax,
        "unitCode": "DAY",
      },
    },
  };
}
