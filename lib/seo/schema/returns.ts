import { ReturnPolicy } from "@/config/policies";
import { SITE_URL } from "@/lib/site-url";

export function buildReturnPolicy(policy: ReturnPolicy): Record<string, any> | undefined {
  if (!policy.ready) return undefined;

  return {
    "@type": "MerchantReturnPolicy",
    "applicableCountry": "IN",
    "returnPolicyCategory": policy.windowDays > 0 
      ? "https://schema.org/MerchantReturnFiniteReturnWindow"
      : "https://schema.org/MerchantReturnNotPermitted",
    "merchantReturnDays": policy.windowDays,
    "returnMethod": "https://schema.org/ReturnByMail",
    "returnFees": "https://schema.org/FreeReturn",
    "merchantReturnLink": `${SITE_URL}/returns`,
  };
}
