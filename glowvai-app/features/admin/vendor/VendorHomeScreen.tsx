import { useEffect, useRef, useState } from 'react';
import { Bell, Box, CheckCircle2, CheckCheck, Clock, MapPin, MessageCircle, Package, Wallet, Zap } from 'lucide-react';
import { useApp } from '../../../context/useApp';
import { getBackendBaseUrl } from '../../../core/services/apiConfig';
import { DISPATCH_PHONE_PRIMARY } from '../../../core/utils/whatsapp';
import { AdminChip, AdminNotice, AdminShell } from '../components/AdminShell';

interface IncomingOrder {
  orderId: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  distanceKm: string;
  earnings: number;
  totalAmount: number;
  items: Array<{ name: string; qty: number; bin: string }>;
  paymentMethod: string;
  otp: string;
  createdAt: number;
}

interface CompletedOrder {
  orderId: string;
  customerName: string;
  totalAmount: number;
  earnings: number;
  time: string;
  status: string;
}

type Tab = 'orders' | 'earnings' | 'notifications';

const COUNTDOWN_START = 60;
const POLL_INTERVAL_MS = 2500;

const INITIAL_ACTIVE: IncomingOrder[] = [
  {
    orderId: 'ORD-849201',
    customerName: 'Mukesh',
    customerPhone: '8977855998',
    deliveryAddress: 'Flat 402, Sri Krishna Apts, Payikapuram, Vijayawada',
    distanceKm: '0.8 km',
    earnings: 45,
    totalAmount: 599,
    items: [
      { name: 'Minimalist 10% Niacinamide Serum (30ml)', qty: 1, bin: 'BIN-A-01-02-01' },
      { name: 'Instant Glow Booster (1₹ Trial Sample)', qty: 1, bin: 'BIN-PROMO-01' },
    ],
    paymentMethod: 'PAID ONLINE (PHONEPE)',
    otp: '4892',
    createdAt: Date.now() - 40000,
  },
];

const INITIAL_COMPLETED: CompletedOrder[] = [
  { orderId: 'ORD-849188', customerName: 'Ananya S.', totalAmount: 749, earnings: 55, time: '10:15 AM', status: 'DELIVERED' },
  { orderId: 'ORD-849175', customerName: 'Rahul K.', totalAmount: 1199, earnings: 85, time: '09:42 AM', status: 'DELIVERED' },
];

export const VendorHomeScreen = () => {
  const { goBack } = useApp();

  const [isOnline, setIsOnline] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('orders');
  const [incomingOrder, setIncomingOrder] = useState<IncomingOrder | null>(null);
  const [countdown, setCountdown] = useState(COUNTDOWN_START);
  const [activeOrders, setActiveOrders] = useState<IncomingOrder[]>(INITIAL_ACTIVE);
  const [completedOrders] = useState<CompletedOrder[]>(INITIAL_COMPLETED);
  const [notice, setNotice] = useState<{ title: string; text: string; tone: 'success' | 'info' | 'warning' } | null>(
    null
  );
  const seenOrderIds = useRef<Set<string>>(new Set());

  // Live polling for new orders while online
  useEffect(() => {
    if (!isOnline) return;

    const checkIncomingOrders = async () => {
      try {
        const res = await fetch(`${getBackendBaseUrl()}/api/orders/all`);
        if (!res.ok) return;
        const data = await res.json();
        if (!data.ok || !Array.isArray(data.orders) || data.orders.length === 0) return;

        const latest = data.orders[data.orders.length - 1];
        if (!latest || seenOrderIds.current.has(latest.orderId)) return;
        seenOrderIds.current.add(latest.orderId);

        setCountdown(COUNTDOWN_START);
        setIncomingOrder({
          orderId: latest.orderId,
          customerName: latest.customerName || 'Mukesh',
          customerPhone: latest.customerPhone || '8977855998',
          deliveryAddress: latest.shippingAddress?.fullAddress || 'Payikapuram, Vijayawada',
          distanceKm: '0.8 km',
          earnings: 45,
          totalAmount: latest.pricing?.grandTotal || 1,
          items: (latest.items || []).map((it: any) => ({
            name: it.productName || it.name || 'Skincare Item',
            qty: it.quantity || it.qty || 1,
            bin: 'BIN-A-01-02-01',
          })),
          paymentMethod: latest.payment?.method || 'CASH ON DELIVERY',
          otp: '4892',
          createdAt: latest.createdAt || Date.now(),
        });
      } catch {
        // network polling
      }
    };

    const interval = window.setInterval(checkIncomingOrders, POLL_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [isOnline]);

  // 60-second acceptance countdown for the incoming order
  useEffect(() => {
    if (!incomingOrder) return;
    const timer = window.setInterval(() => setCountdown((prev) => prev - 1), 1000);
    return () => window.clearInterval(timer);
  }, [incomingOrder]);

  const declineOrder = () => {
    if (!incomingOrder) return;
    setNotice({
      title: 'Order declined',
      text: `Order #${incomingOrder.orderId} reassigned to nearest hub.`,
      tone: 'warning',
    });
    setIncomingOrder(null);
    setCountdown(COUNTDOWN_START);
  };

  // Timeout counts as a decline, as in the mobile app
  useEffect(() => {
    if (incomingOrder && countdown <= 0) declineOrder();
  }, [countdown, incomingOrder]);

  // Escape closes the dialog as a decline
  useEffect(() => {
    if (!incomingOrder) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') declineOrder();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const handleSimulateIncomingOrder = () => {
    if (!isOnline) {
      setNotice({
        title: 'You are offline',
        text: 'Turn on the online toggle to receive incoming order alerts.',
        tone: 'warning',
      });
      return;
    }
    const newId = 'ORD-' + Math.floor(100000 + Math.random() * 900000);
    setCountdown(COUNTDOWN_START);
    setIncomingOrder({
      orderId: newId,
      customerName: 'Mukesh (Vijayawada)',
      customerPhone: '8977855998',
      deliveryAddress: 'Flat 402, Sri Krishna Apts, Payikapuram',
      distanceKm: '0.8 km',
      earnings: 45,
      totalAmount: 1,
      items: [{ name: 'Instant Glow Booster (1₹ Trial Sample)', qty: 1, bin: 'BIN-PROMO-01' }],
      paymentMethod: 'CASH ON DELIVERY (COD)',
      otp: '4892',
      createdAt: Date.now(),
    });
  };

  const handleAcceptOrder = () => {
    if (!incomingOrder) return;
    setActiveOrders((prev) => [incomingOrder, ...prev]);
    setIncomingOrder(null);
    setCountdown(COUNTDOWN_START);
    setNotice({
      title: 'Order accepted',
      text: `Order #${incomingOrder.orderId} moved to your active packing queue.`,
      tone: 'success',
    });
  };

  const handleMarkPacked = (orderId: string) => {
    setActiveOrders((prev) => prev.filter((o) => o.orderId !== orderId));
    setNotice({
      title: 'Order handed over',
      text: `Order #${orderId} packed and handed over to rider at Bay 03.`,
      tone: 'success',
    });
  };

  const pendingCount = activeOrders.length;

  return (
    <AdminShell
      active="vendor-home"
      title="Vendor home"
      subtitle="Glowway darkstore (DS-VIJ-01), Payikapuram hub, Vijayawada"
    >
      {notice && (
        <AdminNotice title={notice.title} text={notice.text} tone={notice.tone} onClose={() => setNotice(null)} />
      )}

      <div className="vendor-topbar">
        <div>
          <p className="vendor-store-name">Glowway Darkstore (DS-VIJ-01)</p>
          <p className="vendor-store-meta">
            <MapPin size={13} style={{ verticalAlign: '-2px' }} /> Payikapuram hub, Vijayawada
          </p>
        </div>

        <div className={`vendor-online${isOnline ? ' is-online' : ''}`}>
          {isOnline && <span className="admin-live-dot" aria-hidden="true" />}
          {isOnline ? 'ONLINE' : 'OFFLINE'}
          <button
            type="button"
            role="switch"
            aria-checked={isOnline}
            aria-label="Online status"
            className="vendor-switch"
            onClick={() => setIsOnline((v) => !v)}
          />
        </div>
      </div>

      <div className="vendor-tabs" role="tablist" aria-label="Vendor sections">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'orders'}
          className={`vendor-tab${activeTab === 'orders' ? ' is-active' : ''}`}
          onClick={() => setActiveTab('orders')}
        >
          <Package size={16} />
          Active queue ({pendingCount})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'earnings'}
          className={`vendor-tab${activeTab === 'earnings' ? ' is-active' : ''}`}
          onClick={() => setActiveTab('earnings')}
        >
          <Wallet size={16} />
          Earnings
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'notifications'}
          className={`vendor-tab${activeTab === 'notifications' ? ' is-active' : ''}`}
          onClick={() => setActiveTab('notifications')}
        >
          <Bell size={16} />
          Notifications
        </button>
      </div>

      <button type="button" className="vendor-banner" onClick={handleSimulateIncomingOrder}>
        <Zap size={18} color="var(--warning)" />
        <span style={{ flex: 1 }}>
          <span className="vendor-banner-title">Simulate incoming customer order</span>
          <span className="vendor-banner-sub">Opens the 60s acceptance dialog to test the flow</span>
        </span>
      </button>

      {activeTab === 'orders' && (
        <section className="admin-section">
          <div className="admin-section-head">
            <h2 className="admin-section-title">Packing and dispatch queue (60s SLA)</h2>
          </div>

          {activeOrders.length === 0 ? (
            <AdminEmptyState />
          ) : (
            <div className="vendor-queue">
              {activeOrders.map((order) => (
                <article key={order.orderId} className="vendor-order">
                  <div className="vendor-order-head">
                    <div>
                      <p className="vendor-order-id">#{order.orderId}</p>
                      <p className="vendor-order-time">Assigned just now · 60s SLA</p>
                    </div>
                    <AdminChip tone="info">{order.paymentMethod}</AdminChip>
                  </div>

                  <div className="vendor-order-line">
                    <span>
                      {order.customerName} (+91 {order.customerPhone})
                    </span>
                  </div>
                  <div className="vendor-order-line">
                    <MapPin size={14} color="var(--text-secondary)" />
                    <span>{order.deliveryAddress}</span>
                  </div>

                  <div className="vendor-pick">
                    <span className="vendor-pick-label">Shelf picking checklist</span>
                    {order.items.map((item, idx) => (
                      <div key={idx} className="vendor-pick-row">
                        <CheckCircle2 size={15} color="var(--success)" />
                        <span className="vendor-pick-name">
                          {item.name} (x{item.qty})
                        </span>
                        <span className="vendor-bin">{item.bin}</span>
                      </div>
                    ))}
                  </div>

                  <div className="vendor-order-foot">
                    <div>
                      <span className="vendor-total-label">Grand total</span>
                      <span className="vendor-total">₹{order.totalAmount}</span>
                    </div>
                    <button
                      type="button"
                      className="admin-btn admin-btn--success"
                      onClick={() => handleMarkPacked(order.orderId)}
                    >
                      <Box size={16} />
                      Mark packed and handover
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {activeTab === 'earnings' && (
        <section className="admin-section">
          <div className="vendor-earn">
            <span className="vendor-earn-label">TODAY'S TOTAL PAYOUT</span>
            <span className="vendor-earn-amount">₹1,420.00</span>
            <span className="vendor-earn-sub">18 orders fulfilled today · Next payout at 11:59 PM</span>
          </div>

          <div className="admin-section-head">
            <h2 className="admin-section-title">Settlement history</h2>
          </div>
          <div className="vendor-list">
            {completedOrders.map((item) => (
              <div key={item.orderId} className="vendor-list-row">
                <span className="vendor-list-icon">
                  <CheckCheck size={18} color="var(--success)" />
                </span>
                <div className="vendor-list-main">
                  <div className="vendor-list-title">
                    #{item.orderId} · {item.customerName}
                  </div>
                  <div className="vendor-list-sub">
                    {item.time} · Total ₹{item.totalAmount}
                  </div>
                </div>
                <span className="vendor-list-amount">+₹{item.earnings}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {activeTab === 'notifications' && (
        <section className="admin-section">
          <div className="admin-section-head">
            <h2 className="admin-section-title">Dispatch notification log</h2>
          </div>
          <div className="vendor-list">
            <div className="vendor-list-row">
              <span className="vendor-list-icon">
                <MessageCircle size={18} color="#25D366" />
              </span>
              <div className="vendor-list-main">
                <div className="vendor-list-title">Automated WhatsApp dispatch sent</div>
                <div className="vendor-list-sub">
                  Order #ORD-849201 broadcast to +91 {DISPATCH_PHONE_PRIMARY} · 2 minutes ago
                </div>
              </div>
            </div>
            <div className="vendor-list-row">
              <span className="vendor-list-icon">
                <Clock size={18} color="var(--warning)" />
              </span>
              <div className="vendor-list-main">
                <div className="vendor-list-title">SLA target achieved (48s pick)</div>
                <div className="vendor-list-sub">100% on-time fulfilment rate maintained · 15 minutes ago</div>
              </div>
            </div>
          </div>
        </section>
      )}

      {incomingOrder && (
        <div className="vendor-backdrop" onClick={declineOrder}>
          <div
            className="vendor-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="vendor-incoming-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="vendor-dialog-head">
              <span className="admin-live-dot" aria-hidden="true" />
              <h2 className="vendor-dialog-title" id="vendor-incoming-title">
                NEW INCOMING ORDER
              </h2>
              <span className="vendor-countdown">
                <Clock size={14} />
                {Math.max(countdown, 0)}s
              </span>
            </div>

            <div className="vendor-stats">
              <div className="vendor-stat">
                <span className="vendor-stat-label">Vendor earning</span>
                <span className="vendor-stat-value">₹{incomingOrder.earnings}</span>
              </div>
              <div className="vendor-stat">
                <span className="vendor-stat-label">Distance</span>
                <span className="vendor-stat-value">{incomingOrder.distanceKm}</span>
              </div>
              <div className="vendor-stat">
                <span className="vendor-stat-label">Order total</span>
                <span className="vendor-stat-value">₹{incomingOrder.totalAmount}</span>
              </div>
            </div>

            <div className="vendor-route">
              <span className="vendor-route-label">Pickup location</span>
              <span className="vendor-route-value">Payikapuram Dark Store (Bay 03)</span>
            </div>
            <div className="vendor-route">
              <span className="vendor-route-label">Drop destination</span>
              <span className="vendor-route-value">{incomingOrder.deliveryAddress}</span>
            </div>

            <div>
              <span className="admin-claim-label">Items to pack ({incomingOrder.items.length})</span>
              <ul className="admin-order-items" style={{ marginTop: 6 }}>
                {incomingOrder.items.map((it, idx) => (
                  <li key={idx}>
                    • {it.name} (x{it.qty}) → <strong style={{ color: 'var(--warning)' }}>{it.bin}</strong>
                  </li>
                ))}
              </ul>
            </div>

            <div className="vendor-dialog-actions">
              <button type="button" className="admin-btn admin-btn--danger" onClick={declineOrder}>
                Decline
              </button>
              <button type="button" className="admin-btn admin-btn--success" onClick={handleAcceptOrder}>
                <CheckCircle2 size={18} />
                Accept order ({Math.max(countdown, 0)}s)
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
};

const AdminEmptyState = () => (
  <div className="admin-empty">
    <div className="admin-empty-icon">
      <CheckCircle2 size={28} />
    </div>
    <p className="admin-empty-title">All orders packed</p>
    <span>You are online. New orders will pop up instantly.</span>
  </div>
);

export default VendorHomeScreen;
