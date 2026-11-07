// FAQ, Terms of use and Privacy policy for the shop. Pure data and builders, no React, so the node tests can check them.
//
// Every statement comes from the codebase (pricing rules, return window and reasons, cancellation states, payment
// options, notification and activity limits, the account's consent and phone handling) or from configuration in
// config/site.ts. Anything the code does not settle is written as "Not set" for the owner to supply. Nothing is invented.
// These pages are drafts: the banner in LEGAL_DRAFT_BANNER stays until legal review is done.
import { AREA_DELIVERY_FEES, DEFAULT_DELIVERY_FEE, FREE_DELIVERY_ABOVE } from "../../shared/pricing-rules.mjs";
import { ACTIVITY_CAP, RETURN_WINDOW_DAYS } from "@/lib/shop/settings/rules";
import { MAX_NOTIFICATIONS, MAX_TOKENS_PER_USER } from "@/lib/shop/notifications/limits";

export const LEGAL_DRAFT_BANNER = "Draft — pending legal review before publication";
export const NOT_SET = "Not set";

// The configured business facts. Missing values are passed as null and shown as "Not set".
export interface LegalFacts {
  legalName: string | null;
  address: string | null;
  supportEmail: string | null;
  supportPhone: string | null;
  // Support hours are shown only when configured. Otherwise the pages say to contact support from the app.
  supportHours: string | null;
  manufacturerName: string | null;
  licenceNumber: string | null;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

export interface LegalSection {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
}

export interface LegalPage {
  title: string;
  banner: string;
  intro: string;
  sections: LegalSection[];
}

const rupees = (n: number) => `₹${n}`;
const or = (value: string | null) => value && value.trim() ? value.trim() : NOT_SET;
const returnDays = RETURN_WINDOW_DAYS;

export function deliveryFeeLines(): string[] {
  const free = AREA_DELIVERY_FEES.filter(([, fee]) => fee === 0).map(([name]) => String(name));
  const charged = AREA_DELIVERY_FEES.filter(([, fee]) => fee !== 0).map(([name, fee]) => `${String(name)} ${rupees(Number(fee))}`);
  return [
    ...charged,
    `${free.join(", ")}: free delivery`,
    `Other areas: ${rupees(DEFAULT_DELIVERY_FEE)}`,
  ];
}

export function contactLine(facts: LegalFacts): string {
  const hours = facts.supportHours && facts.supportHours.trim() ? `Support hours: ${facts.supportHours.trim()}.` : "Contact support from the app for help.";
  return `Email ${or(facts.supportEmail)}, phone ${or(facts.supportPhone)}. ${hours}`;
}

export function faqItems(facts: LegalFacts): FaqItem[] {
  return [
    {
      id: "delivery-area",
      question: "Where do you deliver, and what does delivery cost?",
      answer: `Delivery fees depend on your area and are shown at checkout before you pay. ${deliveryFeeLines().join("; ")}. Your product total above ${rupees(FREE_DELIVERY_ABOVE)} gets free delivery.`,
    },
    {
      id: "payment",
      question: "How can I pay?",
      answer: "Cash on delivery, or online through Razorpay with UPI, card, netbanking or wallet. EMI is shown only where it is turned on for your order.",
    },
    {
      id: "cancel",
      question: "Can I cancel my order?",
      answer: "Yes, from your orders, until the order is packed. That is while it is placed or accepted by the store. After it is packed or on its way, contact support from the app to cancel it.",
    },
    {
      id: "returns",
      question: "What is your return policy?",
      answer: `You can ask for a return or a replacement within ${returnDays} days of delivery, from your order. Reasons: arrived damaged, wrong item, expired or defective, or not as described. "No longer needed" applies to returns only. Refunds are issued after our team approves the return.`,
    },
    {
      id: "subscriptions",
      question: "How do subscriptions work?",
      answer: "Subscribe to a product for delivery every 2, 4 or 8 weeks, with a quantity from 1 to 5. You can pause, resume, change the quantity or cancel from Account, then Subscriptions. Each delivery is priced when it is created.",
    },
    {
      id: "reviews",
      question: "When do reviews appear?",
      answer: "A review appears on the product page after our team has checked it.",
    },
    {
      id: "phone",
      question: "Is my mobile number verified?",
      answer: "Not yet. Your mobile number is saved as you enter it. We will verify it by SMS once SMS sign-in is available.",
    },
    {
      id: "contact",
      question: "How do I contact support?",
      answer: `${contactLine(facts)} You can also open Help and support in the app.`,
    },
  ];
}

export function termsPage(facts: LegalFacts): LegalPage {
  return {
    title: "Terms of use",
    banner: LEGAL_DRAFT_BANNER,
    intro: `These terms cover your use of the GlowVai shop. The shop is run by ${or(facts.legalName)}. Business address: ${or(facts.address)}.`,
    sections: [
      {
        heading: "Your account",
        paragraphs: ["Your account holds the name, mobile number and optional email you give us, and your delivery addresses. Your mobile number is not verified yet. Keep your details accurate."],
      },
      {
        heading: "Orders and prices",
        paragraphs: ["Prices and delivery fees are shown before you pay and are the amounts charged on your order. You can pay cash on delivery, or online through Razorpay."],
        bullets: ["You can cancel an order yourself until it is packed.", "After that, contact support from the app."],
      },
      {
        heading: "Delivery",
        paragraphs: ["We deliver to the areas we serve. The delivery fee depends on your area."],
        bullets: deliveryFeeLines(),
      },
      {
        heading: "Returns and replacements",
        paragraphs: [`You can ask for a return or a replacement within ${returnDays} days of delivery. Our team reviews each request. Refunds are issued after the return is approved.`],
      },
      {
        heading: "Subscriptions",
        paragraphs: ["A subscription delivers a product every 2, 4 or 8 weeks. Each delivery is priced when it is created, and you can pause, resume, change or cancel it from your account."],
      },
      {
        heading: "Reviews and questions",
        paragraphs: ["Reviews and product questions are published after our team has checked them."],
      },
      {
        heading: "Points, coins and referrals",
        paragraphs: ["Coins and referral rewards follow the rules shown in the app when they are earned."],
      },
      {
        heading: "Terms still to be added",
        paragraphs: [
          `Governing law and jurisdiction: ${NOT_SET}.`,
          `Limitation of liability and intellectual property: ${NOT_SET}.`,
          `Grievance officer: ${NOT_SET}.`,
          `Product manufacturer: ${or(facts.manufacturerName)}. Licence number: ${or(facts.licenceNumber)}.`,
        ],
      },
      {
        heading: "Contact",
        paragraphs: [contactLine(facts)],
      },
    ],
  };
}

export function privacyPage(facts: LegalFacts): LegalPage {
  return {
    title: "Privacy policy",
    banner: LEGAL_DRAFT_BANNER,
    intro: `This page explains what the GlowVai shop collects, why, and what you can do about it. Data controller: ${or(facts.legalName)}. Business address: ${or(facts.address)}.`,
    sections: [
      {
        heading: "What we collect",
        paragraphs: ["We collect only what the shop needs:"],
        bullets: [
          "Your name, mobile number (not verified yet) and optional email.",
          "Delivery addresses you save, and the details of your orders.",
          "Payment status and transaction references. Card details are not entered on our pages: payments are processed by Razorpay.",
          "Wishlist items, reviews, questions, return requests and subscriptions.",
          "Notification choices, and the browser push tokens for the devices you allow.",
          "Your account activity: the kind of change and when it happened, never the personal values.",
          "A skin scan, if you use one. The face image is used only to check the scan position and create cosmetic insights. Identity recognition is not used. How long scan data is kept: " + NOT_SET + ".",
          "A device identifier from anonymous sign-in, which keeps your profile, orders and requests together.",
        ],
      },
      {
        heading: "Why we use it",
        paragraphs: ["To deliver your orders and handle payments, returns and support. To send order updates. To send offers only when you have agreed to marketing messages. To understand how the shop is used, only if you have agreed to usage analytics."],
      },
      {
        heading: "Your choices and consent",
        paragraphs: [
          "Under Edit profile you choose offers and marketing messages, and usage analytics. Each choice is saved with the date you made it, and you can change it at any time.",
          "Push offers are sent only when marketing messages are on. Under Notifications you choose each type of update.",
        ],
      },
      {
        heading: "How long we keep it",
        paragraphs: ["The app keeps these limits in place:"],
        bullets: [
          `Notifications: the newest ${MAX_NOTIFICATIONS} are kept.`,
          `Account activity: the newest ${ACTIVITY_CAP} entries are kept.`,
          `Push tokens: up to ${MAX_TOKENS_PER_USER} devices per account; the least recently used is removed when a new device is added.`,
          `Other records (orders, payments, scan data): ${NOT_SET}.`,
        ],
      },
      {
        heading: "Who we share it with",
        paragraphs: ["We share only what each service needs:"],
        bullets: [
          "Razorpay, for payments.",
          "Firebase (Google), which runs sign-in, the database and push messages for the shop.",
          "The stores that prepare your order, and our delivery partners, for the items and delivery details of your order.",
        ],
      },
      {
        heading: "Your rights",
        paragraphs: [
          "You can view and change your profile and addresses, and change your notification and consent choices, at any time.",
          "To delete your account, use Settings, then Privacy and security, and send a deletion request. Nothing is deleted straight away: our team checks the request, processes it and contacts you.",
          "For any other request, contact support from the app.",
        ],
      },
      {
        heading: "Security",
        paragraphs: ["Your sign-in is checked on our servers for every request. Each account can only read and change its own data."],
      },
      {
        heading: "Contact",
        paragraphs: [contactLine(facts), `Grievance officer: ${NOT_SET}.`],
      },
    ],
  };
}
