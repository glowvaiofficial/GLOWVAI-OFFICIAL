import React, { useEffect, useState } from 'react';
import { CheckCircle2, ChevronRight, Clock, HelpCircle, MapPin, RefreshCw, RotateCcw, Star, XCircle } from 'lucide-react';
import { useApp } from '../../context/useApp';
import type { ShopOrder } from '../../core/services/shopApi';
import { OrdersHeader } from './components/OrdersHeader';
import {
  OrderThumb,
  OrdersEmpty,
  OrdersLoadState,
  addressLine,
  formatOrderDate,
  formatRupee,
  isActiveOrder,
  itemCountLabel,
  orderTone,
  orderTotal,
  statusLabel,
  useBuyAgain,
  useShopOrders,
} from './orderUtils';

const MAX_THUMBS = 4;

const StatusBadge: React.FC<{ order: ShopOrder }> = ({ order }) => {
  const tone = orderTone(order);
  const Icon = tone === 'delivered' ? CheckCircle2 : tone === 'cancelled' ? XCircle : Clock;
  return (
    <span className={`orders-badge is-${tone}`}>
      <Icon size={13} /> {statusLabel(order.status)}
    </span>
  );
};

const Thumbs: React.FC<{ order: ShopOrder }> = ({ order }) => {
  const extra = order.items.length - MAX_THUMBS;
  return (
    <div className="orders-thumbs">
      {order.items.slice(0, MAX_THUMBS).map((item, index) => (
        <OrderThumb key={`${item.productId}-${index}`} item={item} />
      ))}
      {extra > 0 && <span className="orders-more-items">+{extra} more</span>}
    </div>
  );
};

interface OrderCardProps {
  order: ShopOrder;
  onOpen: (order: ShopOrder) => void;
  onRate: (order: ShopOrder) => void;
  onBuyAgain: (order: ShopOrder) => void;
}

const OrderCard: React.FC<OrderCardProps> = ({ order, onOpen, onRate, onBuyAgain }) => {
  const tone = orderTone(order);
  const placed = formatOrderDate(order.createdAt);
  const where = order.shippingAddress?.city || addressLine(order);
  return (
    <article className={`orders-order-card is-${tone}`}>
      <button type="button" className="orders-card-open" onClick={() => onOpen(order)} aria-label={`View details of order ${order.orderId}`}>
        <div className="orders-card-head">
          <div>
            <strong>#{order.orderId}</strong>
            <span>{placed ? `Placed ${placed}` : 'Placed recently'}</span>
          </div>
          <StatusBadge order={order} />
        </div>
        <Thumbs order={order} />
        <div className="orders-summary-row">
          <div>
            <strong>{formatRupee(orderTotal(order))}</strong>
            <span className="orders-address-line">
              <MapPin size={12} /> {itemCountLabel(order)}
              {where ? ` · ${where}` : ''}
            </span>
          </div>
          <ChevronRight size={18} />
        </div>
      </button>

      <div className="orders-card-actions">
        {tone === 'active' && (
          <button type="button" className="orders-primary-button" onClick={() => onOpen(order)}>
            <Clock size={16} /> View status
          </button>
        )}
        {tone === 'delivered' && (
          <>
            <button type="button" className="orders-secondary-button" onClick={() => onRate(order)}>
              <Star size={16} /> Rate order
            </button>
            <button type="button" className="orders-primary-button" onClick={() => onBuyAgain(order)}>
              <RotateCcw size={16} /> Buy again
            </button>
          </>
        )}
        {tone === 'cancelled' && (
          <>
            <button type="button" className="orders-secondary-button" onClick={() => onOpen(order)}>
              View details
            </button>
            <button type="button" className="orders-primary-button" onClick={() => onBuyAgain(order)}>
              <RotateCcw size={16} /> Buy again
            </button>
          </>
        )}
      </div>
    </article>
  );
};

export const OrdersListScreen: React.FC = () => {
  const { goBack, navigate } = useApp();
  const { orders, status, error, reload } = useShopOrders();
  const buyAgain = useBuyAgain();
  const activeOrders = orders.filter(isActiveOrder);
  const pastOrders = orders.filter((order) => !isActiveOrder(order));
  const [activeTab, setActiveTab] = useState<'active' | 'past'>('active');

  // Open on the past tab when there is nothing active.
  useEffect(() => {
    if (status === 'ready' && activeOrders.length === 0 && pastOrders.length > 0) setActiveTab('past');
  }, [status]);

  const handleOpen = (order: ShopOrder) => navigate('orders-detail', { orderId: order.orderId });
  const handleRate = (order: ShopOrder) => navigate('orders-rate', { orderId: order.orderId });

  const visible = activeTab === 'active' ? activeOrders : pastOrders;

  return (
    <main className="orders-screen is-list">
      <OrdersHeader
        title="My orders"
        subtitle="Status from the GlowVai team"
        onBack={goBack}
        right={
          <>
            <button type="button" className="orders-icon-button" aria-label="Refresh orders" onClick={() => void reload()}>
              <RefreshCw size={18} />
            </button>
            <button type="button" className="orders-icon-button" aria-label="Help with an order" onClick={() => navigate('profile-support')}>
              <HelpCircle size={18} />
            </button>
          </>
        }
      />

      <div className="orders-body">
        <OrdersLoadState status={status} error={error} onRetry={() => void reload()} hasOrders={orders.length > 0} />
        {status === 'ready' && orders.length === 0 ? (
          <OrdersEmpty title="No orders yet" body="When you place an order, you can follow its status, cancel it or get help from here." actionLabel="Shop now" />
        ) : orders.length > 0 ? (
          <>
            <div className="orders-segment" role="tablist" aria-label="Order status">
              <button type="button" role="tab" aria-selected={activeTab === 'active'} className={activeTab === 'active' ? 'is-active' : ''} onClick={() => setActiveTab('active')}>
                Active ({activeOrders.length})
              </button>
              <button type="button" role="tab" aria-selected={activeTab === 'past'} className={activeTab === 'past' ? 'is-active' : ''} onClick={() => setActiveTab('past')}>
                Past ({pastOrders.length})
              </button>
            </div>

            {visible.length === 0 ? (
              <OrdersEmpty
                title={activeTab === 'active' ? 'No active orders' : 'No past orders'}
                body={activeTab === 'active' ? 'Orders that are not yet delivered show up here.' : 'Delivered and cancelled orders show up here.'}
                actionLabel={activeTab === 'active' ? 'Shop now' : 'See active orders'}
                onAction={activeTab === 'active' ? undefined : () => setActiveTab('active')}
              />
            ) : (
              <div className="orders-grid">
                {visible.map((order) => (
                  <OrderCard key={order.orderId} order={order} onOpen={handleOpen} onRate={handleRate} onBuyAgain={buyAgain} />
                ))}
              </div>
            )}
          </>
        ) : null}
      </div>
    </main>
  );
};
