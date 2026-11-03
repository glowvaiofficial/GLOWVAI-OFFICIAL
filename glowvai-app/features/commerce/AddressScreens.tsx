import React, { useState } from 'react';
import { Briefcase, Home, MapPin, MoreHorizontal, Plus, Trash2 } from 'lucide-react';
import { useApp } from '../../context/useApp';
import type { ScreenName } from '../../context/contextDefinition';
import { safeHapticSelection } from '../../core/utils/haptics';
import { useAddressStore, toNovAddress, isServiceablePincode, type SavedAddress } from './lib/addressStore';
import { FlowHeader } from './components/shared';

const LABEL_ICON = { Home, Work: Briefcase, Other: MoreHorizontal } as const;

// Checkout screens that send the customer here to pick or add an address, and get them back afterwards.
const RETURN_SCREENS: ScreenName[] = ['checkout-review', 'checkout-express'];
export const readReturnTo = (params: unknown): ScreenName | undefined => {
  const value = (params as { returnTo?: string } | null)?.returnTo;
  return RETURN_SCREENS.find((screen) => screen === value);
};

export const AddressListScreen: React.FC = () => {
  const { goBack, navigate, selectAddress, activeParams } = useApp();
  const returnTo = readReturnTo(activeParams);
  const addresses = useAddressStore((s) => s.addresses);
  const selectedId = useAddressStore((s) => s.selectedId);
  const selectSaved = useAddressStore((s) => s.selectAddress);
  const removeAddress = useAddressStore((s) => s.removeAddress);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const choose = (address: SavedAddress) => {
    safeHapticSelection();
    selectSaved(address.id);
    selectAddress(toNovAddress(address));
    navigate(returnTo ?? 'location-serviceability');
  };
  const addNew = () => navigate('location-setup', returnTo ? { returnTo } : undefined);

  return (
    <main className="commerce-screen commerce-addresses">
      <FlowHeader
        title={returnTo ? 'Choose delivery address' : 'Saved addresses'}
        subtitle={addresses.length > 0 ? `${addresses.length} saved` : undefined}
        onBack={goBack}
      />

      <div className="commerce-body commerce-address-grid">
        {addresses.length === 0 && (
          <div className="commerce-empty-state is-card">
            <span className="commerce-empty-icon">
              <MapPin size={28} />
            </span>
            <h2>No saved addresses yet</h2>
            <p>Add your home or office so checkout is one tap away.</p>
            <button className="commerce-primary" onClick={addNew}>
              <Plus size={16} /> Add new address
            </button>
          </div>
        )}

        {addresses.map((address) => {
          const Icon = LABEL_ICON[address.label] ?? MoreHorizontal;
          const isSelected = address.id === selectedId;
          const serviceable = isServiceablePincode(address.pincode);
          return (
            <article className={isSelected ? 'commerce-card commerce-address is-selected' : 'commerce-card commerce-address'} key={address.id}>
              <button className="commerce-address-pick" onClick={() => choose(address)} aria-pressed={isSelected}>
                <span className="commerce-suggest-icon">
                  <Icon size={16} />
                </span>
                <span>
                  <span className="commerce-tag-row">
                    <b>{address.label}</b>
                    {isSelected && <i className="commerce-tag">Selected</i>}
                    {address.isDefault && <i className="commerce-tag">Default</i>}
                    {!serviceable && <i className="commerce-tag is-warn">Not serviceable</i>}
                  </span>
                  <span className="commerce-muted">
                    {address.recipientName} · {address.phoneNumber}
                  </span>
                  <small>
                    {address.houseNo}
                    {address.buildingName ? `, ${address.buildingName}` : ''}, {address.areaAddress}, {address.city} {address.pincode}
                  </small>
                </span>
              </button>

              <div className="commerce-address-actions">
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
                  <>
                    <button className="commerce-link" onClick={() => choose(address)}>
                      {returnTo ? 'Deliver here' : 'Use this address'}
                    </button>
                    <button className="commerce-link is-danger" onClick={() => setConfirmId(address.id)} aria-label={`Delete ${address.label} address`}>
                      <Trash2 size={13} /> Delete
                    </button>
                  </>
                )}
              </div>
            </article>
          );
        })}

        {addresses.length > 0 && (
          <button className="commerce-address-add-tile" onClick={addNew}>
            <span className="commerce-suggest-icon">
              <Plus size={18} />
            </span>
            <b>Add new address</b>
          </button>
        )}
      </div>

      {addresses.length > 0 && (
        <footer className="commerce-sticky-bar commerce-phone-only">
          <button className="commerce-primary is-wide" onClick={addNew}>
            <Plus size={16} /> Add new address
          </button>
        </footer>
      )}
    </main>
  );
};

const LABELS: SavedAddress['label'][] = ['Home', 'Work', 'Other'];

// Final step: house details, recipient and label. Saves to the address store and the NOV header address.
export const AddAddressScreen: React.FC = () => {
  const { activeParams, goBack, navigate, addAddress, showToast, customerDetails, user } = useApp();
  const params = (activeParams || {}) as { address?: string; latitude?: number; longitude?: number; pincode?: string };
  const returnTo = readReturnTo(activeParams);
  const saveAddress = useAddressStore((s) => s.saveAddress);
  const hasAddresses = useAddressStore((s) => s.addresses.length > 0);

  const [houseNo, setHouseNo] = useState('');
  const [buildingName, setBuildingName] = useState('');
  const [landmark, setLandmark] = useState('');
  const [recipientName, setRecipientName] = useState(customerDetails?.fullName || user?.name || '');
  const [phoneNumber, setPhoneNumber] = useState(
    (customerDetails?.phoneNumber || user?.phoneNumber || '').replace(/^\+91\s*/, '').replace(/\D/g, '').slice(-10)
  );
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
    navigate(returnTo && isServiceablePincode(address.pincode) ? returnTo : 'location-serviceability', returnTo ? { returnTo } : undefined);
  };

  return (
    <main className="commerce-screen commerce-addresses commerce-address-form has-aside">
      <FlowHeader title="Add address" subtitle="Complete the details for your delivery partner" onBack={goBack} />

      <form id="commerce-address-form" className="commerce-body commerce-split" onSubmit={save} noValidate>
        <div className="commerce-main">
          <section className="commerce-card commerce-form" aria-labelledby="addr-where">
            <h2 id="addr-where">Address</h2>
            <Field label="House / flat number" error={errors.houseNo}>
              <input value={houseNo} onChange={(e) => setHouseNo(e.target.value)} autoComplete="address-line1" />
            </Field>
            <Field label="Building or society (optional)">
              <input value={buildingName} onChange={(e) => setBuildingName(e.target.value)} autoComplete="address-line2" />
            </Field>
            <Field label="Area and street" error={errors.areaAddress}>
              <textarea rows={2} value={areaAddress} onChange={(e) => setAreaAddress(e.target.value)} />
            </Field>
            <div className="commerce-field-row">
              <Field label="Landmark (optional)">
                <input value={landmark} onChange={(e) => setLandmark(e.target.value)} />
              </Field>
              <Field label="Pincode" error={errors.pincode}>
                <input inputMode="numeric" maxLength={6} value={pincode} onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))} autoComplete="postal-code" />
              </Field>
            </div>
            {pincode.length === 6 && !isServiceablePincode(pincode) && (
              <p className="commerce-warn">We deliver only to Vijayawada pincodes (520xxx) right now. You can still save this address.</p>
            )}
          </section>
        </div>

        <div className="commerce-aside">
          <section className="commerce-card commerce-form" aria-labelledby="addr-who">
            <h2 id="addr-who">Receiver</h2>
            <Field label="Receiver name" error={errors.recipientName}>
              <input value={recipientName} onChange={(e) => setRecipientName(e.target.value)} autoComplete="name" />
            </Field>
            <Field label="Mobile number" error={errors.phoneNumber}>
              <input
                inputMode="tel"
                maxLength={10}
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                autoComplete="tel-national"
              />
            </Field>
            <Field label="Delivery instructions (optional)">
              <input value={instructions} onChange={(e) => setInstructions(e.target.value)} />
            </Field>
          </section>

          <section className="commerce-card">
            <h2>Save as</h2>
            <div className="commerce-segment" role="radiogroup" aria-label="Address type">
              {LABELS.map((item) => (
                <button type="button" key={item} role="radio" aria-checked={label === item} className={label === item ? 'is-on' : ''} onClick={() => setLabel(item)}>
                  {item}
                </button>
              ))}
            </div>
            {hasAddresses && (
              <label className="commerce-check">
                <input type="checkbox" checked={isDefault} onChange={() => setIsDefault(!isDefault)} />
                Make this my default address
              </label>
            )}
          </section>

          <button className="commerce-primary is-wide commerce-aside-cta" type="submit">
            Save address
          </button>
        </div>
      </form>

      <footer className="commerce-sticky-bar">
        <button className="commerce-primary is-wide" type="submit" form="commerce-address-form">
          Save address
        </button>
      </footer>
    </main>
  );
};

const Field: React.FC<{ label: string; error?: string; children: React.ReactElement }> = ({ label, error, children }) => (
  <label className="commerce-field">
    <span>{label}</span>
    {children}
    {error && <em className="commerce-error">{error}</em>}
  </label>
);
