import React, { useState } from 'react';
import { Bike, Check, CheckCircle2, Clock, HelpCircle, Home, MessageSquare, PackageCheck, Phone, XCircle } from 'lucide-react';
import { useApp } from '../../context/useApp';
import { SUPPORT_HOTLINE } from '../../core/utils/whatsapp';
import { OrdersHeader } from './components/OrdersHeader';
import {
  DELIVERY_STAGES,
  OrderThumb,
  OrdersEmpty,
  STATUS_LABEL,
  formatOrderDate,
  formatRupee,
  itemCountLabel,
  orderTone,
  paymentSummary,
  stageIndex,
  useRequestedOrder,
} from './orderUtils';

const CANCEL_REASONS = ['Ordered by mistake', 'Need to change address', 'Delivery time is too long', 'Found another product'];

const DONE_NOTE = ['Order confirmed', 'Bag packed and sealed', 'Picked up for delivery', 'Delivered to your address'];
const CURRENT_NOTE = ['We have received your order', 'Your bag is being packed', 'On its way to you', 'Delivered to your address'];

export const LiveRiderTrackingScreen: React.FC = () => {
  const { goBack, navigate, cancelOrder } = useApp();
  const { order, requestedId } = useRequestedOrder();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState(CANCEL_REASONS[0]);

  if (!order) {
    return (
      <main className="orders-screen is-tracking is-empty">
        <OrdersHeader title="Track order" onBack={goBack} />
        <div className="orders-body">
          <OrdersEmpty
            title={requestedId ? 'Order not found' : 'No order to track'}
            body={requestedId ? `We could not find order #${requestedId} on this device.` : 'Once you place an order, its delivery status will show up here.'}
            actionLabel={requestedId ? 'See my orders' : 'Shop now'}
            onAction={requestedId ? () => navigate('orders-list') : undefined}
          />
        </div>
      </main>
    );
  }

  const tone = orderTone(order);
  const current = stageIndex(order);
  const rider = order.fulfilmentTasks?.find((task) => task.riderName);
  const cancellable = tone === 'active' && current < 2;
  const placed = formatOrderDate(order.createdAt);

  const confirmCancellation = () => {
    const cancelled = cancelOrder(order.id, reason);
    setCancelOpen(false);
    if (cancelled) navigate('order-cancelled', { orderId: cancelled.id });
  };

  const headline =
    tone === 'cancelled'
      ? 'This order was cancelled'
      : tone === 'delivered'
        ? 'Your order was delivered'
        : current >= 2
          ? 'Your order is on its way'
          : 'We’re preparing your order';

  return (
    <main className="orders-screen is-tracking">
      <OrdersHeader
        title="Track order"
        subtitle={`#${order.id}`}
        onBack={goBack}
        right={
          <button type="button" className="orders-icon-button" aria-label="Get help with this order" onClick={() => navigate('support', { orderId: order.id })}>
            <HelpCircle size={18} />
          </button>
        }
      />

      <div className="orders-body">
        <div className="orders-track-panel">
          <section className={`orders-eta-card is-${tone}`}>
            <span className="orders-eta-icon">
              {tone === 'cancelled' ? <XCircle size={24} /> : tone === 'delivered' ? <CheckCircle2 size={24} /> : current >= 2 ? <Bike size={24} /> : <PackageCheck size={24} />}
            </span>
            <div>
              <small>{STATUS_LABEL[order.status]}</small>
              <strong>{headline}</strong>
              {tone === 'active' && order.estimatedDeliveryMinutes > 0 && (
                <p>
                  <Clock size={13} /> Estimated delivery time at checkout: {order.estimatedDeliveryMinutes} min
                </p>
              )}
              {placed && <p>Placed {placed}</p>}
            </div>
          </section>

          <section className="orders-card" aria-labelledby="orders-track-progress">
            <h2 id="orders-track-progress" className="orders-card-title">
              Delivery progress
            </h2>
            {tone === 'cancelled' ? (
              <p className="orders-cancel-note">
                <XCircle size={16} /> {order.splitDeliveryNote ?? 'This order will not be delivered.'}
              </p>
            ) : (
              <ol className="orders-vtimeline">
                {DELIVERY_STAGES.map((label, index) => {
                  const done = index < current || tone === 'delivered';
                  const isCurrent = index === current && !done;
                  return (
                    <li key={label} className={done ? 'is-done' : isCurrent ? 'is-current' : ''}>
                      <span className="orders-vtimeline-dot">{done ? <Check size={14} /> : index + 1}</span>
                      <div>
                        <b>{label}</b>
                        {(done || isCurrent) && <small>{done ? DONE_NOTE[index] : CURRENT_NOTE[index]}</small>}
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>

          {tone === 'active' && (
            <section className="orders-card orders-rider-card">
              <span className="orders-rider-avatar">
                <Bike size={20} />
              </span>
              {rider ? (
                <div className="orders-rider-copy">
                  <small>Delivery partner</small>
                  <b>{rider.riderName}</b>
                  {rider.riderPhoneMasked && <small>{rider.riderPhoneMasked}</small>}
                </div>
              ) : (
                <div className="orders-rider-copy">
                  <b>Rider not assigned yet</b>
                  <small>Rider details appear once a rider is assigned.</small>
                </div>
              )}
            </section>
          )}
        </div>

        <div className="orders-track-details">
          <section className="orders-card orders-route-card">
            <span className="orders-stop-icon is-success">
              <Home size={16} />
            </span>
            <div>
              <small>Delivering to {order.address.label}</small>
              <b>
                {order.address.street}, {order.address.area}
              </b>
              <p>
                {order.address.city} {order.address.pincode}
              </p>
            </div>
          </section>

          <section className="orders-card">
            <div className="orders-section-head">
              <h2 className="orders-card-title">Your items</h2>
              <span className="orders-count">{itemCountLabel(order)}</span>
            </div>
            <div className="orders-mini-list">
              {order.items.map((item) => (
                <div key={`${item.productId}-${item.variantSize}`} className="orders-mini-row">
                  <OrderThumb item={item} />
                  <div>
                    <b>{item.productName}</b>
                    <small>
                      {item.variantSize} · Qty {item.quantity}
                    </small>
                  </div>
                  <strong>{formatRupee(item.unitPrice * item.quantity)}</strong>
                </div>
              ))}
            </div>
            <div className="orders-paid">
              <span>{paymentSummary(order)}</span>
              <b>{formatRupee(order.finalPayable)}</b>
            </div>
          </section>

          <section className="orders-card orders-support-card">
            <div className="orders-support-head">
              <span className="orders-support-icon">
                <MessageSquare size={18} />
              </span>
              <div>
                <b>Need help with this order?</b>
                <small>Chat with us or call our support line.</small>
              </div>
            </div>
            <div className="orders-support-actions">
              <button type="button" className="orders-primary-button" onClick={() => navigate('support', { orderId: order.id })}>
                <MessageSquare size={16} /> Chat
              </button>
              <a className="orders-secondary-button" href={`tel:+91${SUPPORT_HOTLINE}`}>
                <Phone size={16} /> Call
              </a>
            </div>
          </section>

          {cancellable && (
            <button type="button" className="orders-danger-button" onClick={() => setCancelOpen(true)}>
              Cancel this order
            </button>
          )}
          <button type="button" className="orders-text-button" onClick={() => navigate('orders-detail', { orderId: order.id })}>
            View full order details
          </button>
        </div>
      </div>

      {cancelOpen && (
        <div className="orders-dialog-backdrop">
          <div className="orders-dialog" role="dialog" aria-modal="true" aria-labelledby="orders-cancel-title">
            <span className="orders-dialog-icon">
              <XCircle size={24} />
            </span>
            <h2 id="orders-cancel-title">Cancel this order?</h2>
            <p>You can cancel before the rider leaves the store.</p>
            <label className="orders-field">
              Reason
              <select value={reason} onChange={(event) => setReason(event.target.value)}>
                {CANCEL_REASONS.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </label>
            <button type="button" className="orders-danger-button is-solid" onClick={confirmCancellation}>
              Yes, cancel order
            </button>
            <button type="button" className="orders-secondary-button is-block" onClick={() => setCancelOpen(false)}>
              Keep my order
            </button>
          </div>
        </div>
      )}
    </main>
  );
};
