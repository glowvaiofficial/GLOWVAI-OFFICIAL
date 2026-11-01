import React, { useEffect, useState } from 'react';
import { HelpCircle, MapPin, Package, PackageCheck, PackageOpen, ShieldCheck, Truck, XCircle } from 'lucide-react';
import { useApp } from '../../context/useApp';
import { searchPlaces } from '../commerce/lib/geocode';
import { LocationMap } from '../../components/map/LocationMap';
import { OrdersHeader } from './components/OrdersHeader';
import { OrderTimeline, OrdersState, StatusBadge } from './components/OrderParts';
import { formatOrderDate, formatRupees, itemCount, paymentLabel, stageIndex } from './lib/orderUtils';

interface MapState {
  status: 'loading' | 'ready' | 'unavailable';
  point?: { latitude: number; longitude: number };
}

const CANCEL_REASONS = ['Ordered by mistake', 'Need to change address', 'Delivery time is too long', 'Found another product'];

// Tracks one real order from the shop's order store. Rider position is not streamed to the web yet,
// so the screen shows the delivery address and the order's status instead of a simulated rider.
export const LiveRiderTrackingScreen: React.FC = () => {
  const { goBack, navigate, activeParams, activeOrder, orders, cancelOrder, setActiveOrder } = useApp();
  const requestedId = (activeParams as { orderId?: string } | null)?.orderId;
  const order = requestedId ? orders.find((o) => o.id === requestedId) ?? activeOrder ?? null : activeOrder ?? orders[0] ?? null;

  const addressQuery = order ? `${order.address.street}, ${order.address.area}, ${order.address.city}, ${order.address.pincode}` : '';
  const [map, setMap] = useState<MapState>({ status: 'loading' });
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState(CANCEL_REASONS[0]);

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
      <main className="orders-screen is-tracking">
        <OrdersHeader title="Track order" onBack={goBack} />
        <div className="orders-content">
          <OrdersState icon={<PackageOpen size={30} />} title="No active delivery" body="Once you place an order, its status and delivery address will appear here.">
            <button className="orders-primary-button" onClick={() => navigate('shop-home')}>Start shopping</button>
          </OrdersState>
        </div>
      </main>
    );
  }

  if (order.status === 'cancelled') {
    return (
      <main className="orders-screen is-tracking">
        <OrdersHeader title="Track order" subtitle={`#${order.id}`} onBack={goBack} />
        <div className="orders-content">
          <OrdersState icon={<XCircle size={30} />} title="This order was cancelled" body={`There is no delivery to track for order #${order.id}.`}>
            <button className="orders-primary-button" onClick={() => { setActiveOrder(order); navigate('order-cancelled', { orderId: order.id }); }}>View cancellation</button>
            <button className="orders-secondary-button" onClick={() => navigate('orders-list')}>Your orders</button>
          </OrdersState>
        </div>
      </main>
    );
  }

  const reached = stageIndex(order);
  const delivered = reached >= 3;
  const onTheWay = reached === 2;
  const cancellable = reached < 2;
  const task = order.fulfilmentTasks?.[0];
  const count = itemCount(order);
  const openSupport = () => navigate('support', { orderId: order.id });

  const confirmCancellation = () => {
    const cancelled = cancelOrder(order.id, reason);
    setCancelOpen(false);
    if (cancelled) navigate('order-cancelled', { orderId: cancelled.id });
  };

  return (
    <main className="orders-screen is-tracking">
      <OrdersHeader
        title="Track order"
        subtitle={`#${order.id}`}
        onBack={goBack}
        right={
          <button className="orders-icon-button" aria-label="Get help with this order" onClick={openSupport}>
            <HelpCircle size={18} />
          </button>
        }
      />

      <div className="orders-content">
        <section className={`orders-eta-card${delivered ? ' is-delivered' : ''}`}>
          <span className="orders-eta-icon" aria-hidden="true">
            {delivered ? <PackageCheck size={24} /> : onTheWay ? <Truck size={24} /> : <Package size={24} />}
          </span>
          <div className="orders-eta-copy">
            <small>{delivered ? 'Delivered' : onTheWay ? 'Out for delivery' : reached === 1 ? 'Being packed' : 'Order placed'}</small>
            <strong>{delivered ? 'Your order has arrived' : `About ${order.estimatedDeliveryMinutes} min`}</strong>
            <p>{delivered ? `Placed ${formatOrderDate(order.createdAt)}` : `Estimate given when you ordered, ${formatOrderDate(order.createdAt)}`}</p>
          </div>
          <StatusBadge order={order} />
        </section>

        <div className="orders-two-col">
          <div className="orders-col-main">
            <section className="orders-card orders-map-card">
              <div className="orders-track-map">
                {map.status === 'ready' && map.point ? (
                  <LocationMap latitude={map.point.latitude} longitude={map.point.longitude} label="Map of your delivery address" />
                ) : (
                  <div className="orders-track-map-fallback">
                    <span>{map.status === 'loading' ? 'Finding your address on the map…' : 'Map unavailable for this address'}</span>
                  </div>
                )}
              </div>
              <div className="orders-meta-row">
                <MapPin size={15} />
                <div>
                  <b>{delivered ? "Delivered to" : "Delivering to"} {order.address.label}</b>
                  <span>
                    {order.address.street}, {order.address.area}, {order.address.city} {order.address.pincode}
                  </span>
                </div>
              </div>
              <small className="orders-note">The map shows your delivery address. Live partner location is not shown yet.</small>
            </section>

            <section className="orders-card">
              <h2 className="orders-card-title">Progress</h2>
              <OrderTimeline order={order} />
            </section>
          </div>

          <div className="orders-col-side">
            <section className="orders-card orders-rider-card">
              <span className="orders-rider-badge" aria-hidden="true">
                <ShieldCheck size={18} />
              </span>
              <div className="orders-rider-copy">
                <b>{task?.riderName && reached >= 2 ? task.riderName : 'Delivery partner'}</b>
                <small>
                  {task?.riderName && reached >= 2
                    ? `Your delivery partner${task.riderPhoneMasked ? ` · ${task.riderPhoneMasked}` : ''}`
                    : delivered
                      ? 'Delivered to your address.'
                      : reached >= 2
                        ? 'Partner details are not available here yet.'
                        : 'Assigned when your order leaves the store.'}
                </small>
              </div>
            </section>

            <section className="orders-card">
              <div className="orders-card-title-row">
                <h2 className="orders-card-title">Your items</h2>
                <span className="orders-count">{count} item{count === 1 ? '' : 's'}</span>
              </div>
              <ul className="orders-item-list is-compact">
                {order.items.map((item) => (
                  <li key={`${item.productId}-${item.variantSize}`} className="orders-item-row">
                    {item.imageUrl ? <img src={item.imageUrl} alt="" /> : <span className="orders-thumb-empty" aria-hidden="true"><Package size={18} /></span>}
                    <div className="orders-item-copy">
                      <b>{item.productName}</b>
                      <small>{item.variantSize} · Qty {item.quantity}</small>
                    </div>
                    <strong className="orders-item-price">{formatRupees(item.unitPrice * item.quantity)}</strong>
                  </li>
                ))}
              </ul>
              <div className="orders-paid-row">
                <span>{paymentLabel(order)}</span>
                <b>{formatRupees(order.finalPayable)}</b>
              </div>
            </section>

            <button className="orders-secondary-button is-block" onClick={() => navigate('orders-detail', { orderId: order.id })}>
              View order details
            </button>
            {cancellable && (
              <button className="orders-text-danger" onClick={() => setCancelOpen(true)}>
                Cancel this order
              </button>
            )}
          </div>
        </div>
      </div>

      {cancelOpen && (
        <div className="orders-dialog-backdrop">
          <div className="orders-dialog" role="dialog" aria-modal="true" aria-labelledby="cancel-order-title">
            <span className="orders-dialog-icon" aria-hidden="true"><XCircle size={24} /></span>
            <h2 id="cancel-order-title">Cancel this order?</h2>
            <p>You can cancel until your order leaves the store.</p>
            <label className="orders-field">
              <span>Reason</span>
              <select value={reason} onChange={(event) => setReason(event.target.value)}>
                {CANCEL_REASONS.map((option) => <option key={option}>{option}</option>)}
              </select>
            </label>
            <button className="orders-danger-button is-block" onClick={confirmCancellation}>Yes, cancel order</button>
            <button className="orders-secondary-button is-block" onClick={() => setCancelOpen(false)}>Keep my order</button>
          </div>
        </div>
      )}
    </main>
  );
};
