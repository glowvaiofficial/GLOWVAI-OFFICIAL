import React, { useId, useState } from 'react';
import { ArrowRight, Mail, Phone, ShieldCheck, UserRound } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { FlowHeader } from '../features/commerce/components/shared';

const NOTE_LIMIT = 90;

export const CustomerDetailsScreen: React.FC = () => {
  const { goBack, navigate, customerDetails, saveCustomerDetails, user, activeParams } = useApp();
  const [fullName, setFullName] = useState(customerDetails?.fullName || user?.name || '');
  const [phoneNumber, setPhoneNumber] = useState((customerDetails?.phoneNumber || user?.phoneNumber || '').replace(/^\+91\s*/, ''));
  const [email, setEmail] = useState(customerDetails?.email || user?.email || '');
  const [deliveryNote, setDeliveryNote] = useState(customerDetails?.deliveryNote || '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fromProfile = activeParams?.from === 'profile';
  const ids = { name: useId(), phone: useId(), email: useId(), note: useId() };

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

  const errorProps = (key: string, id: string) => (errors[key] ? { 'aria-invalid': true, 'aria-describedby': `${id}-msg` } : {});

  return (
    <main className="commerce-screen commerce-details">
      <FlowHeader title={customerDetails ? 'Contact details' : 'Who is receiving this?'} subtitle="Used only for delivery and payment updates" onBack={goBack} />

      <form className="commerce-body" onSubmit={submit} noValidate>
        {Object.keys(errors).length > 0 && (
          <p className="commerce-form-alert" role="alert">
            Check the highlighted fields.
          </p>
        )}

        <section className="commerce-card commerce-form">
          <div className={errors.fullName ? 'commerce-field has-error' : 'commerce-field'}>
            <label htmlFor={ids.name}>Full name</label>
            <span className="commerce-field-prefix">
              <UserRound size={17} aria-hidden="true" />
              <input id={ids.name} value={fullName} onChange={(event) => setFullName(event.target.value)} autoComplete="name" placeholder="Name for delivery" {...errorProps('fullName', ids.name)} />
            </span>
            {errors.fullName && <em className="commerce-error" id={`${ids.name}-msg`}>{errors.fullName}</em>}
          </div>

          <div className={errors.phoneNumber ? 'commerce-field has-error' : 'commerce-field'}>
            <label htmlFor={ids.phone}>Mobile number</label>
            <span className="commerce-field-prefix">
              <Phone size={17} aria-hidden="true" />
              <b>+91</b>
              <input
                id={ids.phone}
                value={phoneNumber}
                onChange={(event) => setPhoneNumber(event.target.value.replace(/\D/g, '').slice(0, 10))}
                inputMode="numeric"
                autoComplete="tel-national"
                placeholder="10-digit number"
                {...errorProps('phoneNumber', ids.phone)}
              />
            </span>
            {errors.phoneNumber && <em className="commerce-error" id={`${ids.phone}-msg`}>{errors.phoneNumber}</em>}
          </div>

          <div className={errors.email ? 'commerce-field has-error' : 'commerce-field'}>
            <label htmlFor={ids.email}>
              Email <i>optional</i>
            </label>
            <span className="commerce-field-prefix">
              <Mail size={17} aria-hidden="true" />
              <input id={ids.email} value={email} onChange={(event) => setEmail(event.target.value)} inputMode="email" autoComplete="email" placeholder="For invoice and payment receipt" {...errorProps('email', ids.email)} />
            </span>
            {errors.email && <em className="commerce-error" id={`${ids.email}-msg`}>{errors.email}</em>}
          </div>

          <div className="commerce-field">
            <label htmlFor={ids.note}>
              Delivery note <i>optional</i>
            </label>
            <textarea
              id={ids.note}
              rows={3}
              value={deliveryNote}
              onChange={(event) => setDeliveryNote(event.target.value.slice(0, NOTE_LIMIT))}
              placeholder="Gate, floor or landmark instructions"
              aria-describedby={`${ids.note}-count`}
            />
            <small className="commerce-field-count" id={`${ids.note}-count`}>
              {deliveryNote.length}/{NOTE_LIMIT}
            </small>
          </div>
        </section>

        <p className="commerce-secure-note">
          <ShieldCheck size={16} />
          Saved on this device for faster checkout. You can change it anytime from your profile.
        </p>

        <div className="commerce-form-footer">
          <button className="commerce-primary is-wide" type="submit">
            Save and continue <ArrowRight size={18} />
          </button>
        </div>
      </form>
    </main>
  );
};
