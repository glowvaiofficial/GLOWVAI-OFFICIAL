import React, { useEffect, useState } from 'react';
import { ArrowRight, Crosshair, MapPin, Pencil, Search } from 'lucide-react';
import { useApp } from '../../context/useApp';
import { VIJAYAWADA_AREAS } from '../../data/serviceability';
import { locateDevice, searchPlaces, type PlaceResult } from './lib/geocode';
import { isServiceablePincode, useAddressStore } from './lib/addressStore';
import { FlowHeader, useDeliveryAddress } from './components/shared';
import { readReturnTo } from './AddressScreens';

// Areas we deliver to (data/serviceability.ts). Coordinates are not stored for them, so picking one fills the area and pincode.
const SERVICE_AREAS = VIJAYAWADA_AREAS.filter((area) => area.quickCommerceAvailable);

// Step 1 of adding an address: search, use the device location, or pick a service area.
export const LocationSetupScreen: React.FC = () => {
  const { goBack, navigate, showToast, activeParams } = useApp();
  const returnTo = readReturnTo(activeParams);
  const carry = returnTo ? { returnTo } : {};
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 3) {
      setResults([]);
      setSearching(false);
      setError(null);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const found = await searchPlaces(q);
        if (cancelled) return;
        setResults(found);
        setError(found.length === 0 ? 'No matching places found. Try a different search.' : null);
      } catch {
        if (cancelled) return;
        setResults([]);
        setError('Could not reach location search. Check your connection.');
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  const useCurrent = async () => {
    setLocating(true);
    try {
      const spot = await locateDevice();
      if (!spot) {
        showToast('Location is off or blocked. Search or pick your area instead.');
        return;
      }
      navigate('location-map-picker', { ...carry, ...spot });
    } catch {
      showToast('Could not read your location. Search or pick your area instead.');
    } finally {
      setLocating(false);
    }
  };

  const pick = (place: PlaceResult) => {
    navigate('location-map-picker', {
      ...carry,
      address: place.locality,
      latitude: place.latitude,
      longitude: place.longitude,
      pincode: place.pincode || '',
    });
  };

  const showingSearch = query.trim().length >= 3;

  return (
    <main className="commerce-screen commerce-location commerce-location-setup">
      <FlowHeader title="Set delivery location" subtitle="Where should we deliver?" onBack={goBack} />

      <div className="commerce-body commerce-split">
        <div className="commerce-main">
          <label className="commerce-search">
            <Search size={18} />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search area, street or landmark"
              aria-label="Search location"
            />
          </label>

          <button className="commerce-locate" onClick={useCurrent} disabled={locating}>
            <span>
              <Crosshair size={18} />
            </span>
            <div>
              <b>{locating ? 'Finding your location…' : 'Use current location'}</b>
              <small>Allow location access for an exact pin</small>
            </div>
            <ArrowRight size={16} />
          </button>

          <button className="commerce-locate is-plain" onClick={() => navigate('location-map-picker', carry)}>
            <span>
              <Pencil size={18} />
            </span>
            <div>
              <b>Enter address manually</b>
              <small>Type your area and pincode</small>
            </div>
            <ArrowRight size={16} />
          </button>

          {searching && <p className="commerce-muted" role="status">Searching…</p>}
          {error && <p className="commerce-error" role="alert">{error}</p>}

          {showingSearch && results.length > 0 && (
            <section className="commerce-card commerce-suggest" aria-label="Search results">
              <h2>Search results</h2>
              {results.map((place) => (
                <button className="commerce-suggest-row" key={place.id} onClick={() => pick(place)}>
                  <span className="commerce-suggest-icon">
                    <MapPin size={16} />
                  </span>
                  <span>
                    <b>{place.name}</b>
                    <small>{place.locality}</small>
                  </span>
                  <ArrowRight size={15} />
                </button>
              ))}
            </section>
          )}
        </div>

        <div className="commerce-aside">
          <section className="commerce-card commerce-suggest" aria-label="Areas we deliver to">
            <h2>Areas we deliver to</h2>
            <p className="commerce-muted">Vijayawada, pincodes 520xxx</p>
            {SERVICE_AREAS.map((area) => (
              <button
                className="commerce-suggest-row"
                key={area.id}
                onClick={() => navigate('location-map-picker', { ...carry, address: `${area.name}, Vijayawada`, pincode: area.pincode })}
              >
                <span className="commerce-suggest-icon">
                  <MapPin size={16} />
                </span>
                <span>
                  <b>{area.name}</b>
                  <small>
                    Vijayawada {area.pincode} · about {area.estimatedMinutes} min
                  </small>
                </span>
                <ArrowRight size={15} />
              </button>
            ))}
          </section>
        </div>
      </div>
    </main>
  );
};

// Step 2: confirm the area and pincode. Web has no map view, so the pin comes from search or the device location.
export const LocationMapPickerScreen: React.FC = () => {
  const { activeParams, goBack, navigate, showToast } = useApp();
  const returnTo = readReturnTo(activeParams);
  const params = (activeParams || {}) as { address?: string; latitude?: number; longitude?: number; pincode?: string };
  const initialPin =
    typeof params.latitude === 'number' && typeof params.longitude === 'number' ? { latitude: params.latitude, longitude: params.longitude } : null;

  const [address, setAddress] = useState(params.address || '');
  const [pin, setPin] = useState<{ latitude: number; longitude: number } | null>(initialPin);
  const [pincode, setPincode] = useState(params.pincode || '');
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState<'search' | 'locate' | null>(null);
  const [addressError, setAddressError] = useState<string | null>(null);

  const useCurrent = async () => {
    setBusy('locate');
    try {
      const spot = await locateDevice();
      if (!spot) {
        showToast('Location is off or blocked. Search or type your address instead.');
        return;
      }
      setPin({ latitude: spot.latitude, longitude: spot.longitude });
      if (spot.address) setAddress(spot.address);
      if (spot.pincode) setPincode(spot.pincode);
    } catch {
      showToast('Could not read your location');
    } finally {
      setBusy(null);
    }
  };

  const search = async () => {
    const q = query.trim();
    if (q.length < 3) {
      showToast('Type at least 3 letters to search');
      return;
    }
    setBusy('search');
    try {
      const [first] = await searchPlaces(q, 1);
      if (!first) {
        showToast('No place found for that search');
        return;
      }
      setPin({ latitude: first.latitude, longitude: first.longitude });
      setAddress(first.locality);
      setPincode(first.pincode || pincode);
    } catch {
      showToast('Could not reach location search');
    } finally {
      setBusy(null);
    }
  };

  const confirm = () => {
    if (!address.trim()) {
      setAddressError('Add the area or street to continue');
      return;
    }
    navigate('address-add', { ...(returnTo ? { returnTo } : {}), address: address.trim(), latitude: pin?.latitude, longitude: pin?.longitude, pincode });
  };

  return (
    <main className="commerce-screen commerce-location commerce-location-picker">
      <FlowHeader title="Confirm location" subtitle="Check the area and pincode before adding details" onBack={goBack} />

      <div className="commerce-body commerce-split">
        <div className="commerce-main">
          <section className="commerce-pin-card" aria-label="Selected location">
            <span className="commerce-pin-icon">
              <MapPin size={20} />
            </span>
            <div>
              <b>{pin ? 'Location pinned' : 'No pin yet'}</b>
              <small>
                {pin ? `${pin.latitude.toFixed(4)}, ${pin.longitude.toFixed(4)}` : 'Search or use your current location to pin it. You can also just type the address.'}
              </small>
            </div>
          </section>

          <form
            className="commerce-search-row"
            onSubmit={(e) => {
              e.preventDefault();
              search();
            }}
          >
            <label className="commerce-search">
              <Search size={18} />
              <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search a place to pin it" aria-label="Search a place to pin it" />
            </label>
            <button className="commerce-ghost" type="submit" disabled={busy !== null}>
              {busy === 'search' ? 'Searching…' : 'Search'}
            </button>
          </form>

          <button className="commerce-locate" onClick={useCurrent} disabled={busy !== null}>
            <span>
              <Crosshair size={18} />
            </span>
            <div>
              <b>{busy === 'locate' ? 'Finding your location…' : 'Use my current location'}</b>
              <small>Uses your browser location permission</small>
            </div>
            <ArrowRight size={16} />
          </button>
        </div>

        <div className="commerce-aside">
          <section className="commerce-card commerce-form" aria-labelledby="pick-addr">
            <h2 id="pick-addr">Address</h2>
            <label>
              <span>Area and street</span>
              <textarea
                rows={3}
                value={address}
                onChange={(e) => {
                  setAddress(e.target.value);
                  setAddressError(null);
                }}
              />
              {addressError && <em className="commerce-error">{addressError}</em>}
            </label>
            <label>
              <span>Pincode</span>
              <input inputMode="numeric" maxLength={6} value={pincode} onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))} autoComplete="postal-code" />
            </label>
            {pincode.length === 6 && !isServiceablePincode(pincode) && <p className="commerce-warn">We deliver to Vijayawada pincodes (520xxx) right now.</p>}
            <button className="commerce-primary is-wide commerce-aside-cta" onClick={confirm}>
              Confirm and add details
            </button>
          </section>
        </div>
      </div>

      <footer className="commerce-sticky-bar">
        <button className="commerce-primary is-wide" onClick={confirm}>
          Confirm and add details
        </button>
      </footer>
    </main>
  );
};

// Step 3: check whether the selected address is inside the delivery area.
export const ServiceabilityScreen: React.FC = () => {
  const { goBack, navigate } = useApp();
  const address = useDeliveryAddress();
  const hasSaved = useAddressStore((s) => s.addresses.length > 0);
  const serviceable = Boolean(address?.serviceable);
  const changeAddress = () => navigate(hasSaved ? 'address-list' : 'location-setup');

  if (!address) {
    return (
      <main className="commerce-screen commerce-location commerce-serviceability">
        <FlowHeader title="Delivery check" onBack={goBack} />
        <div className="commerce-body">
          <div className="commerce-empty-state is-card">
            <span className="commerce-empty-icon">
              <MapPin size={30} />
            </span>
            <h2>Add a delivery address</h2>
            <p>Tell us where to deliver and we will check that we serve that area.</p>
            <button className="commerce-primary" onClick={() => navigate('location-setup')}>
              Add delivery address
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="commerce-screen commerce-location commerce-serviceability">
      <FlowHeader title="Delivery check" onBack={goBack} />

      <div className="commerce-body commerce-split">
        <div className="commerce-main">
          <section className={serviceable ? 'commerce-serve is-ok' : 'commerce-serve is-no'}>
            <span className="commerce-serve-icon">
              <MapPin size={24} />
            </span>
            <h1>{serviceable ? 'We deliver here' : 'Not serviceable yet'}</h1>
            <p>
              {serviceable
                ? address.etaMinutes
                  ? `Delivery to this area takes about ${address.etaMinutes} minutes.`
                  : 'This pincode is inside our delivery area.'
                : 'We currently deliver only within Vijayawada (520xxx pincodes).'}
            </p>
          </section>
        </div>

        <div className="commerce-aside">
          <section className="commerce-card">
            <div className="commerce-card-head">
              <h2>Delivering to</h2>
              <span className="commerce-tag">{address.label}</span>
            </div>
            <p className="commerce-muted">
              <MapPin size={14} /> {address.fullAddress}
            </p>
            <div className="commerce-card-actions">
              <button className="commerce-primary is-wide" disabled={!serviceable} onClick={() => navigate('home')}>
                Start shopping
              </button>
              <button className="commerce-ghost is-wide" onClick={changeAddress}>
                Change address
              </button>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
};
