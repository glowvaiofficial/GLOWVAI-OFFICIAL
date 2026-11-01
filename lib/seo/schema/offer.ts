import { Product } from "@/types/product";
import { sitePolicies } from "@/config/policies";
import { buildShippingDetails } from "./shipping";
import { buildReturnPolicy } from "./returns";
import { ORG_ID } from "../entity-graph";
import { SITE_URL } from "@/lib/site-url";

export function buildOfferSchema(product: Product): Record<string, any> {
  const fullUrl = `${SITE_URL}/product/${product.slug}`;
  const isAvailable = product.in_stock !== false;

  const offer: Record<string, any> = {
    "@type": "Offer",
    "@id": `${fullUrl}#offer`,
    "url": fullUrl,
    "priceCurrency": "INR",
    "price": product.price.toFixed(2),
    "availability": isAvailable
      ? "https://schema.org/InStock"
      : "https://schema.org/OutOfStock",
    "itemCondition": "https://schema.org/NewCondition",
    "seller": { "@id": ORG_ID },
  };

  if (product.mrp && product.mrp > product.price) {
    offer["priceSpecification"] = {
      "@type": "UnitPriceSpecification",
      "priceType": "https://schema.org/ListPrice",
      "priceCurrency": "INR",
      "price": product.mrp.toFixed(2),
    };
  }

  const shipping = buildShippingDetails(sitePolicies.shipping);
  if (shipping) offer["shippingDetails"] = shipping;

  const returns = buildReturnPolicy(sitePolicies.returns);
  if (returns) offer["hasMerchantReturnPolicy"] = returns;

  return offer;
}
