import React, { useEffect, useState } from 'react';
import { Briefcase, Home, MapPin, MoreHorizontal, Plus, Trash2 } from 'lucide-react';
import { useApp } from '../../context/useApp';
import type { ScreenName } from '../../context/contextDefinition';
import { safeHapticSelection } from '../../core/utils/haptics';
import type { SavedAddressInput, SavedAddressLabel, SavedAddressView } from '../../core/services/shopApi';
import { useAddressStore, toNovAddress, isServiceablePincode, type SavedAddress } from './lib/addressStore';
import { makeDefaultAddress, refreshSavedAddresses, removeSavedAddress, saveSavedAddress } from './lib/savedAddresses';
import { FlowHeader } from './components/shared';

// Up to five saved addresses. The server enforces the same limit; this only shapes the screen.
export const MAX_SAVED_ADDRESSES = 5;

const LABEL_ICON = { Home, Work: Briefcase, Other: MoreHorizontal } as const;

// Checkout screens that send the customer here to pick or add an address, and get them back afterwards.
const RETURN_SCREENS: ScreenName[] = ['checkout-review', 'checkout-express'];
export const readReturnTo = (params: unknown): ScreenName | undefined => {
  const value = (params as { returnTo?: string } | null)?.returnTo;
  return RETURN_SCREENS.find((screen) => screen === value);
};

// The address book (also the picker at checkout). Everything is read from and written to the server.
export const AddressListScreen: React.FC = () => {
  const { goBack, navigate, selectAddress, activeParams, showToast } = useApp();
  const returnTo = readReturnTo(activeParams);
  const addresses = useAddressStore((s) => s.addresses);
  const loaded = useAddressStore((s) => s.loaded);
  const selectedId = useAddressStore((s) => s.selectedId);
  const selectSaved = useAddressStore((s) => s.selectAddress);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    refreshSavedAddresses().then((res) => {
      if (!cancelled && !res.ok) setLoadError(res.error ?? 'Your addresses could not be loaded.');
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const choose = (address: SavedAddress) => {
    safeHapticSelection();
    selectSaved(address.id);
    selectAddress(toNovAddress(address));
    navigate(returnTo ?? 'location-serviceability');
  };
  const addNew = () => navigate('address-add', returnTo ? { returnTo } : undefined);
  const edit = (address: SavedAddress) => navigate('address-add', { addressId: address.id, ...(returnTo ? { returnTo } : {}) });
  const full = addresses.length >= MAX_SAVED_ADDRESSES;

  const makeDefault = async (address: SavedAddress) => {
    setBusyId(address.id);
    setMessage(null);
    const res = await makeDefaultAddress(address.id);
    setBusyId(null);
    if (res.ok) showToast(`${address.label} is now your default address`);
    else setMessage(res.error ?? 'Could not change the default address. Try again.');
  };

  const remove = async (address: SavedAddress) => {
    setBusyId(address.id);
    setMessage(null);
    const res = await removeSavedAddress(address.id);
    setBusyId(null);
    setConfirmId(null);
    if (res.ok) showToast('Address removed');
    else setMessage(res.error ?? 'Could not remove the address. Try again.');
  };

  return (
    <main className="commerce-screen commerce-addresses">
      <FlowHeader
        title={returnTo ? 'Choose delivery address' : 'Saved addresses'}
        subtitle={addresses.length > 0 ? `${addresses.length} of ${MAX_SAVED_ADDRESSES} saved` : undefined}
        onBack={goBack}
      />

      <div className="commerce-body commerce-address-grid">
        {loadError && (
          <p className="commerce-warn" role="alert">
            {loadError}
          </p>
        )}
        {message && (
          <p className="commerce-warn" role="alert">
            {message}
          </p>
        )}
        {!loaded && addresses.length === 0 && !loadError && <p className="commerce-muted">Loading your addresses...</p>}

        {loaded && addresses.length === 0 && (
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
          const busy = busyId === address.id;
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
                    {address.recipientName} · {address.phone}
                  </span>
                  <small>
                    {address.fullAddress}, {address.city} {address.pincode}
                    {address.landmark ? ` · Landmark: ${address.landmark}` : ''}
                  </small>
                </span>
              </button>

              <div className="commerce-address-actions">
                {confirmId === address.id ? (
                  <>
                    <span>{address.isDefault && addresses.length > 1 ? 'Remove this default? Another address becomes the default.' : 'Remove this address?'}</span>
                    <button className="commerce-link" onClick={() => setConfirmId(null)} disabled={busy}>
                      Keep
                    </button>
                    <button className="commerce-link is-danger" onClick={() => void remove(address)} disabled={busy}>
                      Remove
                    </button>
                  </>
                ) : (
                  <>
                    <button className="commerce-link" onClick={() => choose(address)} disabled={busy}>
                      {returnTo ? 'Deliver here' : 'Use this address'}
                    </button>
                    {!address.isDefault && (
                      <button className="commerce-link" onClick={() => void makeDefault(address)} disabled={busy}>
                        Set as default
                      </button>
                    )}
                    <button className="commerce-link" onClick={() => edit(address)} disabled={busy}>
                      Edit
                    </button>
                    <button className="commerce-link is-danger" onClick={() => setConfirmId(address.id)} disabled={busy} aria-label={`Delete ${address.label} address`}>
                      <Trash2 size={13} /> Delete
                    </button>
                  </>
                )}
              </div>
            </article>
          );
        })}

        {addresses.length > 0 && !full && (
          <button className="commerce-address-add-tile" onClick={addNew}>
            <span className="commerce-suggest-icon">
              <Plus size={18} />
            </span>
            <b>Add new address</b>
          </button>
        )}
        {full && <p className="commerce-muted">You have {MAX_SAVED_ADDRESSES} saved addresses. Delete one to add another.</p>}
      </div>

      {addresses.length > 0 && !full && (
        <footer className="commerce-sticky-bar commerce-phone-only">
          <button className="commerce-primary is-wide" onClick={addNew}>
            <Plus size={16} /> Add new address
          </button>
        </footer>
      )}
    </main>
  );
};

const LABELS: SavedAddressLabel[] = ['Home', 'Work', 'Other'];

// Adds a new address, or edits one (addressId in the params). Saves to the server, then to the header.
export const AddAddressScreen: React.FC = () => {
  const { activeParams, goBack, navigate, addAddress, showToast, customerDetails, user } = useApp();
  const params = (activeParams || {}) as { addressId?: string; address?: string; pincode?: string };
  const returnTo = readReturnTo(activeParams);
  const addresses = useAddressStore((s) => s.addresses);
  const loaded = useAddressStore((s) => s.loaded);
  const selectSaved = useAddressStore((s) => s.selectAddress);
  const existing: SavedAddressView | undefined = params.addressId ? addresses.find((a) => a.id === params.addressId) : undefined;
  const editing = Boolean(params.addressId);

  const [label, setLabel] = useState<SavedAddressLabel>(existing?.label ?? 'Home');
  const [recipientName, setRecipientName] = useState(existing?.recipientName ?? (customerDetails?.fullName || user?.name || ''));
  const [phone, setPhone] = useState(
    existing?.phone ?? (customerDetails?.phoneNumber || user?.phoneNumber || '').replace(/^\+91\s*/, '').replace(/\D/g, '').slice(-10)
  );
  const [fullAddress, setFullAddress] = useState(existing?.fullAddress ?? params.address ?? '');
  const [city, setCity] = useState(existing?.city ?? 'Vijayawada');
  const [pincode, setPincode] = useState(existing?.pincode ?? params.pincode ?? '');
  const [landmark, setLandmark] = useState(existing?.landmark ?? '');
  // The first address is always the default. Later ones become the default only when the customer asks.
  const [makeDefault, setMakeDefault] = useState(existing ? existing.isDefault : addresses.length === 0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // An edit opened straight from a link, before the list has loaded, reads the list first.
  useEffect(() => {
    if (editing && !loaded) void refreshSavedAddresses();
  }, [editing, loaded]);

  const validate = () => {
    const next: Record<string, string> = {};
    if (recipientName.trim().length < 2) next.recipientName = 'Receiver name is required';
    if (!/^[6-9]\d{9}$/.test(phone.trim())) next.phone = 'Enter a valid 10-digit mobile number';
    if (fullAddress.trim().length < 8) next.fullAddress = 'Enter the full address (house, street and area)';
    if (!city.trim()) next.city = 'City is required';
    if (!/^\d{6}$/.test(pincode.trim())) next.pincode = 'Enter a 6-digit pincode';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving || !validate()) return;
    setSaving(true);
    setFormError(null);
    const before = new Set(addresses.map((a) => a.id));
    const input: SavedAddressInput = {
      label,
      recipientName: recipientName.trim(),
      phone: phone.trim(),
      fullAddress: fullAddress.trim(),
      city: city.trim(),
      pincode: pincode.trim(),
      landmark: landmark.trim(),
      makeDefault,
    };
    const res = await saveSavedAddress(editing ? params.addressId ?? null : null, input);
    setSaving(false);
    if (!res.ok || !res.data) {
      setFormError(res.error ?? 'The address could not be saved. Try again.');
      return;
    }
    const saved = editing
      ? res.data.addresses.find((a: SavedAddressView) => a.id === params.addressId)
      : res.data.addresses.find((a: SavedAddressView) => !before.has(a.id));
    if (saved) {
      selectSaved(saved.id);
      addAddress(toNovAddress(saved));
    }
    showToast('Address saved');
    if (returnTo && isServiceablePincode(pincode.trim())) navigate(returnTo, { returnTo });
    else if (params.address !== undefined) navigate('location-serviceability', returnTo ? { returnTo } : undefined);
    else navigate('address-list', returnTo ? { returnTo } : undefined);
  };

  if (editing && loaded && !existing) {
    return (
      <main className="commerce-screen commerce-addresses">
        <FlowHeader title="Edit address" onBack={goBack} />
        <div className="commerce-body">
          <div className="commerce-empty-state is-card">
            <h2>This address is no longer saved</h2>
            <p>It may have been removed. Choose another address or add a new one.</p>
            <button className="commerce-primary" onClick={() => navigate('address-list', returnTo ? { returnTo } : undefined)}>
              Back to addresses
            </button>
          </div>
        </div>
      </main>
    );
  }

  const canChangeDefault = !existing || !existing.isDefault;
  const showDefaultBox = addresses.length > 0 || existing !== undefined;

  return (
    <main className="commerce-screen commerce-addresses commerce-address-form has-aside">
      <FlowHeader title={editing ? 'Edit address' : 'Add address'} subtitle="Complete the details for your delivery partner" onBack={goBack} />

      <form id="commerce-address-form" className="commerce-body commerce-split" onSubmit={save} noValidate>
        <div className="commerce-main">
          <section className="commerce-card commerce-form" aria-labelledby="addr-where">
            <h2 id="addr-where">Address</h2>
            <Field label="House, flat, street and area" error={errors.fullAddress}>
              <textarea rows={3} maxLength={300} value={fullAddress} onChange={(e) => setFullAddress(e.target.value)} autoComplete="street-address" />
            </Field>
            <div className="commerce-field-row">
              <Field label="Landmark (optional)">
                <input value={landmark} maxLength={120} onChange={(e) => setLandmark(e.target.value)} />
              </Field>
              <Field label="Pincode" error={errors.pincode}>
                <input inputMode="numeric" maxLength={6} value={pincode} onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))} autoComplete="postal-code" />
              </Field>
            </div>
            <Field label="City" error={errors.city}>
              <input value={city} maxLength={60} onChange={(e) => setCity(e.target.value)} autoComplete="address-level2" />
            </Field>
            {pincode.length === 6 && !isServiceablePincode(pincode) && (
              <p className="commerce-warn">We deliver only to Vijayawada pincodes (520xxx) right now. You can still save this address.</p>
            )}
          </section>
        </div>

        <div className="commerce-aside">
          <section className="commerce-card commerce-form" aria-labelledby="addr-who">
            <h2 id="addr-who">Receiver</h2>
            <Field label="Receiver name" error={errors.recipientName}>
              <input value={recipientName} maxLength={80} onChange={(e) => setRecipientName(e.target.value)} autoComplete="name" />
            </Field>
            <Field label="Mobile number" error={errors.phone}>
              <input inputMode="tel" maxLength={10} value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))} autoComplete="tel-national" />
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
            {showDefaultBox && canChangeDefault && (
              <label className="commerce-check">
                <input type="checkbox" checked={makeDefault} onChange={() => setMakeDefault(!makeDefault)} />
                Make this my default address
              </label>
            )}
          </section>

          {formError && (
            <p className="commerce-warn" role="alert">
              {formError}
            </p>
          )}
          <button className="commerce-primary is-wide commerce-aside-cta" type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Save address'}
          </button>
        </div>
      </form>

      <footer className="commerce-sticky-bar">
        <button className="commerce-primary is-wide" type="submit" form="commerce-address-form" disabled={saving}>
          {saving ? 'Saving...' : 'Save address'}
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
