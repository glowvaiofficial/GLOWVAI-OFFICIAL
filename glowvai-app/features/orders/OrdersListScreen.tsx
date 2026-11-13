import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle2, ChevronRight, Clock, FileText, HelpCircle, MapPin, RefreshCw, RotateCcw, Truck, XCircle } from 'lucide-react';
import { useApp } from '../../context/useApp';
import { fetchOrdersPage, type ShopOrder } from '../../core/services/shopApi';
import { openInvoice } from '../../core/services/shopTracking';
import { ORDER_FILTERS, type OrderFilter } from '../../../lib/shop/orderHistory';
import { OrdersHeader } from './components/OrdersHeader';
import { RateProductsSection } from './components/RateProducts';
import {
  OrderThumb,
  OrdersEmpty,
  OrdersLoadState,
  formatOrderDate,
  formatRupee,
  itemCountLabel,
  orderTone,
  orderTotal,
  paymentSummary,
  statusLabel,
  useBuyAgain,
} from './orderUtils';

const MAX_THUMBS = 4;
const RETURN_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

const FILTER_LABEL: Record<OrderFilter, string> = {
  all: 'All',
  active: 'Active',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  returns: 'Returns',
};

const EMPTY_TEXT: Record<OrderFilter, { title: string; body: string }> = {
  all: { title: 'No orders yet', body: 'When you place an order, you can follow its status, cancel it or get help from here.' },
  active: { title: 'No active orders', body: 'Orders that are not yet delivered show up here.' },
  delivered: { title: 'No delivered orders', body: 'Orders that have been delivered show up here.' },
  cancelled: { title: 'No cancelled orders', body: 'Orders that were cancelled show up here.' },
  returns: { title: 'No returns or replacements', body: 'Return and replacement requests you make show up here.' },
};

const StatusBadge: React.FC<{ order: ShopOrder }> = ({ order }) => {
  const tone = orderTone(order);
  const Icon = tone === 'delivered' ? CheckCircle2 : tone === 'cancelled' || tone === 'unpaid' ? XCircle : Clock;
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
  onTrack: (order: ShopOrder) => void;
  onBuyAgain: (order: ShopOrder) => void;
  onInvoice: (order: ShopOrder) => void;
  onReturn: (order: ShopOrder) => void;
}

const OrderCard: React.FC<OrderCardProps> = ({ order, onOpen, onTrack, onBuyAgain, onInvoice, onReturn }) => {
  const tone = orderTone(order);
  const placed = formatOrderDate(order.createdAt);
  const canReturn = tone === 'delivered' && !order.hasReturn && typeof order.deliveredAt === 'number' && Date.now() - order.deliveredAt <= RETURN_WINDOW_MS;
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
              <MapPin size={12} /> {itemCountLabel(order)} · {paymentSummary(order)}
            </span>
          </div>
          <ChevronRight size={18} />
        </div>
        {order.hasReturn && <span className="orders-address-line">Return or replacement requested</span>}
      </button>

      <div className="orders-card-actions">
        {tone === 'active' && (
          <button type="button" className="orders-primary-button" onClick={() => onTrack(order)}>
            <Truck size={16} /> Track
          </button>
        )}
        {tone === 'delivered' && (
          <>
            <button type="button" className="orders-primary-button" onClick={() => onBuyAgain(order)}>
              <RotateCcw size={16} /> Reorder
            </button>
            <button type="button" className="orders-secondary-button" onClick={() => onInvoice(order)}>
              <FileText size={16} /> Invoice
            </button>
            {canReturn && (
              <button type="button" className="orders-secondary-button" onClick={() => onReturn(order)}>
                Request return
              </button>
            )}
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
      <RateProductsSection order={order} />
    </article>
  );
};

export const OrdersListScreen: React.FC = () => {
  const { goBack, navigate, showToast } = useApp();
  const buyAgain = useBuyAgain();
  const [filter, setFilter] = useState<OrderFilter>('all');
  const [orders, setOrders] = useState<ShopOrder[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [moreLoading, setMoreLoading] = useState(false);
  // Each load gets a number; a response for an older filter or page is dropped.
  const requestRef = useRef(0);

  const loadPage = async (nextFilter: OrderFilter, cursor: string | null) => {
    const id = ++requestRef.current;
    if (cursor) setMoreLoading(true);
    else {
      setStatus('loading');
      setError(null);
    }
    const res = await fetchOrdersPage(nextFilter, cursor);
    if (id !== requestRef.current) return;
    setMoreLoading(false);
    if (!res.ok || !res.data) {
      if (cursor) showToast(res.error || 'More orders could not be loaded. Try again.');
      else {
        setStatus('error');
        setError(res.error);
      }
      return;
    }
    setOrders((prev) => (cursor ? [...prev, ...res.data!.orders] : res.data!.orders));
    setNextCursor(res.data.nextCursor);
    setStatus('ready');
  };

  useEffect(() => {
    void loadPage(filter, null);
    // loadPage reads only the filter it is given.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const handleOpen = (order: ShopOrder) => navigate('orders-detail', { orderId: order.orderId });
  const handleTrack = (order: ShopOrder) => navigate('orders-tracking', { orderId: order.orderId });
  const handleReturn = (order: ShopOrder) => navigate('returns-request', { orderId: order.orderId });
  const handleInvoice = (order: ShopOrder) => void openInvoice(order.orderId).then((problem) => problem && showToast(problem));

  return (
    <main className="orders-screen is-list">
      <OrdersHeader
        title="Your orders"
        subtitle="Status from the GlowVai team"
        onBack={goBack}
        right={
          <>
            <button type="button" className="orders-icon-button" aria-label="Refresh orders" onClick={() => void loadPage(filter, null)}>
              <RefreshCw size={18} />
            </button>
            <button type="button" className="orders-icon-button" aria-label="Help with an order" onClick={() => navigate('profile-support')}>
              <HelpCircle size={18} />
            </button>
          </>
        }
      />

      <div className="orders-body">
        <div className="orders-segment" role="group" aria-label="Filter orders" style={{ flexWrap: 'wrap' }}>
          {ORDER_FILTERS.map((f) => (
            <button key={f} type="button" aria-pressed={filter === f} className={filter === f ? 'is-active' : ''} onClick={() => setFilter(f)}>
              {FILTER_LABEL[f]}
            </button>
          ))}
        </div>

        {status === 'loading' || status === 'error' ? (
          <OrdersLoadState status={status} error={error} onRetry={() => void loadPage(filter, null)} hasOrders={false} />
        ) : orders.length === 0 ? (
          <OrdersEmpty
            title={EMPTY_TEXT[filter].title}
            body={EMPTY_TEXT[filter].body}
            actionLabel={filter === 'all' ? 'Shop now' : 'See all orders'}
            onAction={filter === 'all' ? undefined : () => setFilter('all')}
          />
        ) : (
          <>
            <div className="orders-grid" aria-live="polite">
              {orders.map((order) => (
                <OrderCard
                  key={order.orderId}
                  order={order}
                  onOpen={handleOpen}
                  onTrack={handleTrack}
                  onBuyAgain={buyAgain}
                  onInvoice={handleInvoice}
                  onReturn={handleReturn}
                />
              ))}
            </div>
            {nextCursor && (
              <button type="button" className="orders-secondary-button is-block" disabled={moreLoading} onClick={() => void loadPage(filter, nextCursor)}>
                {moreLoading ? 'Loading…' : 'Load more orders'}
              </button>
            )}
          </>
        )}
      </div>
    </main>
  );
};
