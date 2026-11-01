import { fastDeliveryClaim } from "./claims";

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  flag: boolean;
}

export const paymentMethodsReady = false;
export const returnsPolicyReady = true;
export const trackingReady = false;

export const rawFaqItems: FaqItem[] = [
  {
    id: "faq-1",
    question: "How does the face scan work?",
    answer: "Your phone camera looks at skin texture, hydration levels, tone, and visible clarity in about 30 seconds. You get a plain-language report and a routine built for your specific skin needs.",
    flag: true,
  },
  {
    id: "faq-2",
    question: "Is my photo stored on a server?",
    answer: "Your photo is analysed in your browser. If you check the separate photo consent box, it is saved securely to private cloud storage and deleted after 90 days or on your request.",
    flag: true,
  },
  {
    id: "faq-3",
    question: "What data do you save?",
    answer: "We save your name, phone number, optional email, rough location from your IP, device info, and skin scores only when you explicitly give consent.",
    flag: true,
  },
  {
    id: "faq-4",
    question: "Is this medical advice?",
    answer: "No. We provide cosmetic skin insights only. For medical conditions, skin diseases, or persistent issues, always see a dermatologist.",
    flag: true,
  },
  {
    id: "faq-5",
    question: "How fast is delivery?",
    answer: fastDeliveryClaim.verified
      ? "Orders are packed in neighborhood dark stores and brought to your door in ~15 minutes."
      : "We are launching doorstep delivery city by city. Check your pincode above to see availability in your area.",
    flag: true,
  },
  {
    id: "faq-6",
    question: "Will it suit my skin type?",
    answer: "The face scan suggests formulas suited to your scores. Patch testing any new cosmetic product before full application is always recommended.",
    flag: true,
  },
  {
    id: "faq-7",
    question: "How do I pay?",
    answer: paymentMethodsReady
      ? "We accept UPI, major credit/debit cards, net banking, and Cash on Delivery in selected pincodes."
      : "Payment options will be listed at checkout when online ordering opens in your city.",
    flag: paymentMethodsReady,
  },
  {
    id: "faq-8",
    question: "What is your returns policy?",
    answer: "We offer a 14-day Skin Satisfaction Guarantee on all skincare products. If a product does not suit your skin, contact our team on WhatsApp or email for a replacement or full refund.",
    flag: returnsPolicyReady,
  },
  {
    id: "faq-9",
    question: "How do I track my order?",
    answer: "Once live, you receive a SMS link with live rider tracking for your delivery.",
    flag: trackingReady,
  },
];

export const getFaqItems = (): FaqItem[] => {
  return rawFaqItems.filter((item) => item.flag === true);
};
