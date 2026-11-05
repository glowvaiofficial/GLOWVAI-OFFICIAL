import React, { useState } from 'react';
import { CheckCircle2, Clock, HelpCircle, MessageSquare, Phone, RefreshCw, RotateCcw, Star, XCircle } from 'lucide-react';
import { useApp } from '../../context/useApp';
import { useCustomerStore } from '../../core/state/customerStore';
import { SUPPORT_HOTLINE } from '../../core/utils/whatsapp';
import { OrdersHeader } from './components/OrdersHeader';
import {
  OrderThumb,
  OrdersEmpty,
  OrdersLoadState,
  addressLine,
  canCancel,
  formatOrderDate,
  formatRupee,
  itemCountLabel,
  orderTone,
  orderTotal,
  paymentSummary,
  statusLabel,
  statusNote,
  useBuyAgain,
  useRequestedOrder,
} from './orderUtils';

const CANCEL_REASONS = ['Ordered by mistake', 'Need to change address', 'Delivery time is too long', 'Found another product'];

// One order as the server has it: status (with any update from the GlowVai team), items, bill and address.
// There is no live rider or map: delivery updates appear here as the team records them.
export const OrderDetailsScreen: React.FC = () => {
  const { goBack, navigate, showToast } = useApp();
  const { order, requestedId, status, error, reload } = useRequestedOrder();
  const buyAgain = useBuyAgain();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState(CANCEL_REASONS[0]);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  if (!order) {
    const loading = status === 'idle' || status === 'loading' || status === 'error';
    return (
      <main className="orders-screen is-detail is-empty">
        <OrdersHeader title="Order details" onBack={goBack} />
        <div className="orders-body">
          {loading ? (
            <OrdersLoadState status={status} error={error} onRetry={() => void reload()} hasOrders={false} />
          ) : (
            <OrdersEmpty
              title={requestedId ? 'Order not found' : 'No orders yet'}
              body={requestedId ? `Order #${requestedId} is not on your account.` : 'Place an order and its items, bill and status will show up here.'}
              actionLabel={requestedId ? 'See my orders' : 'Shop now'}
              onAction={requestedId ? () => navigate('orders-list') : undefined}
            />
          )}
        </div>
      </main>
    );
  }

  const tone = orderTone(order);
  const placed = formatOrderDate(order.createdAt);
  const openSupport = () => navigate('profile-support', { orderId: order.orderId });
  const pricing = order.pricing;

  const confirmCancellation = async () => {
    setCancelling(true);
    setCancelError(null);
    const result = await useCustomerStore.getState().cancelOrder(order.orderId, reason);
    setCancelling(false);
    if (!result.ok) {
      setCancelError(result.error || 'The order could not be cancelled. Contact support.');
      return;
    }
    setCancelOpen(false);
    showToast('Your order is cancelled');
  };

  return (
    <main className="orders-screen is-detail">
      <OrdersHeader
        title="Order details"
        subtitle={`#${order.orderId}`}
        onBack={goBack}
        right={
          <>
            <button type="button" className="orders-icon-button" aria-label="Refresh status" onClick={() => void reload()}>
              <RefreshCw size={18} />
            </button>
            <button type="button" className="orders-icon-button" aria-label="Get help with this order" onClick={openSupport}>
              <HelpCircle size={18} />
            </button>
          </>
        }
      />

      <div className="orders-body">
        <div className="orders-detail-main">
          <section className="orders-card orders-status-card">
            <div className="orders-status-head">
              <span className={`orders-badge is-${tone}`}>
                {tone === 'cancelled' ? <XCircle size={14} /> : tone === 'delivered' ? <CheckCircle2 size={14} /> : <Clock size={14} />} {statusLabel(order.status)}
              </span>
              <strong>#{order.orderId}</strong>
            </div>
            <p className="orders-note">{statusNote(order)}</p>
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
            {order.shippingAddress && (
              <div className="orders-meta-row">
                <span>Deliver to</span>
                <b>
                  {[order.shippingAddress.recipientName, addressLine(order)].filter(Boolean).join(' · ')}
                </b>
              </div>
            )}
          </section>

          <div className="orders-section-head">
            <h2 className="orders-section-title">Items in this order</h2>
            <span className="orders-count">{itemCountLabel(order)}</span>
          </div>
          <section className="orders-card orders-items-card">
            {order.items.map((item, index) => (
              <div key={`${item.productId}-${index}`} className="orders-item-row">
                <OrderThumb item={item} />
                <div className="orders-item-copy">
                  {item.brand && <span className="orders-category">{item.brand}</span>}
                  <b>{item.title}</b>
                  <small>
                    Qty {item.quantity} · {formatRupee(item.unitPrice)} each
                  </small>
                </div>
                <strong className="orders-item-price">{formatRupee(item.unitPrice * item.quantity)}</strong>
              </div>
            ))}
          </section>

          {pricing && (
            <>
              <h2 className="orders-section-title">Bill summary</h2>
              <section className="orders-card orders-bill-card">
                <div className="orders-bill-row">
                  <span>Item total</span>
                  <b>{formatRupee(pricing.subtotal)}</b>
                </div>
                {pricing.discountAmount > 0 && (
                  <div className="orders-bill-row">
                    <span>Discount</span>
                    <b className="is-discount">−{formatRupee(pricing.discountAmount)}</b>
                  </div>
                )}
                <div className="orders-bill-row">
                  <span>Delivery fee</span>
                  <b>{pricing.deliveryFee > 0 ? formatRupee(pricing.deliveryFee) : 'Free'}</b>
                </div>
                <div className="orders-grand-total">
                  <span>Total</span>
                  <strong>{formatRupee(orderTotal(order))}</strong>
                </div>
                <p className="orders-note">{paymentSummary(order)}</p>
              </section>
            </>
          )}
        </div>

        <div className="orders-detail-side">
          <section className="orders-card orders-actions-card">
            <h2 className="orders-card-title">Need anything else?</h2>
            <div className="orders-action-grid">
              <button type="button" className="orders-action-tile" onClick={() => buyAgain(order)}>
                <RotateCcw size={18} /> Buy again
              </button>
              {tone === 'delivered' && (
                <button type="button" className="orders-action-tile" onClick={() => navigate('orders-rate', { orderId: order.orderId })}>
                  <Star size={18} /> Rate order
                </button>
              )}
              <button type="button" className="orders-action-tile" onClick={openSupport}>
                <MessageSquare size={18} /> Report a problem
              </button>
              <a className="orders-action-tile" href={`tel:+91${SUPPORT_HOTLINE}`}>
                <Phone size={18} /> Call support
              </a>
            </div>
          </section>

          {canCancel(order) && (
            <button type="button" className="orders-danger-button" onClick={() => setCancelOpen(true)}>
              Cancel this order
            </button>
          )}
        </div>
      </div>

      {cancelOpen && (
        <div className="orders-dialog-backdrop">
          <div className="orders-dialog" role="dialog" aria-modal="true" aria-labelledby="orders-cancel-title">
            <span className="orders-dialog-icon">
              <XCircle size={24} />
            </span>
            <h2 id="orders-cancel-title">Cancel this order?</h2>
            <p>You can cancel until the GlowVai team starts preparing it.</p>
            <label className="orders-field">
              Reason
              <select value={reason} onChange={(event) => setReason(event.target.value)} disabled={cancelling}>
                {CANCEL_REASONS.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </label>
            {cancelError && (
              <p className="orders-cancel-note" role="alert">
                <XCircle size={16} /> {cancelError}
              </p>
            )}
            <button type="button" className="orders-danger-button is-solid" onClick={() => void confirmCancellation()} disabled={cancelling}>
              {cancelling ? 'Cancelling…' : 'Yes, cancel order'}
            </button>
            <button type="button" className="orders-secondary-button is-block" onClick={() => setCancelOpen(false)} disabled={cancelling}>
              Keep my order
            </button>
          </div>
        </div>
      )}
    </main>
  );
};
