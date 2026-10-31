import React, { useEffect, useState } from 'react';
import { ArrowLeft, Check, Clock3, HelpCircle, MapPin, Navigation, PackageCheck, Phone, ShoppingBag, XCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { searchPlaces } from '../features/commerce/lib/geocode';
import { LocationMap } from '../components/map/LocationMap';

interface MapState {
  status: 'loading' | 'ready' | 'unavailable';
  point?: { latitude: number; longitude: number };
}

export const OrderTrackingScreen: React.FC = () => {
  const { goBack, navigate, activeOrder, orders, cancelOrder } = useApp();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState('Ordered by mistake');
  const order = activeOrder || orders[0];
  const addressQuery = order ? `${order.address.street}, ${order.address.area}, ${order.address.city}, ${order.address.pincode}` : '';
  const [map, setMap] = useState<MapState>({ status: 'loading' });

  // Orders keep the address as text, so look up its position once per address for the map.
  useEffect(() => {
    if (!addressQuery) return;
    let active = true;
    setMap({ status: 'loading' });
    searchPlaces(addressQuery, 1)
      .then(([first]) => {
        if (!active) return;
        setMap(first ? { status: 'ready', point: { latitude: first.latitude, longitude: first.longitude } } : { status: 'unavailable' });
      })
      .catch(() => {
        if (active) setMap({ status: 'unavailable' });
      });
    return () => {
      active = false;
    };
  }, [addressQuery]);
  if (!order) return <main className="commerce-empty"><div><span><ShoppingBag size={34} /></span><h2>No active delivery</h2><p>Once you place an order, its route and status will appear here.</p><button onClick={() => navigate('home')}>Start shopping</button></div></main>;
  if (order.status === 'cancelled') return <main className="commerce-empty"><div><span><XCircle size={34} /></span><h2>This order was cancelled</h2><p>Open the cancellation summary for payment and refund details.</p><button onClick={() => navigate('order-cancelled')}>View cancellation</button></div></main>;

  const rider = order.fulfilmentTasks?.[0];
  const stageIndex = order.status === 'delivered' ? 3 : ['rider_assigned', 'on_the_way'].includes(order.status) ? 2 : order.status === 'preparing' ? 1 : 0;
  const cancellable = stageIndex < 2;
  const stages = [
    { label: 'Confirmed', note: `Received at ${order.createdAt}` },
    { label: 'Packed', note: stageIndex >= 1 ? 'Your bag is sealed' : 'Being prepared next' },
    { label: 'Out for delivery', note: stageIndex >= 2 ? 'Rider is heading to you' : 'Rider assignment follows' },
    { label: 'Delivered', note: stageIndex >= 3 ? 'Delivered at your doorstep' : `Expected in ${order.estimatedDeliveryMinutes} min` },
  ];
  const confirmCancellation = () => {
    const cancelled = cancelOrder(order.id, reason);
    setCancelOpen(false);
    if (cancelled) navigate('order-cancelled', { orderId: cancelled.id });
  };

  return <main className="order-tracking tracking-v2">
    <header className="commerce-flow-header"><button onClick={goBack} aria-label="Go back"><ArrowLeft size={21} /></button><div><h1>Track order</h1><p>#{order.id}</p></div><button className="tracking-help" onClick={() => navigate('support', { orderId: order.id })}><HelpCircle size={18} /> Help</button></header>
    <div className="tracking-body">
      <section className="tracking-eta"><div><span>{stageIndex >= 2 ? <Navigation size={22} /> : <PackageCheck size={22} />}</span><div><small>{stageIndex >= 2 ? 'ON THE WAY' : 'ORDER CONFIRMED'}</small><h1>{stageIndex >= 2 ? `Arriving in ${order.estimatedDeliveryMinutes} min` : 'We’re preparing your order'}</h1><p>Delivery to {order.address.area}</p></div></div><time><Clock3 size={15} /> {order.estimatedDeliveryMinutes} min</time></section>
      <section className="tracking-map-card" aria-labelledby="estimated-route-title"><div className="tracking-map-head"><div><h2 id="estimated-route-title">Estimated route</h2><p>Your delivery address on the map.</p></div><span>{stageIndex >= 2 ? 'Rider moving' : 'Preparing'}</span></div><div className="tracking-map">{map.status === 'ready' && map.point ? <LocationMap latitude={map.point.latitude} longitude={map.point.longitude} label="Map of your delivery address" /> : <div className="tracking-map-fallback"><span>{map.status === 'loading' ? 'Finding your address on the map…' : 'Map unavailable for this address'}</span></div>}</div><small className="tracking-map-note">Shows your delivery address. Live rider position is not shown yet.</small></section>
      <section className="tracking-progress" aria-labelledby="delivery-progress-title"><h2 id="delivery-progress-title">Delivery progress</h2><div>{stages.map((stage, index) => <article key={stage.label} className={index < stageIndex ? 'is-done' : index === stageIndex ? 'is-current' : 'is-upcoming'}><span>{index <= stageIndex ? <Check size={15} /> : index + 1}</span><div><b>{stage.label}</b><p>{stage.note}</p></div></article>)}</div></section>
      {rider?.riderName && stageIndex >= 2 && <section className="tracking-rider"><span>{rider.riderName?.split(' ').map((part) => part[0]).join('').slice(0, 2)}</span><div><small>Delivery partner</small><b>{rider.riderName}</b><p>{rider.riderPhoneMasked}</p></div><button aria-label="Call delivery partner"><Phone size={18} /></button></section>}
      <section className="tracking-address"><MapPin size={19} /><div><small>Delivery address</small><b>{order.address.street}, {order.address.area}</b><p>{order.address.city} · {order.address.pincode}</p></div></section>
      <section className="tracking-items"><h2>Your items <span>{order.items.length}</span></h2>{order.items.map((item) => <article key={`${item.productId}-${item.variantSize}`}><img src={item.imageUrl} alt="" /><div><b>{item.productName}</b><small>{item.variantSize} · Qty {item.quantity}</small></div><strong>₹{item.unitPrice * item.quantity}</strong></article>)}<footer><span>{order.paymentStatus === 'successful' ? `Paid via ${order.paymentProvider === 'razorpay' ? 'Razorpay' : 'online'}` : 'Pay on delivery'}</span><b>₹{order.finalPayable}</b></footer></section>
      {cancellable && <button className="tracking-cancel-button" onClick={() => setCancelOpen(true)}>Cancel this order</button>}
    </div>
    {cancelOpen && <div className="tracking-cancel-backdrop"><div className="tracking-cancel-dialog" role="dialog" aria-modal="true" aria-labelledby="cancel-order-title"><span><XCircle size={23} /></span><h2 id="cancel-order-title">Cancel this order?</h2><p>You can cancel before the rider leaves the store.</p><label>Reason<select value={reason} onChange={(event) => setReason(event.target.value)}><option>Ordered by mistake</option><option>Need to change address</option><option>Delivery time is too long</option><option>Found another product</option></select></label><button onClick={confirmCancellation}>Yes, cancel order</button><button className="keep-order" onClick={() => setCancelOpen(false)}>Keep my order</button></div></div>}
  </main>;
};
