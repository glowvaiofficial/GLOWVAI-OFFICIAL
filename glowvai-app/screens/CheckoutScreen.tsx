import React, { useState } from 'react';
import { AlertCircle, ArrowLeft, ArrowRight, Banknote, Building2, Check, CreditCard, LockKeyhole, Mail, MapPin, PackageOpen, Phone, ShieldCheck, Smartphone, Tag, UserRound, WalletCards, Zap } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { PaymentMethodType } from '../types';
import { startRazorpayPayment } from '../services/razorpay';

type CheckoutMethod = 'upi' | 'cod';

// The test-mode label and guide only appear when a Razorpay test key is configured.
const isRazorpayTestKey = (process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '').startsWith('rzp_test_');

export const CheckoutScreen: React.FC = () => {
  const { goBack, navigate, currentAddress, cart, cartAuthoritative, placeOrder, activeParams, customerDetails } = useApp();
  const [selectedMethod, setSelectedMethod] = useState<CheckoutMethod>('upi');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const couponDiscount = Number(activeParams?.couponDiscount || 0);
  const couponCode = activeParams?.couponCode as string | undefined;
  const finalAmount = Number(activeParams?.finalPayable ?? Math.max(0, cartAuthoritative.finalPayable - couponDiscount));
  const checkoutParams = { finalPayable: finalAmount, couponDiscount, couponCode };

  const editDetails = () => navigate('customer-details', { checkoutParams });
  const handlePlaceOrder = async () => {
    if (processing || !cart.length) return;
    if (!customerDetails) { editDetails(); return; }
    setProcessing(true);
    setError(null);
    try {
      const verification = selectedMethod === 'upi'
        ? await startRazorpayPayment({ items: cart, address: currentAddress, couponCode, expectedAmount: finalAmount, customer: customerDetails })
        : undefined;
      const order = await placeOrder(selectedMethod as PaymentMethodType, couponDiscount, verification);
      navigate('order-confirmation', { orderId: order.id });
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'We could not place this order.';
      if (message === 'PAYMENT_CANCELLED') navigate('payment-status', { status: 'cancelled', amount: finalAmount, checkoutParams });
      else if (message.startsWith('PAYMENT_FAILED:')) navigate('payment-status', { status: 'failed', amount: finalAmount, checkoutParams, message: message.slice(15) });
      else setError(message);
    } finally { setProcessing(false); }
  };

  return <main className="checkout-screen checkout-v3 commerce-flow-screen">
    <header className="commerce-flow-header checkout-header"><button onClick={goBack} aria-label="Go back"><ArrowLeft size={21} /></button><div><h1>Checkout</h1><p>{cart.reduce((sum, item) => sum + item.quantity, 0)} items · {currentAddress.deliveryMinutes} min delivery</p></div></header>
    <ol className="checkout-steps" aria-label="Checkout progress"><li className="is-done"><Check size={12} /> Bag</li><li className="is-current"><span>2</span> Details</li><li><span>3</span> Payment</li></ol>
    <div className="checkout-v3-body">
      <section className="checkout-delivery-strip"><Zap size={19} fill="currentColor" /><div><b>Delivery in about {currentAddress.deliveryMinutes} minutes</b><span>from your nearby fulfilment point</span></div></section>

      <section className="checkout-v3-section checkout-person">
        <div className="checkout-v3-title"><div><span>1</span><h2>Receiver details</h2></div>{customerDetails && <button onClick={editDetails}>Edit</button>}</div>
        {customerDetails ? <div className="checkout-person-saved"><span><UserRound size={19} /></span><div><b>{customerDetails.fullName}</b><p><Phone size={12} /> {customerDetails.phoneNumber}</p>{customerDetails.email && <p><Mail size={12} /> {customerDetails.email}</p>}</div><Check size={18} /></div> : <button className="checkout-add-details" onClick={editDetails}><span><UserRound size={19} /></span><div><b>Add contact details</b><small>Required before placing your first order</small></div><ArrowRight size={18} /></button>}
      </section>

      <section className="checkout-v3-section checkout-address-v3">
        <div className="checkout-v3-title"><div><span>2</span><h2>Delivery address</h2></div><button onClick={() => navigate('profile')}>Change</button></div>
        <div><MapPin size={19} /><p><b>{currentAddress.label} · {currentAddress.area}</b><span>{currentAddress.street}, {currentAddress.city} · {currentAddress.pincode}</span></p></div>
      </section>

      <section className="checkout-v3-section checkout-bag-v3 checkout-summary">
        <div className="checkout-v3-title"><div><span>3</span><h2>Your bag</h2></div><button onClick={goBack}>Edit bag</button></div>
        {cart.map((item) => { const variant = item.product.variants.find((entry) => entry.id === item.variantId) || item.product.variants[0]; return <article key={item.id}><div className="checkout-item-image"><PackageOpen /><img src={item.product.images[0]} alt="" /></div><div><b>{item.product.name}</b><small>{variant.size} · Qty {item.quantity}</small></div><strong>₹{variant.price * item.quantity}</strong></article>; })}
      </section>

      {couponCode && <div className="checkout-coupon"><Tag size={18} /><div><b>{couponCode} applied</b><p>You save ₹{couponDiscount}</p></div><Check size={18} /></div>}

      <section className="checkout-v3-section checkout-payment-v3 checkout-payment">
        <div className="checkout-v3-title"><div><span>4</span><h2>Payment method</h2></div><em><LockKeyhole size={12} /> Secure</em></div>
        <button className={selectedMethod === 'upi' ? 'is-selected' : ''} onClick={() => { setSelectedMethod('upi'); setError(null); }}><i>{selectedMethod === 'upi' && <Check size={13} />}</i><span className="payment-brand-icon"><Smartphone size={20} /></span><p><b>Pay online {isRazorpayTestKey && <small>TEST MODE</small>}</b><span>Secure checkout powered by Razorpay</span></p><ArrowRight size={18} /></button>
        <div className="checkout-method-icons" aria-label="Available online methods"><span><Smartphone size={15} /> UPI</span><span><CreditCard size={15} /> Cards</span><span><Building2 size={15} /> Banks</span><span><WalletCards size={15} /> Wallets</span></div>
        {isRazorpayTestKey && selectedMethod === 'upi' && <aside className="checkout-test-guide"><b>Testing on your phone?</b><p>Do not use a real UPI app or QR in test mode. Choose Cards, Netbanking or Wallet in Razorpay, or enter UPI ID <code>success@razorpay</code>.</p></aside>}
        <button className={selectedMethod === 'cod' ? 'is-selected' : ''} onClick={() => { setSelectedMethod('cod'); setError(null); }}><i>{selectedMethod === 'cod' && <Check size={13} />}</i><span className="payment-brand-icon"><Banknote size={20} /></span><p><b>Cash on delivery</b><span>Cash or UPI QR when the order arrives</span></p><ArrowRight size={18} /></button>
      </section>

      <section className="checkout-v3-section checkout-bill-v3 checkout-bill"><h2>Bill details</h2><dl><div><dt>Item total</dt><dd>₹{cartAuthoritative.itemSubtotal}</dd></div><div className="is-saving"><dt>Product savings</dt><dd>−₹{cartAuthoritative.discountTotal}</dd></div>{couponDiscount > 0 && <div className="is-saving"><dt>{couponCode || 'Coupon'}</dt><dd>−₹{couponDiscount}</dd></div>}{cartAuthoritative.insuranceTotal > 0 && <div><dt>Suitability cover</dt><dd>+₹{cartAuthoritative.insuranceTotal}</dd></div>}<div><dt>Delivery fee</dt><dd>{cartAuthoritative.deliveryFee ? `₹${cartAuthoritative.deliveryFee}` : 'FREE'}</dd></div><div className="bill-total"><dt>To pay</dt><dd>₹{finalAmount}</dd></div></dl></section>
      <div className="checkout-security"><ShieldCheck size={17} /><span>{selectedMethod === 'cod' ? 'Pay only after your order reaches the door.' : 'Order is created only after Razorpay verifies the payment.'}</span></div>
      {error && <div className="checkout-error" role="alert"><AlertCircle size={17} /><span>{error}</span><button onClick={handlePlaceOrder}>Retry</button></div>}
      <div className="checkout-v3-clearance" />
    </div>
    <footer className={`checkout-v3-footer checkout-place-order${processing ? ' is-processing' : ''}`}><div><small>{selectedMethod === 'cod' ? 'Pay on delivery' : 'Secure payment'}</small><b>₹{finalAmount}</b></div><button onClick={handlePlaceOrder} disabled={processing || !cart.length}>{processing ? <><span className="checkout-spinner" /> Verifying order</> : <>{!customerDetails ? 'Add details' : selectedMethod === 'cod' ? 'Place order' : 'Pay securely'} <ArrowRight size={18} /></>}</button></footer>
    {processing && <div className="checkout-processing" role="status"><div><span className="payment-pulse"><LockKeyhole size={23} /></span><h2>{selectedMethod === 'cod' ? 'Placing your order' : 'Connecting secure payment'}</h2><p>Please don’t close or refresh this screen.</p><i /><i /><i /></div></div>}
  </main>;
};
