import React, { useState } from 'react';
import { CheckCircle2, ChevronRight, Clock, HelpCircle, MapPin, RotateCcw, Star, Truck, XCircle } from 'lucide-react';
import { useApp } from '../../context/useApp';
import type { Order } from '../../types';
import { OrdersHeader } from './components/OrdersHeader';
import {
  DELIVERY_STAGES,
  OrderThumb,
  OrdersEmpty,
  STATUS_LABEL,
  formatOrderDate,
  formatRupee,
  isActiveOrder,
  itemCountLabel,
  orderTone,
  stageIndex,
  useBuyAgain,
} from './orderUtils';

const MAX_THUMBS = 4;

const StatusBadge: React.FC<{ order: Order }> = ({ order }) => {
  const tone = orderTone(order);
  const Icon = tone === 'delivered' ? CheckCircle2 : tone === 'cancelled' ? XCircle : Clock;
  return (
    <span className={`orders-badge is-${tone}`}>
      <Icon size={13} /> {STATUS_LABEL[order.status]}
    </span>
  );
};

const Thumbs: React.FC<{ order: Order }> = ({ order }) => {
  const extra = order.items.length - MAX_THUMBS;
  return (
    <div className="orders-thumbs">
      {order.items.slice(0, MAX_THUMBS).map((item) => (
        <OrderThumb key={`${item.productId}-${item.variantSize}`} item={item} />
      ))}
      {extra > 0 && <span className="orders-more-items">+{extra} more</span>}
    </div>
  );
};

const Progress: React.FC<{ order: Order }> = ({ order }) => {
  const current = stageIndex(order);
  return (
    <ol className="orders-progress" aria-label={`Delivery progress: ${STATUS_LABEL[order.status]}`}>
      {DELIVERY_STAGES.map((label, index) => (
        <li key={label} className={index < current ? 'is-done' : index === current ? 'is-current' : ''}>
          <span className="orders-progress-dot">{index < current ? <CheckCircle2 size={14} /> : index === current ? <Truck size={13} /> : null}</span>
          <small>{label}</small>
        </li>
      ))}
    </ol>
  );
};

interface OrderCardProps {
  order: Order;
  onOpen: (order: Order) => void;
  onTrack: (order: Order) => void;
  onRate: (order: Order) => void;
  onBuyAgain: (order: Order) => void;
  onCancelled: (order: Order) => void;
}

const OrderCard: React.FC<OrderCardProps> = ({ order, onOpen, onTrack, onRate, onBuyAgain, onCancelled }) => {
  const tone = orderTone(order);
  const placed = formatOrderDate(order.createdAt);
  return (
    <article className={`orders-order-card is-${tone}`}>
      <button type="button" className="orders-card-open" onClick={() => onOpen(order)} aria-label={`View details of order ${order.id}`}>
        <div className="orders-card-head">
          <div>
            <strong>#{order.id}</strong>
            <span>{placed ? `Placed ${placed}` : 'Placed recently'}</span>
          </div>
          <StatusBadge order={order} />
        </div>
        <Thumbs order={order} />
        <div className="orders-summary-row">
          <div>
            <strong>{formatRupee(order.finalPayable)}</strong>
            <span className="orders-address-line">
              <MapPin size={12} /> {itemCountLabel(order)} · {order.address.label}, {order.address.area}
            </span>
          </div>
          <ChevronRight size={18} />
        </div>
      </button>

      {tone === 'active' && <Progress order={order} />}

      <div className="orders-card-actions">
        {tone === 'active' && (
          <button type="button" className="orders-primary-button" onClick={() => onTrack(order)}>
            <Truck size={16} /> Track order
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
            <button type="button" className="orders-secondary-button" onClick={() => onCancelled(order)}>
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
  const { goBack, navigate, orders, setActiveOrder } = useApp();
  const buyAgain = useBuyAgain();
  const activeOrders = orders.filter(isActiveOrder);
  const pastOrders = orders.filter((order) => !isActiveOrder(order));
  const [activeTab, setActiveTab] = useState<'active' | 'past'>(activeOrders.length ? 'active' : 'past');

  const select = (order: Order) => setActiveOrder(order);
  const handleOpen = (order: Order) => {
    select(order);
    navigate('orders-detail', { orderId: order.id });
  };
  const handleTrack = (order: Order) => {
    select(order);
    navigate('orders-tracking', { orderId: order.id });
  };
  const handleRate = (order: Order) => navigate('orders-rate', { orderId: order.id });
  const handleCancelled = (order: Order) => {
    select(order);
    navigate('order-cancelled', { orderId: order.id });
  };

  const visible = activeTab === 'active' ? activeOrders : pastOrders;

  return (
    <main className="orders-screen is-list">
      <OrdersHeader
        title="My orders"
        subtitle="Track, reorder or get help"
        onBack={goBack}
        right={
          <button type="button" className="orders-icon-button" aria-label="Help with an order" onClick={() => navigate('support')}>
            <HelpCircle size={18} />
          </button>
        }
      />

      <div className="orders-body">
        {orders.length === 0 ? (
          <OrdersEmpty title="No orders yet" body="When you place an order, you can track it, reorder and get help from here." actionLabel="Shop now" />
        ) : (
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
                body={activeTab === 'active' ? 'Orders on their way to you will show up here.' : 'Delivered and cancelled orders will show up here.'}
                actionLabel={activeTab === 'active' ? 'Shop now' : 'See active orders'}
                onAction={activeTab === 'active' ? undefined : () => setActiveTab('active')}
              />
            ) : (
              <div className="orders-grid">
                {visible.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onOpen={handleOpen}
                    onTrack={handleTrack}
                    onRate={handleRate}
                    onBuyAgain={buyAgain}
                    onCancelled={handleCancelled}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
};
