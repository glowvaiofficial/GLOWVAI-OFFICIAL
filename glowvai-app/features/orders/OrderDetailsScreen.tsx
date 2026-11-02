import React from 'react';
import { CheckCircle2, HelpCircle, MessageSquare, Phone, RotateCcw, Star, Truck, XCircle } from 'lucide-react';
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
  useBuyAgain,
  useRequestedOrder,
} from './orderUtils';

export const OrderDetailsScreen: React.FC = () => {
  const { goBack, navigate, setActiveOrder } = useApp();
  const { order, requestedId } = useRequestedOrder();
  const buyAgain = useBuyAgain();

  if (!order) {
    return (
      <main className="orders-screen is-detail is-empty">
        <OrdersHeader title="Order details" onBack={goBack} />
        <div className="orders-body">
          <OrdersEmpty
            title={requestedId ? 'Order not found' : 'No orders yet'}
            body={requestedId ? `We could not find order #${requestedId} on this device.` : 'Place an order and its items, bill and delivery status will show up here.'}
            actionLabel={requestedId ? 'See my orders' : 'Shop now'}
            onAction={requestedId ? () => navigate('orders-list') : undefined}
          />
        </div>
      </main>
    );
  }

  const tone = orderTone(order);
  const current = stageIndex(order);
  const placed = formatOrderDate(order.createdAt);
  const openSupport = () => navigate('support', { orderId: order.id });
  const openTracking = () => {
    setActiveOrder(order);
    navigate('orders-tracking', { orderId: order.id });
  };

  return (
    <main className="orders-screen is-detail">
      <OrdersHeader
        title="Order details"
        subtitle={`#${order.id}`}
        onBack={goBack}
        right={
          <button type="button" className="orders-icon-button" aria-label="Get help with this order" onClick={openSupport}>
            <HelpCircle size={18} />
          </button>
        }
      />

      <div className="orders-body">
        <div className="orders-detail-main">
          <section className="orders-card orders-status-card">
            <div className="orders-status-head">
              <span className={`orders-badge is-${tone}`}>
                {tone === 'cancelled' ? <XCircle size={14} /> : tone === 'delivered' ? <CheckCircle2 size={14} /> : <Truck size={14} />} {STATUS_LABEL[order.status]}
              </span>
              <strong>#{order.id}</strong>
            </div>
            {placed && (
              <div className="orders-meta-row">
                <span>Placed</span>
                <b>{placed}</b>
              </div>
            )}
            <div className="orders-meta-row">
              <span>Payment</span>
              <b>{paymentSummary(order)}</b>
            </div>
            <div className="orders-meta-row">
              <span>Deliver to</span>
              <b>
                {order.address.label} · {order.address.street}, {order.address.area}, {order.address.city} {order.address.pincode}
              </b>
            </div>
            {order.splitDeliveryNote && <p className="orders-note">{order.splitDeliveryNote}</p>}
          </section>

          <div className="orders-section-head">
            <h2 className="orders-section-title">Items in this order</h2>
            <span className="orders-count">{itemCountLabel(order)}</span>
          </div>
          <section className="orders-card orders-items-card">
            {order.items.map((item) => (
              <div key={`${item.productId}-${item.variantSize}`} className="orders-item-row">
                <OrderThumb item={item} />
                <div className="orders-item-copy">
                  {item.brand && <span className="orders-category">{item.brand}</span>}
                  <b>{item.productName}</b>
                  <small>
                    {item.variantSize} · Qty {item.quantity} · {formatRupee(item.unitPrice)} each
                  </small>
                  {item.insuranceSelected && <small className="is-qty">Beauty Insurance added</small>}
                </div>
                <strong className="orders-item-price">{formatRupee(item.unitPrice * item.quantity)}</strong>
              </div>
            ))}
          </section>

          <h2 className="orders-section-title">Bill summary</h2>
          <section className="orders-card orders-bill-card">
            <div className="orders-bill-row">
              <span>Item total</span>
              <b>{formatRupee(order.itemSubtotal)}</b>
            </div>
            {order.discount > 0 && (
              <div className="orders-bill-row">
                <span>Discount</span>
                <b className="is-discount">−{formatRupee(order.discount)}</b>
              </div>
            )}
            <div className="orders-bill-row">
              <span>Delivery fee</span>
              <b>{order.deliveryFee > 0 ? formatRupee(order.deliveryFee) : 'Free'}</b>
            </div>
            {order.insuranceTotal > 0 && (
              <div className="orders-bill-row">
                <span>Beauty Insurance</span>
                <b>{formatRupee(order.insuranceTotal)}</b>
              </div>
            )}
            <div className="orders-grand-total">
              <span>Total</span>
              <strong>{formatRupee(order.finalPayable)}</strong>
            </div>
            <p className="orders-note">{paymentSummary(order)}</p>
          </section>
        </div>

        <div className="orders-detail-side">
          <section className="orders-card orders-timeline-card" aria-labelledby="orders-detail-progress">
            <h2 id="orders-detail-progress" className="orders-card-title">
              Delivery progress
            </h2>
            {tone === 'cancelled' ? (
              <p className="orders-cancel-note">
                <XCircle size={16} /> This order was cancelled and will not be delivered.
              </p>
            ) : (
              <ol className="orders-vtimeline">
                {DELIVERY_STAGES.map((label, index) => (
                  <li key={label} className={index < current || tone === 'delivered' ? 'is-done' : index === current ? 'is-current' : ''}>
                    <span className="orders-vtimeline-dot">{index < current || tone === 'delivered' ? <CheckCircle2 size={14} /> : index + 1}</span>
                    <b>{label}</b>
                  </li>
                ))}
              </ol>
            )}
            {tone === 'active' && (
              <button type="button" className="orders-primary-button is-block" onClick={openTracking}>
                <Truck size={16} /> Track order
              </button>
            )}
          </section>

          <section className="orders-card orders-actions-card">
            <h2 className="orders-card-title">Need anything else?</h2>
            <div className="orders-action-grid">
              <button type="button" className="orders-action-tile" onClick={() => buyAgain(order)}>
                <RotateCcw size={18} /> Buy again
              </button>
              {tone === 'delivered' && (
                <button type="button" className="orders-action-tile" onClick={() => navigate('orders-rate', { orderId: order.id })}>
                  <Star size={18} /> Rate order
                </button>
              )}
              <button type="button" className="orders-action-tile" onClick={openSupport}>
                <MessageSquare size={18} /> Chat with support
              </button>
              <a className="orders-action-tile" href={`tel:+91${SUPPORT_HOTLINE}`}>
                <Phone size={18} /> Call support
              </a>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
};
