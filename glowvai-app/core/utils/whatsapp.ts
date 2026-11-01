/**
 * WhatsApp Deep-Linking & Automated Order Dispatch Utility for GlowVAI V2
 * 
 * Generates automated WhatsApp alerts to the delivery team (8977855998 & 9505225379)
 * containing full customer, address, items, and dark store pickup details.
 */



export const DISPATCH_PHONE_PRIMARY = '8977855998';
export const DISPATCH_PHONE_SECONDARY = '9505225379';
export const SUPPORT_HOTLINE = '8977855998';

export interface DispatchOrderPayload {
  orderId: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  darkStoreName: string;
  items: Array<{ name: string; qty: number; price: number }>;
  totalAmount: number;
  paymentMethod: string;
  deliveryOtp: string;
  etaMinutes?: number;
}

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
 * Formats a clean, high-visibility WhatsApp Dispatch message for the delivery team
 */
export const formatWhatsAppOrderDispatchMessage = (order: DispatchOrderPayload): string => {
  const itemsText = order.items
    .map(item => `  • ${item.name} (x${item.qty}) - ₹${item.price * item.qty}`)
    .join('\n');

  return `🚨 *NEW GLOWVAI 10-MIN EXPRESS ORDER* 🚨
━━━━━━━━━━━━━━━━━━━━━━━━━━
📦 *Order ID*: #${order.orderId}
💰 *Total Amount*: ₹${order.totalAmount} (${order.paymentMethod.toUpperCase()})
🔑 *Delivery OTP*: *${order.deliveryOtp}*
⏱️ *SLA Window*: 10 Minutes Drop

👤 *Customer*: ${order.customerName}
📞 *Phone*: ${order.customerPhone}
📍 *Delivery Address*:
${order.deliveryAddress}

🏬 *Pickup Dark Store*:
${order.darkStoreName || 'Glowway Darkstore Payikapuram (DS-VIJ-01)'}

🛍️ *Items to Pick & Deliver*:
${itemsText}
━━━━━━━━━━━━━━━━━━━━━━━━━━
⚡ *Action*: Pick up from Dark Store & Deliver to Customer Doorstep!`;
};

/**
 * Creates direct WhatsApp deep links
 */
export const createWhatsAppOrderLink = (phone: string, message: string): string => {
  const normalizedPhone = normalizeWhatsAppPhone(phone);
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${normalizedPhone}?text=${encodedMessage}`;
};

/**
 * Sends automated WhatsApp dispatch alert to 8977855998 and syncs with backend
 */
export const triggerWhatsAppDispatchAlert = async (order: DispatchOrderPayload): Promise<boolean> => {
  try {
    const message = formatWhatsAppOrderDispatchMessage(order);
    const normalizedPhone = normalizeWhatsAppPhone(DISPATCH_PHONE_PRIMARY);
    const encodedMessage = encodeURIComponent(message);
    const webFallbackUrl = `https://wa.me/${normalizedPhone}?text=${encodedMessage}`;

    // 1. Post to backend
    fetch('http://localhost:4000/api/orders/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(order),
    }).catch(() => null);

    // 2. Open WhatsApp for instant dispatch
    window.open(webFallbackUrl, '_blank', 'noopener');

    return true;
  } catch (err) {
    console.warn('[WhatsAppDispatch] Dispatch error:', err);
    return false;
  }
};
