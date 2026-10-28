/**
 * GLOW VAI Email Copy Configuration.
 * Centralized, friendly founder voice for all email templates.
 * Compliance:
 * - NO em-dashes (--) anywhere.
 * - NO banned buzzwords (unlock, elevate, seamless, revolutionize, leverage, empower, journey, glow-up, game-changer).
 * - NO medical claims.
 * - Prices shown with "as on website, confirmed on WhatsApp".
 */

export const emailCopy = {
  contact_ack: {
    subject: "We got your message",
    preheader: "Thank you for contacting GLOW VAI. We will reply within 1 working day.",
    title: "We Received Your Message",
    intro: "Thank you for writing to GLOW VAI. Our team has received your message and is reviewing your question.",
    timeframeNote: "We respond within 1 working day. If your request is urgent, you can reach our team directly on WhatsApp.",
    whatsappCta: "Message Us on WhatsApp",
  },

  contact_notify: {
    subject: (topic: string, ref: string) => `New enquiry: ${topic} (${ref})`,
    preheader: "New customer enquiry received on glowvai.in",
    title: "New Customer Enquiry",
  },

  lead_report: {
    subject: (personaName: string) => `Your GLOW VAI card: ${personaName}`,
    preheader: "Here is your browser-based face scan summary and product routine recommendations.",
    title: "Your Custom Skin Routine Card",
    disclaimer: "Cosmetic skin insights from your photo, not medical advice. Lighting and camera quality change results.",
    whatsappCta: "Order my routine on WhatsApp",
    rightsText: "To request deletion of your saved scan data, visit our privacy policy rights section.",
  },

  lead_alert: {
    subject: "New scan lead received",
    preheader: "A new face scan lead has been saved to Sheets.",
    title: "New Face Scan Lead Notification",
  },

  order_intent_notify: {
    subject: (ref: string) => `WhatsApp order intent ${ref}`,
    preheader: "A customer clicked Order on WhatsApp for a routine basket.",
    title: "New Order Intent Registered",
    staffNote: "Customer may not have sent the WhatsApp message yet. Please confirm order details on WhatsApp.",
  },

  waitlist_confirm: {
    subject: "You are on the GLOW VAI waitlist",
    preheader: "We confirmed your spot for upcoming product restocks.",
    title: "Waitlist Confirmation",
    body: "Thank you for joining our waitlist. We will notify you as soon as new stock or updates are available.",
    leaveText: "If you ever wish to leave this list, reply to this email or visit our website privacy settings.",
  },

  data_request_ack: {
    subject: "We received your data request",
    preheader: "GLOW VAI data privacy request acknowledgement.",
    title: "Data Request Acknowledgement",
    body: "We have received your privacy data request under Indian DPDP Act provisions. Our team will verify and process your request within 30 days.",
  },

  data_request_notify: {
    subject: (ref: string) => `[ACTION] New data request ${ref}`,
    preheader: "Action required: new privacy data request submitted.",
    title: "Privacy Data Request Pending Review",
  },

  review_request: {
    subject: "How is your GLOW VAI routine working?",
    preheader: "Share your honest feedback on your recent purchase.",
    title: "We Would Love Your Honest Feedback",
    body: "Thank you for choosing GLOW VAI. We invite you to share your honest experience with your routine. Any rating is welcome, and no reward or incentive depends on your score.",
    cta: "Share Your Review",
  },

  weekly_digest: {
    subject: "GLOW VAI Weekly Performance Summary",
    preheader: "Key store metrics for the past 7 days.",
    title: "GLOW VAI Weekly Performance Digest",
  },

  newsletter_confirm: {
    subject: "Confirm your GLOW VAI skin tips",
    preheader: "Click the link inside to confirm your newsletter signup.",
    title: "Confirm Your Email Subscription",
    body: "Please confirm your subscription to receive practical, plain-language skin care tips and updates from GLOW VAI.",
    cta: "Confirm Subscription",
  },

  newsletter_welcome: {
    subject: "Welcome to GLOW VAI Skin Tips",
    preheader: "Your subscription is confirmed. Expect short, practical tips.",
    title: "Welcome to GLOW VAI",
    body: "Your email subscription is active. We send short, practical skin care guides twice a month. You can unsubscribe at any time using the link in the footer.",
  },
};
