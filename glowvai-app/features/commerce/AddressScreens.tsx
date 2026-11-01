import React, { useState } from 'react';
import { Briefcase, CheckCircle2, Home, MapPin, MoreHorizontal, Plus, Trash2 } from 'lucide-react';
import { useApp } from '../../context/useApp';
import { safeHapticSelection } from '../../core/utils/haptics';
import { useAddressStore, toNovAddress, isServiceablePincode, type SavedAddress } from './lib/addressStore';
import { FlowHeader } from './components/shared';

const LABEL_ICON = { Home, Work: Briefcase, Other: MoreHorizontal } as const;

export const AddressListScreen: React.FC = () => {
  const { goBack, navigate, selectAddress } = useApp();
  const addresses = useAddressStore((s) => s.addresses);
  const selectedId = useAddressStore((s) => s.selectedId);
  const selectSaved = useAddressStore((s) => s.selectAddress);
  const removeAddress = useAddressStore((s) => s.removeAddress);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const choose = (address: SavedAddress) => {
    safeHapticSelection();
    selectSaved(address.id);
    selectAddress(toNovAddress(address));
    navigate('location-serviceability');
  };

  return (
    <main className="commerce-screen commerce-addresses">
      <FlowHeader title="Saved addresses" subtitle={addresses.length ? 'Pick where this order should go' : 'No addresses yet'} onBack={goBack} />

      <div className="commerce-body">
        {addresses.length === 0 && (
          <div className="commerce-empty-state is-inline">
            <span className="commerce-empty-icon">
              <MapPin size={28} />
            </span>
            <h2>No saved addresses yet</h2>
            <p>Add your home or office so checkout is one tap away.</p>
          </div>
        )}

        {addresses.map((address) => {
          const Icon = LABEL_ICON[address.label] ?? MoreHorizontal;
          const isSelected = address.id === selectedId;
          const serviceable = isServiceablePincode(address.pincode);
          return (
            <article className={isSelected ? 'commerce-card commerce-address is-selected' : 'commerce-card commerce-address'} key={address.id}>
              <button className="commerce-address-pick" onClick={() => choose(address)}>
                <span className="commerce-suggest-icon">
                  <Icon size={16} />
                </span>
                <span>
                  <span className="commerce-tag-row">
                    <b>{address.label}</b>
                    {address.isDefault && <span className="commerce-tag">Default</span>}
                    {!serviceable && <span className="commerce-tag is-warn">Not serviceable</span>}
                  </span>
                  <span className="commerce-muted">{address.recipientName} · {address.phoneNumber}</span>
                  <small>
                    {address.houseNo}
                    {address.buildingName ? `, ${address.buildingName}` : ''}, {address.areaAddress}, {address.city} {address.pincode}
                  </small>
                </span>
              </button>

              <div className="commerce-address-actions">
                {isSelected && confirmId !== address.id && (
                  <span className="commerce-address-current">
                    <CheckCircle2 size={14} /> Delivering here
                  </span>
                )}
                {confirmId === address.id ? (
                  <>
                    <span>Remove this address?</span>
                    <button className="commerce-link" onClick={() => setConfirmId(null)}>
                      Keep
                    </button>
                    <button
                      className="commerce-link is-danger"
                      onClick={() => {
                        removeAddress(address.id);
                        setConfirmId(null);
                      }}
                    >
                      Remove
                    </button>
                  </>
                ) : (
                  <button className="commerce-link is-danger" onClick={() => setConfirmId(address.id)}>
                    <Trash2 size={13} /> Delete
                  </button>
                )}
              </div>
            </article>
          );
        })}

        <button className="commerce-address-add-tile" onClick={() => navigate('location-setup')}>
          <span className="commerce-suggest-icon">
            <Plus size={18} />
          </span>
          Add new address
        </button>
      </div>

      <footer className="commerce-sticky-bar commerce-address-list-bar">
        <button className="commerce-primary is-wide" onClick={() => navigate('location-setup')}>
          <Plus size={16} /> Add new address
        </button>
      </footer>
    </main>
  );
};

const LABELS: SavedAddress['label'][] = ['Home', 'Work', 'Other'];

// Final step: house details, recipient and label. Saves to the address store and the NOV header address.
export const AddAddressScreen: React.FC = () => {
  const { activeParams, goBack, navigate, addAddress, showToast } = useApp();
  const params = (activeParams || {}) as { address?: string; latitude?: number; longitude?: number; pincode?: string };
  const saveAddress = useAddressStore((s) => s.saveAddress);

  const [houseNo, setHouseNo] = useState('');
  const [buildingName, setBuildingName] = useState('');
  const [landmark, setLandmark] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [areaAddress, setAreaAddress] = useState(params.address || '');
  const [pincode, setPincode] = useState(params.pincode || '');
  const [label, setLabel] = useState<SavedAddress['label']>('Home');
  const [instructions, setInstructions] = useState('');
  const [isDefault, setIsDefault] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const next: Record<string, string> = {};
    if (!houseNo.trim()) next.houseNo = 'House or flat number is required';
    if (!recipientName.trim()) next.recipientName = 'Receiver name is required';
    if (!/^[6-9]\d{9}$/.test(phoneNumber.trim())) next.phoneNumber = 'Enter a valid 10-digit mobile number';
    if (!areaAddress.trim()) next.areaAddress = 'Area is required';
    if (!/^\d{6}$/.test(pincode.trim())) next.pincode = 'Enter a 6-digit pincode';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    const address: SavedAddress = {
      id: `addr-${Date.now()}`,
      label,
      recipientName: recipientName.trim(),
      phoneNumber: phoneNumber.trim(),
      houseNo: houseNo.trim(),
      buildingName: buildingName.trim() || undefined,
      landmark: landmark.trim() || undefined,
      areaAddress: areaAddress.trim(),
      city: 'Vijayawada',
      pincode: pincode.trim(),
      latitude: params.latitude,
      longitude: params.longitude,
      deliveryInstructions: instructions.trim() || undefined,
      isDefault,
    };
    saveAddress(address);
    addAddress(toNovAddress(address));
    showToast('Address saved');
    navigate('location-serviceability');
  };

  return (
    <main className="commerce-screen commerce-addresses">
      <FlowHeader title="Add address" subtitle="Details the rider needs to reach you" onBack={goBack} />

      <form className="commerce-body" onSubmit={save} noValidate>
        {Object.keys(errors).length > 0 && (
          <p className="commerce-form-alert" role="alert">
            Check the highlighted fields.
          </p>
        )}
        <section className="commerce-card commerce-form" aria-labelledby="address-section-title">
          <h2 id="address-section-title">Address</h2>
          <div className="commerce-form-row">
            <Field label="House / flat number" error={errors.houseNo}>
              <input value={houseNo} onChange={(e) => setHouseNo(e.target.value)} placeholder="e.g. Flat 402" autoComplete="address-line1" />
            </Field>
            <Field label="Building or society" optional>
              <input value={buildingName} onChange={(e) => setBuildingName(e.target.value)} placeholder="e.g. Sri Krishna Apartments" />
            </Field>
          </div>
          <Field label="Area and street" error={errors.areaAddress}>
            <textarea rows={2} value={areaAddress} onChange={(e) => setAreaAddress(e.target.value)} placeholder="Street, area or colony" autoComplete="address-line2" />
          </Field>
          <div className="commerce-form-row">
            <Field label="Landmark" optional>
              <input value={landmark} onChange={(e) => setLandmark(e.target.value)} placeholder="e.g. Near water tank" />
            </Field>
            <Field
              label="Pincode"
              error={errors.pincode}
              hint={pincode.length === 6 && !isServiceablePincode(pincode) ? 'We deliver to Vijayawada pincodes (520xxx) right now.' : undefined}
            >
              <input inputMode="numeric" maxLength={6} value={pincode} onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))} placeholder="6 digits" autoComplete="postal-code" />
            </Field>
          </div>
          <p className="commerce-field-static">
            <span>City</span>
            <b>Vijayawada</b>
          </p>
        </section>

        <section className="commerce-card commerce-form" aria-labelledby="receiver-section-title">
          <h2 id="receiver-section-title">Receiver</h2>
          <div className="commerce-form-row">
            <Field label="Receiver name" error={errors.recipientName}>
              <input value={recipientName} onChange={(e) => setRecipientName(e.target.value)} autoComplete="name" placeholder="Full name" />
            </Field>
            <Field label="Mobile number" error={errors.phoneNumber} prefix="+91">
              <input
                inputMode="tel"
                maxLength={10}
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                autoComplete="tel-national"
                placeholder="10-digit number"
              />
            </Field>
          </div>
          <Field label="Delivery instructions" optional>
            <input value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="e.g. Ring the bell twice" />
          </Field>
        </section>

        <section className="commerce-card">
          <div className="commerce-card-head">
            <h2>Save as</h2>
          </div>
          <div className="commerce-segment" role="radiogroup" aria-label="Address type">
            {LABELS.map((item) => (
              <button type="button" key={item} role="radio" aria-checked={label === item} className={label === item ? 'is-on' : ''} onClick={() => setLabel(item)}>
                {item}
              </button>
            ))}
          </div>
          <label className="commerce-check">
            <input type="checkbox" checked={isDefault} onChange={() => setIsDefault(!isDefault)} />
            Make this my default address
          </label>
        </section>

        <div className="commerce-form-footer">
          <button className="commerce-primary is-wide" type="submit">
            Save and continue
          </button>
        </div>
      </form>
    </main>
  );
};

type FieldControl = React.ReactElement<React.InputHTMLAttributes<HTMLInputElement> & React.TextareaHTMLAttributes<HTMLTextAreaElement>>;

const Field: React.FC<{ label: string; error?: string; hint?: string; optional?: boolean; prefix?: string; children: FieldControl }> = ({
  label,
  error,
  hint,
  optional,
  prefix,
  children,
}) => {
  const id = React.useId();
  const message = error || hint;
  const control = React.cloneElement(children, {
    id,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': message ? `${id}-msg` : undefined,
  });
  return (
    <div className={error ? 'commerce-field has-error' : 'commerce-field'}>
      <label htmlFor={id}>
        {label}
        {optional && <i>optional</i>}
      </label>
      {prefix ? (
        <span className="commerce-field-prefix">
          <b>{prefix}</b>
          {control}
        </span>
      ) : (
        control
      )}
      {message && (
        <em className={error ? 'commerce-error' : 'commerce-field-hint'} id={`${id}-msg`}>
          {message}
        </em>
      )}
    </div>
  );
};
