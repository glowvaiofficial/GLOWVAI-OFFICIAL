import React, { useEffect, useRef, useState } from 'react';
import type { LiveTracking } from '../../../core/services/shopTracking';
import { MAP_NOT_SET_UP_TEXT, mapsKeyFrom, mapsScriptUrl } from '../trackingMapRules';

// Google Maps is loaded only when the build has a key (NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is read at build time). Without
// a key this card shows one line of text and makes no request to Google.

type GoogleMaps = any;
declare global {
  interface Window {
    google?: { maps?: GoogleMaps };
  }
}

let loader: Promise<void> | null = null;

function loadGoogleMaps(key: string): Promise<void> {
  if (window.google?.maps) return Promise.resolve();
  if (!loader) {
    loader = new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = mapsScriptUrl(key);
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        loader = null;
        reject(new Error('maps-script'));
      };
      document.head.appendChild(script);
    });
  }
  return loader;
}

interface Props {
  map: LiveTracking['map'];
}

export const TrackingMap: React.FC<Props> = ({ map }) => {
  const key = mapsKeyFrom(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<GoogleMaps>(null);
  const markersRef = useRef<Record<'customer' | 'rider' | 'store', GoogleMaps>>({ customer: null, rider: null, store: null });
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [storePlaced, setStorePlaced] = useState(false);

  // Create the map once the script is ready.
  useEffect(() => {
    if (!key || !hostRef.current) return;
    let cancelled = false;
    loadGoogleMaps(key)
      .then(() => {
        if (cancelled || !hostRef.current || !window.google?.maps) return;
        mapRef.current = new window.google.maps.Map(hostRef.current, { disableDefaultUI: true, zoomControl: true, gestureHandling: 'cooperative' });
        setState('ready');
      })
      .catch(() => {
        if (!cancelled) setState('error');
      });
    return () => {
      cancelled = true;
    };
  }, [key]);

  // Markers: the customer's drop point, the rider's last point and the store (geocoded from its public address).
  useEffect(() => {
    if (state !== 'ready' || !mapRef.current || !window.google?.maps) return;
    const g = window.google.maps;
    const bounds = new g.LatLngBounds();
    let points = 0;
    const place = (kind: 'customer' | 'rider', pos: { lat: number; lng: number } | null, title: string, color: string) => {
      if (!pos) {
        markersRef.current[kind]?.setMap(null);
        markersRef.current[kind] = null;
        return;
      }
      if (!markersRef.current[kind]) {
        markersRef.current[kind] = new g.Marker({ map: mapRef.current, title, icon: { path: g.SymbolPath.CIRCLE, scale: 8, fillColor: color, fillOpacity: 1, strokeColor: '#ffffff', strokeWeight: 2 } });
      }
      markersRef.current[kind].setPosition(pos);
      bounds.extend(pos);
      points += 1;
    };
    place('customer', map.customer, 'Your location', '#0057FB');
    place('rider', map.rider, 'Delivery partner', '#111827');
    if (points > 0) {
      if (points === 1) {
        const only = map.customer ?? map.rider;
        if (only) {
          mapRef.current.setCenter(only);
          mapRef.current.setZoom(15);
        }
      } else {
        mapRef.current.fitBounds(bounds, 48);
      }
    }
  }, [state, map.customer, map.rider]);

  // The store pin: geocoded once per address.
  useEffect(() => {
    if (state !== 'ready' || !map.store || !window.google?.maps) return;
    const g = window.google.maps;
    new g.Geocoder().geocode({ address: map.store.address }, (results: GoogleMaps[], status: string) => {
      if (status !== 'OK' || !results?.[0]) return;
      if (!markersRef.current.store) {
        markersRef.current.store = new g.Marker({ map: mapRef.current, title: map.store?.name ?? 'Store', icon: { path: g.SymbolPath.BACKWARD_CLOSED_ARROW, scale: 5, fillColor: '#6b7280', fillOpacity: 1, strokeColor: '#ffffff', strokeWeight: 1 } });
      }
      markersRef.current.store.setPosition(results[0].geometry.location);
      setStorePlaced(true);
    });
  }, [state, map.store?.address, map.store?.name]);

  if (!key) {
    return (
      <section className="trk-card" aria-label="Live map">
        <p className="trk-note">{MAP_NOT_SET_UP_TEXT}</p>
      </section>
    );
  }

  const hasPoints = map.available;
  return (
    <section className="trk-card trk-map-card" aria-label="Live map">
      <div className="trk-map" ref={hostRef} role="img" aria-label="Map showing your delivery partner, your location and the store" hidden={state === 'error'} />
      {state === 'loading' && <p className="trk-note">Loading the map...</p>}
      {state === 'error' && <p className="trk-note is-error">The map could not load. Your delivery details are still below.</p>}
      {state === 'ready' && !hasPoints && <p className="trk-note">The map shows your delivery partner once they are on the way.</p>}
      {state === 'ready' && map.rider && map.riderUpdatedAt && (
        <p className="trk-note">Delivery partner location updated {new Date(map.riderUpdatedAt).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}.</p>
      )}
      {storePlaced && <span className="trk-sr">Store location is on the map.</span>}
    </section>
  );
};
