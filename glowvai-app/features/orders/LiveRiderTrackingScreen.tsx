import React, { useEffect, useState } from 'react';
import { CheckCircle2, Home, ShieldCheck, Store, Truck } from 'lucide-react';
import { useApp } from '../../context/useApp';
import { searchPlaces } from '../commerce/lib/geocode';
import { LocationMap } from '../../components/map/LocationMap';
import { OrdersHeader } from './components/OrdersHeader';

const STAGES = ['Placed', 'Packed', 'Out for delivery', 'Delivered'];

interface MapState {
  status: 'loading' | 'ready' | 'unavailable';
  point?: { latitude: number; longitude: number };
}

// Tracks one real order from the shop's order store. Rider position is not streamed to the web yet,
// so the screen shows the delivery address and the order's status instead of a simulated rider.
export const LiveRiderTrackingScreen: React.FC = () => {
  const { goBack, activeParams, activeOrder, orders } = useApp();
  const requestedId = (activeParams as { orderId?: string } | null)?.orderId;
  const order = requestedId ? orders.find((o) => o.id === requestedId) ?? null : activeOrder ?? orders[0] ?? null;

  const addressQuery = order ? `${order.address.street}, ${order.address.area}, ${order.address.city}, ${order.address.pincode}` : '';
  const [map, setMap] = useState<MapState>({ status: 'loading' });

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

  if (!order) {
    return (
      <main className="commerce-empty">
        <div>
          <h2>No active delivery</h2>
          <p>Once you place an order, its status and delivery address will appear here.</p>
          <button onClick={goBack}>Go back</button>
        </div>
      </main>
    );
  }

  if (order.status === 'cancelled') {
    return (
      <main className="commerce-empty">
        <div>
          <h2>This order was cancelled</h2>
          <p>There is no delivery to track for order #{order.id}.</p>
          <button onClick={goBack}>Go back</button>
        </div>
      </main>
    );
  }

  // Index of the furthest stage reached; 4 means every stage is done.
  const reached = order.status === 'delivered' ? 4 : ['rider_assigned', 'on_the_way'].includes(order.status) ? 2 : order.status === 'preparing' ? 1 : 0;
  const onTheWay = reached >= 2 && reached < 4;
  const task = order.fulfilmentTasks?.[0];
  const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <main className="orders-screen is-tracking">
      <OrdersHeader
        title="Track order"
        subtitle={`#${order.id}`}
        onBack={goBack}
        right={<span className="orders-pill">{reached >= 4 ? 'DELIVERED' : onTheWay ? '⚡ ON THE WAY' : 'CONFIRMED'}</span>}
      />

      <div className="orders-body">
        <div className="orders-track-panel">
          <section className="orders-eta-card">
            <div>
              <small>{reached >= 4 ? 'DELIVERED' : 'ESTIMATED DELIVERY'}</small>
              <strong>
                {order.estimatedDeliveryMinutes} <span>MINS</span>
              </strong>
              <p>{reached >= 4 ? 'Your order has been delivered.' : 'Estimate given when you ordered.'}</p>
            </div>
            <div className="orders-eta-side">
              <Truck size={24} />
              <span>{onTheWay ? 'ON THE WAY' : 'IN PROGRESS'}</span>
            </div>
          </section>

          <section className="orders-card orders-route-card">
            <div className="orders-track-map">
              {map.status === 'ready' && map.point ? (
                <LocationMap latitude={map.point.latitude} longitude={map.point.longitude} label="Map of your delivery address" />
              ) : (
                <div className="orders-track-map-fallback">
                  <span>{map.status === 'loading' ? 'Finding your address on the map…' : 'Map unavailable for this address'}</span>
                </div>
              )}
            </div>
            <div className="orders-route-stops">
              <div className="orders-route-stop">
                <span className="orders-stop-icon">
                  <Store size={14} />
                </span>
                <div>
                  <small>FROM</small>
                  <b>Glowway darkstore</b>
                  <p>Nearest darkstore to your address</p>
                </div>
              </div>
              <div className="orders-route-stop">
                <span className="orders-stop-icon is-success">
                  <Home size={14} />
                </span>
                <div>
                  <small>DELIVERY ADDRESS</small>
                  <b>{order.address.label}</b>
                  <p>
                    {order.address.street}, {order.address.area}, {order.address.city} {order.address.pincode}
                  </p>
                </div>
              </div>
            </div>
            <small className="orders-note">Rider position is not shown yet.</small>
          </section>

          <section className="orders-card">
            <p className="orders-card-title">Order status</p>
            <div className="orders-stepper">
              {STAGES.map((label, idx) => {
                const done = idx < reached;
                const active = idx === reached;
                const stateClass = done ? 'is-done' : active ? 'is-active' : '';
                const isLast = idx === STAGES.length - 1;
                return (
                  <React.Fragment key={label}>
                    <div className="orders-step">
                      <span className={`orders-step-dot ${stateClass}`}>{done ? <CheckCircle2 size={14} /> : <Truck size={14} />}</span>
                      <b className={stateClass}>{label}</b>
                      <small>{idx === 0 ? new Date(order.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : done ? 'Done' : active ? 'In progress' : 'Upcoming'}</small>
                    </div>
                    {!isLast && <span className={`orders-step-line ${done ? 'is-done' : active ? 'is-active' : ''}`} />}
                  </React.Fragment>
                );
              })}
            </div>
          </section>
        </div>

        <div className="orders-track-details">
          <section className="orders-card orders-rider-card">
            <span className="orders-rider-icon">
              <ShieldCheck size={18} />
            </span>
            <div className="orders-rider-copy">
              {task?.riderName && reached >= 2 ? (
                <>
                  <div className="orders-rider-name">
                    <b>{task.riderName}</b>
                  </div>
                  <small>Delivery partner{task.riderPhoneMasked ? ` · ${task.riderPhoneMasked}` : ''}</small>
                </>
              ) : (
                <>
                  <div className="orders-rider-name">
                    <b>Delivery partner</b>
                  </div>
                  <small>Assigned when your order leaves the darkstore.</small>
                </>
              )}
            </div>
          </section>

          <section className="orders-card">
            <p className="orders-card-title">
              Your items ({itemCount})
            </p>
            <div className="orders-mini-items">
              {order.items.map((item) => (
                <div key={`${item.productId}-${item.variantSize}`} className="orders-mini-item">
                  {item.imageUrl && <img src={item.imageUrl} alt="" />}
                  <b>{item.productName}</b>
                  <small>
                    x{item.quantity} · ₹{item.unitPrice}
                  </small>
                </div>
              ))}
            </div>
            <p className="orders-paid">
              {order.paymentMethod === 'cod'
                ? `Pay ₹${order.finalPayable} on delivery`
                : order.paymentStatus === 'successful'
                  ? `Paid ₹${order.finalPayable} online`
                  : `₹${order.finalPayable} · payment ${order.paymentStatus}`}
            </p>
          </section>
        </div>
      </div>
    </main>
  );
};
