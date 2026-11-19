import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, Crosshair, MapPin, Pencil, Search } from 'lucide-react';
import { useApp } from '../../context/useApp';
import { VIJAYAWADA_AREAS } from '../../data/serviceability';
import { locateDevice, reversePlace, searchPlaces, type PlaceResult } from './lib/geocode';
import { SEARCH_DEBOUNCE_MS } from './lib/placeRules';
import { PinMap } from './components/PinMap';
import { isServiceablePincode, useAddressStore } from './lib/addressStore';
import { FlowHeader, useDeliveryAddress } from './components/shared';
import { readReturnTo } from './AddressScreens';
import { areaNameOf, guestAreaAddress, isServiceableAreaPincode, saveGuestArea } from './lib/guestArea';

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

// Step 2: confirm the spot. A real map (OpenStreetMap tiles) with the pin at the centre: drag the map, search a place or use
// the device location; the address and pincode are filled from the pin and can be edited.
const DEFAULT_CENTER = { latitude: 16.5062, longitude: 80.648 }; // Vijayawada
type LatLng = { latitude: number; longitude: number };
type GeoState = 'idle' | 'asking' | 'denied' | 'unavailable' | 'timeout' | 'insecure';

const GEO_NOTE: Record<Exclude<GeoState, 'idle' | 'asking'>, string> = {
  denied: 'Location access is blocked for this site. Allow it in the browser address bar, or search a place or drag the map instead.',
  unavailable: 'Your device could not find its location. Search a place or drag the map instead.',
  timeout: 'Finding your location took too long. Try again, or search a place or drag the map instead.',
  insecure: 'Your browser only shares location on secure pages. Search a place or drag the map instead.',
};

// Delivery message from the delivery-area data (data/serviceability.ts) and the pincode rule.
export const serviceMessage = (pincode: string): { ok: boolean; text: string } | null => {
  if (pincode.length < 6) return null;
  if (!isServiceablePincode(pincode)) return { ok: false, text: 'We do not deliver to this pincode yet. We deliver to Vijayawada (520xxx) right now.' };
  const area = SERVICE_AREAS.find((a) => a.pincode === pincode);
  return { ok: true, text: area ? `We deliver here, about ${area.estimatedMinutes} min.` : 'We deliver to this pincode.' };
};

export const LocationMapPickerScreen: React.FC = () => {
  const { activeParams, goBack, navigate, accountSignedIn, selectAddress } = useApp();
  const returnTo = readReturnTo(activeParams);
  const params = (activeParams || {}) as { address?: string; latitude?: number; longitude?: number; pincode?: string };
  const initialPin: LatLng | null = typeof params.latitude === 'number' && typeof params.longitude === 'number' ? { latitude: params.latitude, longitude: params.longitude } : null;

  const [address, setAddress] = useState(params.address || '');
  const [pin, setPin] = useState<LatLng | null>(initialPin);
  const [pincode, setPincode] = useState(params.pincode || '');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [searchState, setSearchState] = useState<'idle' | 'searching' | 'empty' | 'error'>('idle');
  const [geo, setGeo] = useState<GeoState>('idle');
  const [lookup, setLookup] = useState<LatLng | null>(null);
  const [lookupState, setLookupState] = useState<'idle' | 'busy' | 'failed'>('idle');
  const [addressError, setAddressError] = useState<string | null>(null);
  const startedFromText = useRef(Boolean(!initialPin && params.address));

  // A pin moved by the customer (drag, double click, device location) looks its address up; a pin chosen from a search result already has one.
  const movePin = (next: LatLng, withLookup: boolean) => {
    setPin(next);
    if (withLookup) setLookup(next);
  };

  // Typed address from the previous step: find it on the map once, without replacing what the customer typed.
  useEffect(() => {
    if (!startedFromText.current) return;
    startedFromText.current = false;
    const ctl = new AbortController();
    searchPlaces(params.address || '', 1, ctl.signal)
      .then(([first]) => {
        if (first && Number.isFinite(first.latitude)) setPin({ latitude: first.latitude, longitude: first.longitude });
      })
      .catch(() => undefined);
    return () => ctl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reverse lookup, 500 ms after the pin stops moving (and never faster than 1 request a second, see lib/geocode).
  useEffect(() => {
    if (!lookup) return;
    const ctl = new AbortController();
    setLookupState('busy');
    const timer = setTimeout(async () => {
      try {
        const place = await reversePlace(lookup.latitude, lookup.longitude, ctl.signal);
        if (ctl.signal.aborted) return;
        if (place) {
          setAddress(place.locality);
          if (place.pincode) setPincode(place.pincode);
          setAddressError(null);
          setLookupState('idle');
        } else {
          setLookupState('failed');
        }
      } catch {
        if (!ctl.signal.aborted) setLookupState('failed');
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      ctl.abort();
      clearTimeout(timer);
    };
  }, [lookup]);

  // Place search as the customer types: debounced 500 ms, 3 letters or more.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 3) {
      setResults([]);
      setSearchState('idle');
      return;
    }
    const ctl = new AbortController();
    setSearchState('searching');
    const timer = setTimeout(async () => {
      try {
        const found = await searchPlaces(q, 5, ctl.signal);
        if (ctl.signal.aborted) return;
        setResults(found);
        setSearchState(found.length ? 'idle' : 'empty');
      } catch {
        if (!ctl.signal.aborted) setSearchState('error');
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      ctl.abort();
      clearTimeout(timer);
    };
  }, [query]);

  const choose = (place: PlaceResult) => {
    movePin({ latitude: place.latitude, longitude: place.longitude }, false);
    setLookup(null);
    setLookupState('idle');
    setAddress(place.locality);
    if (place.pincode) setPincode(place.pincode);
    setAddressError(null);
    setResults([]);
    setQuery('');
    setSearchState('idle');
  };

  const useCurrent = () => {
    if (typeof window !== 'undefined' && window.isSecureContext === false) {
      setGeo('insecure');
      return;
    }
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGeo('unavailable');
      return;
    }
    setGeo('asking');
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setGeo('idle');
        movePin({ latitude: p.coords.latitude, longitude: p.coords.longitude }, true);
      },
      (err) => setGeo(err.code === 1 ? 'denied' : err.code === 3 ? 'timeout' : 'unavailable'),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  };

  const confirm = () => {
    if (!address.trim()) {
      setAddressError('Add the area or street to continue');
      return;
    }
    // A visitor without an account picks an area only: the pincode is checked, the area is kept on the device, and a named address stays behind sign-in.
    if (!accountSignedIn) {
      if (!isServiceableAreaPincode(pincode)) {
        setAddressError('Add a Vijayawada pincode (520xxx) to check delivery');
        return;
      }
      const area = { area: areaNameOf(address), pincode };
      saveGuestArea(area);
      selectAddress(guestAreaAddress(area));
      navigate((returnTo ?? 'shop-home') as Parameters<typeof navigate>[0]);
      return;
    }
    navigate('address-add', { ...(returnTo ? { returnTo } : {}), address: address.trim(), latitude: pin?.latitude, longitude: pin?.longitude, pincode });
  };

  const service = serviceMessage(pincode);
  const geoNote = geo === 'idle' || geo === 'asking' ? null : GEO_NOTE[geo];

  return (
    <main className="commerce-screen commerce-location commerce-location-picker v7-picker">
      <FlowHeader title="Confirm location" subtitle="Move the map so the pin is on your door" onBack={goBack} />

      <div className="commerce-body commerce-split">
        <div className="commerce-main v7-map-col">
          <div className="v7-search">
            <label className="commerce-search">
              <Search size={18} />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && results[0]) {
                    e.preventDefault();
                    choose(results[0]);
                  }
                }}
                placeholder="Search area, street or landmark"
                aria-label="Search a place to pin it"
                autoComplete="off"
              />
            </label>
            {searchState === 'searching' && <p className="v7-note" role="status">Searching…</p>}
            {searchState === 'empty' && <p className="v7-note" role="status">No matching places found. Try a different search.</p>}
            {searchState === 'error' && <p className="v7-note is-error" role="alert">Could not reach location search. Drag the map instead.</p>}
            {results.length > 0 && (
              <ul className="v7-results" aria-label="Search results">
                {results.map((place) => (
                  <li key={place.id}>
                    <button type="button" onClick={() => choose(place)}>
                      <MapPin size={16} />
                      <span>
                        <b>{place.name}</b>
                        <small>{place.locality}</small>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="v7-stage">
            <PinMap center={pin || DEFAULT_CENTER} zoom={pin ? 17 : 13} pinned={Boolean(pin)} onMoveEnd={(c) => movePin(c, true)} />
            <button type="button" className="v7-locate" onClick={useCurrent} disabled={geo === 'asking'}>
              <Crosshair size={18} />
              <span>{geo === 'asking' ? 'Finding your location…' : 'Use my current location'}</span>
            </button>
            {geoNote && (
              <div className="v7-note is-error v7-geo-note" role="alert">
                <span>{geoNote}</span>
                <span className="v7-note-actions">
                  {geo !== 'denied' && geo !== 'insecure' && <button type="button" onClick={useCurrent}>Try again</button>}
                  <button type="button" onClick={() => setGeo('idle')}>Dismiss</button>
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="commerce-aside">
          <section className="commerce-card commerce-form" aria-labelledby="pick-addr">
            <h2 id="pick-addr">Delivery address</h2>
            <p className="v7-coords" aria-live="polite">
              <MapPin size={14} />
              {pin ? `Pinned ${pin.latitude.toFixed(4)}, ${pin.longitude.toFixed(4)}` : 'Not pinned yet. Drag the map, search, or type the address.'}
            </p>
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
              {lookupState === 'busy' && <em className="v7-hint">Finding the address for this pin…</em>}
              {lookupState === 'failed' && <em className="v7-hint">Could not read an address for this pin. Type it in.</em>}
              {addressError && <em className="commerce-error">{addressError}</em>}
            </label>
            <label>
              <span>Pincode</span>
              <input inputMode="numeric" maxLength={6} value={pincode} onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))} autoComplete="postal-code" />
            </label>
            {service && (
              <p className={service.ok ? 'v7-serve is-ok' : 'v7-serve is-no'} role="status">
                {service.text}
              </p>
            )}
            {!accountSignedIn && <p className="commerce-warn">Browsing as a guest: we keep this area on your device. Sign in to save a named address.</p>}
            <button className="commerce-primary is-wide commerce-aside-cta" onClick={confirm}>
              {accountSignedIn ? 'Confirm and add details' : 'Use this area'}
            </button>
          </section>
        </div>
      </div>

      <footer className="commerce-sticky-bar">
        <button className="commerce-primary is-wide" onClick={confirm}>
          {accountSignedIn ? 'Confirm and add details' : 'Use this area'}
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
