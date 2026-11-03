import React, { useState } from 'react';
import { ArrowRight, Check, Mail, Phone, ShieldCheck, UserRound } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { FlowHeader } from '../features/commerce/components/shared';
import '../features/commerce/commerce.css';
import '../responsive/commerce-ported.css';

export const CustomerDetailsScreen: React.FC = () => {
  const { goBack, navigate, customerDetails, saveCustomerDetails, user, activeParams } = useApp();
  const [fullName, setFullName] = useState(customerDetails?.fullName || user?.name || '');
  const [phoneNumber, setPhoneNumber] = useState(customerDetails?.phoneNumber || user?.phoneNumber?.replace(/^\+91\s*/, '') || '');
  const [email, setEmail] = useState(customerDetails?.email || user?.email || '');
  const [deliveryNote, setDeliveryNote] = useState(customerDetails?.deliveryNote || '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fromProfile = activeParams?.from === 'profile';

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (fullName.trim().length < 2) nextErrors.fullName = 'Enter the name the delivery partner should use.';
    if (!/^[6-9]\d{9}$/.test(phoneNumber.replace(/\D/g, ''))) nextErrors.phoneNumber = 'Enter a valid 10-digit Indian mobile number.';
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) nextErrors.email = 'Enter a valid email address or leave it blank.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    saveCustomerDetails({ fullName: fullName.trim(), phoneNumber: `+91 ${phoneNumber.replace(/\D/g, '')}`, email: email.trim(), deliveryNote: deliveryNote.trim() });
    navigate(fromProfile ? 'profile' : 'checkout', activeParams?.checkoutParams);
  };

  return <main className="commerce-screen has-aside commerce-customer-details">
    <FlowHeader title={customerDetails ? 'Contact details' : 'Who is receiving this?'} subtitle="Used only for delivery and payment updates" onBack={goBack} />
    <form id="customer-details-form" className="commerce-body commerce-split" onSubmit={submit} noValidate>
      <div className="commerce-main">
        <section className="commerce-card commerce-form" aria-label="Contact details">
          <label className="commerce-field"><span>Full name</span><div className={`commerce-search${errors.fullName ? ' has-error' : ''}`}><UserRound size={18} /><input value={fullName} onChange={(event) => setFullName(event.target.value)} autoComplete="name" placeholder="Name for delivery" /></div>{errors.fullName && <em className="commerce-error">{errors.fullName}</em>}</label>
          <label className="commerce-field"><span>Mobile number</span><div className={`commerce-search${errors.phoneNumber ? ' has-error' : ''}`}><Phone size={18} /><b>+91</b><input value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value.replace(/\D/g, '').slice(0, 10))} inputMode="numeric" autoComplete="tel-national" placeholder="10-digit number" /></div>{errors.phoneNumber && <em className="commerce-error">{errors.phoneNumber}</em>}</label>
          <label className="commerce-field"><span>Email <em>optional</em></span><div className={`commerce-search${errors.email ? ' has-error' : ''}`}><Mail size={18} /><input value={email} onChange={(event) => setEmail(event.target.value)} inputMode="email" autoComplete="email" placeholder="For invoice and payment receipt" /></div>{errors.email && <em className="commerce-error">{errors.email}</em>}</label>
          <label className="commerce-field"><span>Delivery note <em>optional</em></span><textarea rows={3} value={deliveryNote} onChange={(event) => setDeliveryNote(event.target.value.slice(0, 90))} placeholder="Gate, floor or landmark instructions" /><i className="commerce-field-count">{deliveryNote.length}/90</i></label>
        </section>
      </div>
      <div className="commerce-aside">
        <section className="commerce-card">
          <p className="commerce-muted"><ShieldCheck size={16} /><span>Your details are saved on this device for faster checkout.</span></p>
          <p className="commerce-muted commerce-customer-note"><Check size={16} /><span>You can edit this anytime from Profile.</span></p>
          <button className="commerce-primary is-wide commerce-aside-cta" type="submit">Save and continue <ArrowRight size={18} /></button>
        </section>
      </div>
    </form>
    <div className="commerce-sticky-bar">
      <button className="commerce-primary is-wide" type="submit" form="customer-details-form">Save and continue <ArrowRight size={18} /></button>
    </div>
  </main>;
};
