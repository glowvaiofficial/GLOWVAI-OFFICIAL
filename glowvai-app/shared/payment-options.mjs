// Payment options that depend on server settings. Pure functions with no imports, so the shop's server routes, the
// browser checkout and the node tests all use the same rule.
//
// EMI is offered only when the server setting RAZORPAY_EMI_ENABLED is exactly "true". The Razorpay account must also
// have EMI switched on in the Razorpay dashboard; the flag alone does not make Razorpay offer it.

export function emiAvailable(env) {
  return Boolean(env) && env.RAZORPAY_EMI_ENABLED === "true";
}

// Extra Razorpay Checkout options. Nothing is added unless EMI is available, so an off flag never reaches Razorpay.
// When EMI is on, the other methods are listed explicitly so that asking for EMI does not hide them.
export function checkoutMethodOptions(emi) {
  if (emi !== true) return {};
  return { method: { upi: true, card: true, netbanking: true, wallet: true, emi: true } };
}
