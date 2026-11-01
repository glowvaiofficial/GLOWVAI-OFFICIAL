import React from 'react';
import { ArrowRight, HelpCircle, MapPin, MessageSquare, Package, PackageOpen, Phone, RotateCcw, Star, Wallet } from 'lucide-react';
import { useApp } from '../../context/useApp';
import { SUPPORT_HOTLINE } from '../../core/utils/whatsapp';
import { OrdersHeader } from './components/OrdersHeader';
import { OrderTimeline, OrdersState, StatusBadge } from './components/OrderParts';
import { formatOrderDate, formatRupees, isActiveOrder, itemCount, loadRatings, paymentLabel, reorderItems } from './lib/orderUtils';

export const OrderDetailsScreen: React.FC = () => {
  const { goBack, navigate, activeParams, orders, activeOrder, addToCart, showToast, setActiveOrder } = useApp();
  const requestedId: string | undefined = activeParams?.orderId || activeParams?.id;
  const order = requestedId ? orders.find((o) => o.id === requestedId) ?? null : activeOrder ?? orders[0] ?? null;

  if (!order) {
    return (
      <main className="orders-screen is-detail">
        <OrdersHeader title="Order details" onBack={goBack} />
        <div className="orders-content">
          <OrdersState icon={<PackageOpen size={30} />} title="Order not found" body="We could not find this order on this device. Your orders list shows every order placed here.">
            <button className="orders-primary-button" onClick={() => navigate('orders-list')}>Go to your orders</button>
          </OrdersState>
        </div>
      </main>
    );
  }

  const active = isActiveOrder(order);
  const rated = Boolean(loadRatings()[order.id]);
  const openSupport = () => navigate('support', { orderId: order.id });
  const buyAgain = () => {
    const added = reorderItems(order, addToCart);
    if (!added) {
      showToast('These items are not available right now');
      return;
    }
    showToast('Added to your bag');
    navigate('cart-tab');
  };
  const track = () => {
    setActiveOrder(order);
    navigate('orders-tracking', { orderId: order.id });
  };
  const count = itemCount(order);

  return (
    <main className="orders-screen is-detail">
      <OrdersHeader
        title="Order details"
        subtitle={`#${order.id}`}
        onBack={goBack}
        right={
          <button className="orders-icon-button" aria-label="Get help with this order" onClick={openSupport}>
            <HelpCircle size={18} />
          </button>
        }
      />

      <div className="orders-content">
        <div className="orders-two-col">
          <div className="orders-col-main">
            <section className="orders-card orders-status-card">
              <div className="orders-status-head">
                <StatusBadge order={order} />
                <span>{formatOrderDate(order.createdAt)}</span>
              </div>
              <div className="orders-meta-row">
                <MapPin size={15} />
                <div>
                  <b>{order.address.label}</b>
                  <span>
                    {order.address.street}, {order.address.area}, {order.address.city} {order.address.pincode}
                  </span>
                </div>
              </div>
              <div className="orders-meta-row">
                <Wallet size={15} />
                <div>
                  <b>{paymentLabel(order)}</b>
                  <span>{formatRupees(order.finalPayable)} total</span>
                </div>
              </div>
              {active && (
                <button className="orders-primary-button is-block" onClick={track}>
                  Track order <ArrowRight size={16} />
                </button>
              )}
            </section>

            <section className="orders-card">
              <div className="orders-card-title-row">
                <h2 className="orders-card-title">Items</h2>
                <span className="orders-count">{count} item{count === 1 ? '' : 's'}</span>
              </div>
              <ul className="orders-item-list">
                {order.items.map((item) => (
                  <li key={`${item.productId}-${item.variantSize}`} className="orders-item-row">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt="" />
                    ) : (
                      <span className="orders-thumb-empty is-large" aria-hidden="true"><Package size={22} /></span>
                    )}
                    <div className="orders-item-copy">
                      {item.brand && <span className="orders-item-brand">{item.brand}</span>}
                      <b>{item.productName}</b>
                      <small>
                        {item.variantSize} · Qty {item.quantity}
                        {item.insuranceSelected ? ' · Suitability cover' : ''}
                      </small>
                    </div>
                    <strong className="orders-item-price">{formatRupees(item.unitPrice * item.quantity)}</strong>
                  </li>
                ))}
              </ul>
            </section>

            <section className="orders-card orders-bill-card">
              <h2 className="orders-card-title">Bill summary</h2>
              <div className="orders-bill-row"><span>Item total</span><b>{formatRupees(order.itemSubtotal)}</b></div>
              {order.discount > 0 && (
                <div className="orders-bill-row"><span>Discount</span><b className="is-discount">−{formatRupees(order.discount)}</b></div>
              )}
              {order.insuranceTotal > 0 && (
                <div className="orders-bill-row"><span>Suitability cover</span><b>{formatRupees(order.insuranceTotal)}</b></div>
              )}
              <div className="orders-bill-row"><span>Delivery fee</span><b>{order.deliveryFee > 0 ? formatRupees(order.deliveryFee) : 'Free'}</b></div>
              <div className="orders-grand-total">
                <span>{order.paymentStatus === 'successful' ? 'Paid' : 'Total'}</span>
                <strong>{formatRupees(order.finalPayable)}</strong>
              </div>
            </section>
          </div>

          <div className="orders-col-side">
            <section className="orders-card">
              <h2 className="orders-card-title">Progress</h2>
              <OrderTimeline order={order} />
            </section>

            <div className="orders-action-grid">
              <button className="orders-action-tile" onClick={buyAgain}>
                <RotateCcw size={18} /> Buy again
              </button>
              {order.status === 'delivered' && !rated && (
                <button className="orders-action-tile" onClick={() => navigate('orders-rate', { orderId: order.id })}>
                  <Star size={18} /> Rate order
                </button>
              )}
              {order.status === 'cancelled' && (
                <button className="orders-action-tile" onClick={() => { setActiveOrder(order); navigate('order-cancelled', { orderId: order.id }); }}>
                  <PackageOpen size={18} /> Cancellation
                </button>
              )}
              <button className="orders-action-tile" onClick={openSupport}>
                <HelpCircle size={18} /> Get help
              </button>
            </div>

            <section className="orders-card orders-support-card">
              <div className="orders-support-head">
                <span className="orders-support-icon"><MessageSquare size={18} /></span>
                <div>
                  <b>Need help with this order?</b>
                  <small>Chat with support or call us.</small>
                </div>
              </div>
              <div className="orders-support-actions">
                <button className="orders-primary-button" onClick={openSupport}>
                  <MessageSquare size={15} /> Chat
                </button>
                <a className="orders-secondary-button" href={`tel:+91${SUPPORT_HOTLINE}`}>
                  <Phone size={15} /> Call
                </a>
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
};
