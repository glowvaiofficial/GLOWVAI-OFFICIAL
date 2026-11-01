import React, { useMemo, useState } from 'react';
import { ArrowRight, MapPin, PackageOpen, RotateCcw, Star } from 'lucide-react';
import { useApp } from '../../context/useApp';
import type { Order } from '../../types';
import { OrdersHeader } from './components/OrdersHeader';
import { OrderProgressBar, OrderThumbs, OrdersState, StatusBadge } from './components/OrderParts';
import { formatOrderDate, formatRupees, isActiveOrder, itemCount, loadRatings, reorderItems } from './lib/orderUtils';

const itemsLine = (order: Order) => {
  const first = order.items[0]?.productName ?? 'Order';
  const others = order.items.length - 1;
  return others > 0 ? `${first} and ${others} more` : first;
};

export const OrdersListScreen: React.FC = () => {
  const { goBack, navigate, orders, addToCart, showToast, setActiveOrder } = useApp();
  const activeOrders = useMemo(() => orders.filter(isActiveOrder), [orders]);
  const pastOrders = useMemo(() => orders.filter((order) => !isActiveOrder(order)), [orders]);
  const [tab, setTab] = useState<'active' | 'past'>(activeOrders.length ? 'active' : 'past');
  const ratings = useMemo(() => loadRatings(), []);

  const openTracking = (order: Order) => {
    setActiveOrder(order);
    navigate('orders-tracking', { orderId: order.id });
  };
  const openDetails = (order: Order) => navigate('orders-detail', { orderId: order.id });
  const buyAgain = (order: Order) => {
    const added = reorderItems(order, addToCart);
    if (!added) {
      showToast('These items are not available right now');
      return;
    }
    showToast(added === order.items.length ? 'Added to your bag' : 'Available items added to your bag');
    navigate('cart-tab');
  };

  const list = tab === 'active' ? activeOrders : pastOrders;

  return (
    <main className="orders-screen is-list">
      <OrdersHeader title="Your orders" subtitle={orders.length ? `${orders.length} order${orders.length === 1 ? '' : 's'}` : undefined} onBack={goBack} />

      <div className="orders-content">
        {!orders.length ? (
          <OrdersState icon={<PackageOpen size={30} />} title="No orders yet" body="Orders you place in the shop will show up here, with their status and delivery address.">
            <button className="orders-primary-button" onClick={() => navigate('shop-home')}>
              Start shopping <ArrowRight size={16} />
            </button>
          </OrdersState>
        ) : (
          <>
            <div className="orders-segment" role="tablist" aria-label="Order status">
              <button role="tab" id="orders-tab-active" aria-controls="orders-panel" aria-selected={tab === 'active'} className={tab === 'active' ? 'is-active' : ''} onClick={() => setTab('active')}>
                Active <span>{activeOrders.length}</span>
              </button>
              <button role="tab" id="orders-tab-past" aria-controls="orders-panel" aria-selected={tab === 'past'} className={tab === 'past' ? 'is-active' : ''} onClick={() => setTab('past')}>
                Past <span>{pastOrders.length}</span>
              </button>
            </div>

            <div id="orders-panel" role="tabpanel" aria-labelledby={tab === 'active' ? 'orders-tab-active' : 'orders-tab-past'} className="orders-card-grid">
              {!list.length && (
                <OrdersState
                  icon={<PackageOpen size={28} />}
                  title={tab === 'active' ? 'Nothing on the way' : 'No past orders yet'}
                  body={tab === 'active' ? 'Orders that are being packed or delivered appear here.' : 'Delivered and cancelled orders appear here.'}
                >
                  {tab === 'active' && pastOrders.length > 0 && (
                    <button className="orders-secondary-button" onClick={() => setTab('past')}>View past orders</button>
                  )}
                </OrdersState>
              )}

              {list.map((order) =>
                tab === 'active' ? (
                  <article key={order.id} className="orders-order-card is-active">
                    <header className="orders-card-head">
                      <div>
                        <strong>#{order.id}</strong>
                        <span>Placed {formatOrderDate(order.createdAt)}</span>
                      </div>
                      <StatusBadge order={order} />
                    </header>
                    <OrderThumbs order={order} />
                    <div className="orders-summary-row">
                      <div>
                        <strong>{formatRupees(order.finalPayable)}</strong>
                        <span>{itemCount(order)} item{itemCount(order) === 1 ? '' : 's'} · {order.estimatedDeliveryMinutes} min estimate</span>
                      </div>
                      <span className="orders-address-line">
                        <MapPin size={13} /> {order.address.label} · {order.address.area}
                      </span>
                    </div>
                    <OrderProgressBar order={order} />
                    <div className="orders-card-actions">
                      <button className="orders-primary-button" onClick={() => openTracking(order)}>
                        Track order <ArrowRight size={16} />
                      </button>
                      <button className="orders-secondary-button" onClick={() => openDetails(order)}>
                        Details
                      </button>
                    </div>
                  </article>
                ) : (
                  <article key={order.id} className="orders-order-card">
                    <header className="orders-card-head">
                      <div>
                        <strong>#{order.id}</strong>
                        <span>{formatOrderDate(order.createdAt)}</span>
                      </div>
                      <StatusBadge order={order} />
                    </header>
                    <OrderThumbs order={order} />
                    <p className="orders-items-line">{itemsLine(order)}</p>
                    <div className="orders-past-footer">
                      <strong>{formatRupees(order.finalPayable)}</strong>
                      <div className="orders-past-actions">
                        <button className="orders-chip" onClick={() => openDetails(order)}>Details</button>
                        {order.status === 'delivered' &&
                          (ratings[order.id] ? (
                            <span className="orders-chip is-static" aria-label={`You rated this order ${ratings[order.id].delivery || ratings[order.id].products} out of 5`}>
                              <Star size={13} fill="currentColor" /> Rated
                            </span>
                          ) : (
                            <button className="orders-chip" onClick={() => navigate('orders-rate', { orderId: order.id })}>
                              <Star size={13} /> Rate
                            </button>
                          ))}
                        <button className="orders-chip is-primary" onClick={() => buyAgain(order)}>
                          <RotateCcw size={13} /> Buy again
                        </button>
                      </div>
                    </div>
                  </article>
                )
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
};
