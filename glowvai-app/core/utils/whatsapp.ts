/**
 * WhatsApp Deep-Linking & Automated Order Dispatch Utility for GlowVAI V2
 * 
 * Links to the official GlowVai WhatsApp line (the number published on glowvai.in). Orders are no longer
 * "dispatched" from the browser: they are placed on the shop server and handled in the GlowVai admin panel.
 */



export const DISPATCH_PHONE_PRIMARY = '8977855998';
export const DISPATCH_PHONE_SECONDARY = '9505225379';
export const SUPPORT_HOTLINE = '8977855998';

/**
 * Normalizes phone numbers to WhatsApp international format (e.g. +91XXXXXXXXXX -> 91XXXXXXXXXX)
 */
export const normalizeWhatsAppPhone = (phone: string): string => {
  const cleaned = phone.replace(/[^\d]/g, '');
  if (cleaned.length === 10) {
    return `91${cleaned}`;
  }
  return cleaned;
};

/**
 * Opens direct WhatsApp chat with GlowVAI Support Hotline
 */
export const openWhatsAppSupport = (customMessage?: string): void => {
  const phone = normalizeWhatsAppPhone(SUPPORT_HOTLINE);
  const msg = encodeURIComponent(customMessage || 'Hi, I need assistance with my GlowVAI account.');
  const url = `https://wa.me/${phone}?text=${msg}`;
  window.open(url, '_blank', 'noopener');
};

/**
 * Creates direct WhatsApp deep links
 */
export const createWhatsAppOrderLink = (phone: string, message: string): string => {
  const normalizedPhone = normalizeWhatsAppPhone(phone);
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${normalizedPhone}?text=${encodedMessage}`;
};
