/**
 * Razorpay Payments Gateway Service for GlowVAI
 * 
 * Features:
 * - Initiates server-side Razorpay Order (/api/payment/create-order)
 * - Manages seamless UPI deep-linking & payment sheet handoff
 * - Verifies payment signature via backend (/api/payment/verify)
 * - Zero client-side secrets: all signatures verified securely on the backend
 */


import { getBackendBaseUrl, getCloudBackendUrl } from './apiConfig';

export interface InitiatePaymentParams {
  orderId: string;
  orderAmount: number;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  paymentMethod: 'PHONEPE' | 'GPAY' | 'PAYTM' | 'BHIM' | 'CARD' | 'COD';
}

export interface PaymentSessionResult {
  success: boolean;
  orderId: string;
  razorpayOrderId?: string;
  razorpayKeyId?: string;
  status: 'SUCCESS' | 'PENDING' | 'FAILED';
  message?: string;
}

/**
 * 1. Initiates Razorpay Order with backend server
 */
export const initiateRazorpayOrder = async (
  params: InitiatePaymentParams
): Promise<PaymentSessionResult> => {
  const { orderId, orderAmount, customerName, customerPhone, customerEmail, paymentMethod } = params;

  // Handle COD immediately without gateway overhead
  if (paymentMethod === 'COD') {
    return {
      success: true,
      orderId,
      status: 'SUCCESS',
      message: 'Cash on Delivery selected. Pay upon arrival.',
    };
  }

  const candidateUrls = [
    `${getBackendBaseUrl()}/api/payment/create-order`,
    `http://localhost:4000/api/payment/create-order`,
    `${getCloudBackendUrl()}/api/payment/create-order`,
  ];

  for (const url of candidateUrls) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          orderAmount,
          customerName,
          customerPhone,
          customerEmail,
          paymentMethod,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.ok) {
          // If digital UPI app selected, attempt native UPI deep-link
          if (['PHONEPE', 'GPAY', 'PAYTM', 'BHIM'].includes(paymentMethod)) {
            try {
              const note = encodeURIComponent(`GlowVAI Order #${orderId}`);
              const upiUrl = `upi://pay?pa=8977855998@ibl&pn=glowvai&am=${orderAmount}&cu=INR&tn=${note}&tr=${orderId}&mode=02`;
              window.location.href = upiUrl;
            } catch {
              // Fallback gracefully
            }
          }

          return {
            success: true,
            orderId,
            razorpayOrderId: data.razorpayOrderId,
            razorpayKeyId: data.razorpayKeyId,
            status: 'SUCCESS',
          };
        }
      }
    } catch {
      // try next candidate endpoint
    }
  }

  // No payment server answered, so no payment session exists. Report failure rather than pretending it worked.
  return {
    success: false,
    orderId,
    status: 'FAILED',
    message: 'Could not reach the payment server. No payment was taken.',
  };
};

/**
 * 2. Verifies Razorpay payment signature on backend
 */
export const verifyRazorpayPayment = async (
  razorpayOrderId: string,
  razorpayPaymentId: string,
  razorpaySignature: string
): Promise<{ verified: boolean; status: string }> => {
  const candidateUrls = [
    `${getBackendBaseUrl()}/api/payment/verify`,
    `http://localhost:4000/api/payment/verify`,
    `${getCloudBackendUrl()}/api/payment/verify`,
  ];

  for (const url of candidateUrls) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          razorpay_order_id: razorpayOrderId,
          razorpay_payment_id: razorpayPaymentId,
          razorpay_signature: razorpaySignature,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        return { verified: data.verified === true, status: data.verified === true ? data.status || 'PAID' : 'FAILED' };
      }
    } catch {
      // continue
    }
  }

  // Verification could not be reached: treat the payment as not verified.
  return { verified: false, status: 'FAILED' };
};

// Backward compatibility aliases
export const initiateCashfreeOrder = initiateRazorpayOrder;
export const verifyCashfreePayment = async (orderId: string) => verifyRazorpayPayment(orderId, '', '');
