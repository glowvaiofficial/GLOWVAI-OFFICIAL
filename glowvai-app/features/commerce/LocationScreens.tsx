import React, { useEffect, useState } from 'react';
import { ArrowRight, Crosshair, MapPin, Search, Store } from 'lucide-react';
import { useApp } from '../../context/useApp';
import { getDeviceCurrentLocation } from '../../core/services/locationService';
import { searchPlaces, type PlaceResult } from './lib/geocode';
import { isServiceablePincode, useAddressStore } from './lib/addressStore';
import { FlowHeader, useDeliveryAddress } from './components/shared';

const FALLBACK = { latitude: 16.5417, longitude: 80.6425, pincode: '520015' };

const DEFAULT_SUGGESTIONS: PlaceResult[] = [
  { id: 'd1', name: 'Payakapuram, Vijayawada', locality: 'Near Water Tank Road, Sector 4', latitude: 16.532, longitude: 80.648 },
  { id: 'd2', name: 'Benz Circle, Vijayawada', locality: 'Opposite Trendset Mall, MG Road', latitude: 16.5078, longitude: 80.6477 },
  { id: 'd3', name: 'Governorpet, Vijayawada', locality: 'Near Prakasam Road Junction', latitude: 16.5143, longitude: 80.6151 },
];

// Step 1 of adding an address: search or use the device location.
export const LocationSetupScreen: React.FC = () => {
  const { goBack, navigate, showToast } = useApp();
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
      const loc = await getDeviceCurrentLocation();
      navigate('location-map-picker', {
        address: loc.formattedAddress || loc.city || 'Current location',
        latitude: loc.latitude,
        longitude: loc.longitude,
        pincode: loc.postalCode || '',
      });
    } catch {
      showToast('Could not read your location. Pick it from the list instead.');
    } finally {
      setLocating(false);
    }
  };

  const pick = (place: PlaceResult) => {
    navigate('location-map-picker', {
      address: place.locality,
      latitude: place.latitude,
      longitude: place.longitude,
      pincode: place.pincode || '',
    });
  };

  const showingSearch = query.trim().length >= 3;
  const visible = showingSearch ? results : DEFAULT_SUGGESTIONS;

  return (
    <main className="commerce-screen commerce-location">
      <FlowHeader title="Set delivery location" subtitle="Where should we deliver?" onBack={goBack} />

      <div className="commerce-body">
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

        {searching && <p className="commerce-muted">Searching…</p>}
        {error && <p className="commerce-error">{error}</p>}

        <section className="commerce-card commerce-suggest" aria-label="Suggested locations">
          <h2>{showingSearch ? 'Search results' : 'Popular areas'}</h2>
          {visible.map((place) => (
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

        <button className="commerce-link-block" onClick={() => navigate('location-map-picker', { address: '', ...FALLBACK })}>
          Enter address manually
        </button>
      </div>
    </main>
  );
};

// Step 2: confirm the pin. Web has no native map view, so this is a form with the device location button.
export const LocationMapPickerScreen: React.FC = () => {
  const { activeParams, goBack, navigate, showToast } = useApp();
  const params = (activeParams || {}) as { address?: string; latitude?: number; longitude?: number; pincode?: string };

  const [address, setAddress] = useState(params.address || '');
  const [latitude, setLatitude] = useState<number>(Number(params.latitude ?? FALLBACK.latitude));
  const [longitude, setLongitude] = useState<number>(Number(params.longitude ?? FALLBACK.longitude));
  const [pincode, setPincode] = useState(params.pincode || '');
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);

  const useCurrent = async () => {
    setBusy(true);
    try {
      const loc = await getDeviceCurrentLocation();
      setLatitude(loc.latitude);
      setLongitude(loc.longitude);
      setAddress(loc.formattedAddress || address);
      setPincode(loc.postalCode || pincode);
    } finally {
      setBusy(false);
    }
  };

  const search = async () => {
    const q = query.trim();
    if (q.length < 3) return;
    setBusy(true);
    try {
      const [first] = await searchPlaces(q, 1);
      if (!first) {
        showToast('No place found for that search');
        return;
      }
      setLatitude(first.latitude);
      setLongitude(first.longitude);
      setAddress(first.locality);
      setPincode(first.pincode || pincode);
    } catch {
      showToast('Could not reach location search');
    } finally {
      setBusy(false);
    }
  };

  const confirm = () => {
    if (!address.trim()) {
      showToast('Add the area or street to continue');
      return;
    }
    navigate('address-add', { address: address.trim(), latitude, longitude, pincode });
  };

  return (
    <main className="commerce-screen commerce-location">
      <FlowHeader title="Confirm location" subtitle="Check the pin before adding details" onBack={goBack} />

      <div className="commerce-body">
        <section className="commerce-pin-card" aria-label="Selected location">
          <span className="commerce-pin-icon">
            <Store size={20} />
          </span>
          <div>
            <b>Selected pin</b>
            <small>
              {latitude.toFixed(4)}, {longitude.toFixed(4)}
            </small>
          </div>
        </section>

        <label className="commerce-search">
          <Search size={18} />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') search();
            }}
            placeholder="Search to move the pin"
            aria-label="Search to move the pin"
          />
        </label>

        <button className="commerce-locate" onClick={useCurrent} disabled={busy}>
          <span>
            <Crosshair size={18} />
          </span>
          <div>
            <b>{busy ? 'Working…' : 'Use my current location'}</b>
            <small>Uses your browser location permission</small>
          </div>
          <ArrowRight size={16} />
        </button>

        <section className="commerce-card commerce-form">
          <label>
            <span>Area and street</span>
            <textarea rows={3} value={address} onChange={(e) => setAddress(e.target.value)} />
          </label>
          <label>
            <span>Pincode</span>
            <input inputMode="numeric" maxLength={6} value={pincode} onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))} />
          </label>
          {pincode && !isServiceablePincode(pincode) && <p className="commerce-error">We deliver to Vijayawada pincodes (520xxx) right now.</p>}
        </section>
      </div>

      <footer className="commerce-sticky-bar">
        <button className="commerce-primary is-wide" onClick={confirm}>
          Confirm location
        </button>
      </footer>
    </main>
  );
};

// Step 3: check whether the saved address is inside the delivery area.
export const ServiceabilityScreen: React.FC = () => {
  const { goBack, navigate } = useApp();
  const address = useDeliveryAddress();
  const hasSaved = useAddressStore((s) => s.addresses.length > 0);
  const serviceable = address.serviceable;

  return (
    <main className="commerce-screen commerce-location">
      <FlowHeader title="Delivery check" onBack={goBack} />

      <div className="commerce-body">
        <section className={serviceable ? 'commerce-serve is-ok' : 'commerce-serve is-no'}>
          <span className="commerce-serve-icon">
            <MapPin size={24} />
          </span>
          <h1>{serviceable ? 'We deliver here' : 'Not serviceable yet'}</h1>
          <p>{serviceable ? 'Express delivery in about 10 to 12 minutes from the nearest darkstore.' : 'We currently deliver only within Vijayawada (520xxx pincodes).'}</p>
        </section>

        <section className="commerce-card">
          <div className="commerce-card-head">
            <h2>Delivering to</h2>
          </div>
          <p className="commerce-muted">{address.fullAddress}</p>
        </section>
      </div>

      <footer className="commerce-sticky-bar">
        <button className="commerce-ghost" onClick={() => navigate(hasSaved ? 'address-list' : 'location-setup')}>
          Change address
        </button>
        <button className="commerce-primary" disabled={!serviceable} onClick={() => navigate('home')}>
          Start shopping
        </button>
      </footer>
    </main>
  );
};
