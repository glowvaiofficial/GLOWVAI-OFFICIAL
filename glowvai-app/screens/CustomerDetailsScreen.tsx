import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Mail, Phone, ShieldCheck, UserRound } from 'lucide-react';
import { useApp } from '../context/AppContext';

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

  return <main className="customer-details-screen commerce-flow-screen">
    <header className="commerce-flow-header"><button onClick={goBack} aria-label="Go back"><ArrowLeft size={21} /></button><div><h1>{customerDetails ? 'Contact details' : 'Who is receiving this?'}</h1><p>Used only for delivery and payment updates</p></div></header>
    <form className="customer-details-form" onSubmit={submit} noValidate>
      <div className="customer-trust-line"><ShieldCheck size={17} /><span>Your details are saved on this device for faster checkout.</span></div>
      <label><span>Full name</span><div className={errors.fullName ? 'has-error' : ''}><UserRound size={18} /><input value={fullName} onChange={(event) => setFullName(event.target.value)} autoComplete="name" placeholder="Name for delivery" /></div>{errors.fullName && <small>{errors.fullName}</small>}</label>
      <label><span>Mobile number</span><div className={errors.phoneNumber ? 'has-error' : ''}><Phone size={18} /><b>+91</b><input value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value.replace(/\D/g, '').slice(0, 10))} inputMode="numeric" autoComplete="tel-national" placeholder="10-digit number" /></div>{errors.phoneNumber && <small>{errors.phoneNumber}</small>}</label>
      <label><span>Email <em>optional</em></span><div className={errors.email ? 'has-error' : ''}><Mail size={18} /><input value={email} onChange={(event) => setEmail(event.target.value)} inputMode="email" autoComplete="email" placeholder="For invoice and payment receipt" /></div>{errors.email && <small>{errors.email}</small>}</label>
      <label><span>Delivery note <em>optional</em></span><textarea value={deliveryNote} onChange={(event) => setDeliveryNote(event.target.value.slice(0, 90))} placeholder="Gate, floor or landmark instructions" /><i>{deliveryNote.length}/90</i></label>
      <div className="customer-save-note"><Check size={15} /><span>You can edit this anytime from Profile.</span></div>
      <button className="customer-details-submit" type="submit">Save and continue <ArrowRight size={18} /></button>
    </form>
  </main>;
};
