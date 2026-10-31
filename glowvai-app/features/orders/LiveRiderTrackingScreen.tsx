import React, { useEffect, useState } from 'react';
import { CheckCircle2, Home, MessageSquare, Phone, Share2, ShieldCheck, Star, Store, Truck } from 'lucide-react';
import { useApp } from '../../context/useApp';
import { getDeviceCurrentLocation } from '../../core/services/locationService';
import { safeHapticImpact } from '../../core/utils/haptics';
import { OrdersHeader } from './components/OrdersHeader';

const RIDER_PHONE_TEL = 'tel:+919876543210';

const VENDOR_SHOP_NAME = 'GlowVAI Express Darkstore #04';
const VENDOR_SHOP_ADDRESS = 'MG Road, Benz Circle, Vijayawada';

const PRODUCT_THUMBS = [
  { name: 'Minimalist Niacinamide 10%', image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=200&q=80', qty: 1, price: 599 },
  { name: 'Cetaphil Gentle Cleanser', image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=200&q=80', qty: 1, price: 349 },
  { name: 'Dot & Key Vitamin C Gel', image: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=200&q=80', qty: 1, price: 490 },
];

const STEPS = [
  { label: 'Placed', time: '11:42 AM' },
  { label: 'Packed', time: '11:44 AM' },
  { label: 'Picked Up', time: '11:46 AM' },
  { label: 'On The Way', time: '7 Mins' },
];

export const LiveRiderTrackingScreen: React.FC = () => {
  const { goBack, showToast, currentAddress } = useApp();
  const [destination, setDestination] = useState(
    currentAddress ? `${currentAddress.street}, ${currentAddress.area}` : 'Payikapuram, Vijayawada'
  );
  // Countdown in seconds: starts at 7:42 and holds at zero.
  const [remainingSeconds, setRemainingSeconds] = useState(7 * 60 + 42);
  const [progressPercent, setProgressPercent] = useState(68);
  const [shared, setShared] = useState(false);

  const etaMinutes = Math.floor(remainingSeconds / 60);
  const etaSeconds = remainingSeconds % 60;
  const formattedSec = etaSeconds < 10 ? `0${etaSeconds}` : `${etaSeconds}`;

  useEffect(() => {
    getDeviceCurrentLocation()
      .then((loc) => {
        if (loc?.formattedAddress) setDestination(loc.formattedAddress);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setRemainingSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Simulated rider progress until live GPS is connected.
  useEffect(() => {
    const motion = setInterval(() => {
      setProgressPercent((prev) => (prev < 92 ? prev + 1.5 : 68));
    }, 2500);
    return () => clearInterval(motion);
  }, []);

  const handleChatRider = () => {
    safeHapticImpact();
    showToast('Connecting to delivery partner Rahul Kumar in-app chat...');
  };

  const handleShareTracking = async () => {
    safeHapticImpact();
    try {
      await navigator.clipboard?.writeText(window.location.href);
    } catch {
      // clipboard can be unavailable in preview
    }
    setShared(true);
    setTimeout(() => setShared(false), 3000);
  };

  return (
    <main className="orders-screen is-tracking">
      <OrdersHeader title="Live Order Delivery Tracking" subtitle="Order #GV-892401 · Darkstore Dispatch" onBack={goBack} right={<span className="orders-pill">⚡ ON THE WAY</span>} />

      <div className="orders-body">
        <div className="orders-track-panel">
        <section className="orders-eta-card">
          <div>
            <small>ESTIMATED ARRIVAL TIME</small>
            <strong>
              {etaMinutes}:{formattedSec} <span>MINS</span>
            </strong>
            <p>Rider is 1.8 km away · Traffic clear</p>
          </div>
          <div className="orders-eta-side">
            <Truck size={24} />
            <span>ON TIME</span>
          </div>
        </section>

        <section className="orders-card orders-route-card">
          <div className="orders-route-track" aria-hidden="true">
            <span className="orders-route-fill" style={{ height: `${progressPercent}%` }} />
            <span className="orders-route-rider" style={{ top: `${30 + progressPercent * 0.42}%` }}>
              🛵
            </span>
          </div>
          <div className="orders-route-stops">
            <div className="orders-route-stop">
              <span className="orders-stop-icon">
                <Store size={14} />
              </span>
              <div>
                <small>ORIGIN (VENDOR DARKSTORE)</small>
                <b>{VENDOR_SHOP_NAME}</b>
                <p>{VENDOR_SHOP_ADDRESS}</p>
              </div>
            </div>
            <div className="orders-route-stop">
              <span className="orders-stop-icon is-success">
                <Home size={14} />
              </span>
              <div>
                <small>DESTINATION (YOUR LOCATION)</small>
                <b>Your Saved Address</b>
                <p>{destination}</p>
              </div>
            </div>
          </div>
          <small className="orders-note">Route is an estimate until live delivery-partner GPS is connected.</small>
        </section>

        <section className="orders-card">
          <p className="orders-card-title">Order Status Progress</p>
          <div className="orders-stepper">
            {STEPS.map((step, idx) => {
              const isLast = idx === STEPS.length - 1;
              const done = !isLast;
              return (
                <React.Fragment key={step.label}>
                  <div className="orders-step">
                    <span className={`orders-step-dot ${done ? 'is-done' : 'is-active'}`}>
                      {done ? <CheckCircle2 size={14} /> : <Truck size={14} />}
                    </span>
                    <b className={done ? 'is-done' : 'is-active'}>{step.label}</b>
                    <small>{step.time}</small>
                  </div>
                  {!isLast && <span className={`orders-step-line ${idx < STEPS.length - 2 ? 'is-done' : idx === STEPS.length - 2 ? 'is-active' : ''}`} />}
                </React.Fragment>
              );
            })}
          </div>
        </section>

        </div>

        <div className="orders-track-details">
        <section className="orders-card orders-rider-card">
          <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80" alt="" />
          <div className="orders-rider-copy">
            <div className="orders-rider-name">
              <b>Rahul Kumar</b>
              <span className="orders-rating">
                <Star size={11} fill="currentColor" /> 4.9
              </span>
            </div>
            <small>TVS Jupiter · AP 39 KQ 7321</small>
            <span className="orders-verified">
              <ShieldCheck size={12} /> Verified Delivery Partner · Masked Call
            </span>
          </div>
          <div className="orders-rider-actions">
            <a
              className="orders-call-button"
              href={RIDER_PHONE_TEL}
              onClick={() => safeHapticImpact()}
            >
              <Phone size={16} /> Call
            </a>
            <button className="orders-chat-button" aria-label="Chat with delivery partner" onClick={handleChatRider}>
              <MessageSquare size={16} />
            </button>
          </div>
        </section>

        <section className="orders-card">
          <p className="orders-card-title">Order Items (3 Formulations)</p>
          <div className="orders-mini-items">
            {PRODUCT_THUMBS.map((item, idx) => (
              <div key={idx} className="orders-mini-item">
                <img src={item.image} alt="" />
                <b>{item.name}</b>
                <small>
                  x{item.qty} · ₹{item.price}
                </small>
              </div>
            ))}
          </div>
          <p className="orders-paid">PAID ₹1,438 ✓</p>
        </section>

        <button className="orders-primary-button is-block" onClick={handleShareTracking}>
          <Share2 size={16} /> {shared ? '✓ Tracking Link Copied to Clipboard' : 'Share Live Tracking Link'}
        </button>
        </div>
      </div>
    </main>
  );
};
