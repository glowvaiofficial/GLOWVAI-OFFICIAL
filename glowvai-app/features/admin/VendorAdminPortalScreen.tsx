import { useState } from 'react';
import { Bike, Box, MapPin, MessageCircle, User } from 'lucide-react';
import { AdminChip, AdminNotice, AdminShell } from './components/AdminShell';
import { DISPATCH_PHONE_PRIMARY, DISPATCH_PHONE_SECONDARY, createWhatsAppOrderLink } from '../../core/utils/whatsapp';

type OrderStatus = 'STORE_ASSIGNED' | 'PACKED' | 'IN_TRANSIT' | 'DELIVERED';

interface VendorOrder {
  id: string;
  orderId: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  hub: string;
  items: string[];
  total: number;
  payment: string;
  otp: string;
  status: OrderStatus;
  slaSeconds: number;
}

const HUBS = ['Payikapuram (DS-VIJ-01)', 'Singh Nagar (DS-VIJ-02)', 'Benz Circle (DS-VIJ-03)'];

const INITIAL_ORDERS: VendorOrder[] = [
  {
    id: '1',
    orderId: 'ORD-849201',
    customerName: 'Mukesh',
    customerPhone: '8977855998',
    deliveryAddress: 'Flat 402, Sri Krishna Apts, Payikapuram',
    hub: 'Payikapuram (DS-VIJ-01)',
    items: ['Minimalist 10% Niacinamide Serum (x1)', 'Instant Glow Booster ₹1 Sample (x1)'],
    total: 599,
    payment: 'PAID ONLINE (UPI)',
    otp: '4892',
    status: 'STORE_ASSIGNED',
    slaSeconds: 45,
  },
  {
    id: '2',
    orderId: 'ORD-849202',
    customerName: 'Kavitha R.',
    customerPhone: '9876543210',
    deliveryAddress: 'Street 4, Singh Nagar, Vijayawada',
    hub: 'Singh Nagar (DS-VIJ-02)',
    items: ['Derma Co 1% Hyaluronic Sunscreen (x1)'],
    total: 499,
    payment: 'PAID ONLINE (PhonePe)',
    otp: '1934',
    status: 'PACKED',
    slaSeconds: 110,
  },
];

const STATUS_TONE: Record<OrderStatus, 'info' | 'warning' | 'success' | 'neutral'> = {
  STORE_ASSIGNED: 'info',
  PACKED: 'warning',
  IN_TRANSIT: 'neutral',
  DELIVERED: 'success',
};

export const VendorAdminPortalScreen = () => {
  const [activeTab, setActiveTab] = useState<'vendor' | 'admin'>('vendor');
  const [selectedHub, setSelectedHub] = useState(HUBS[0]);
  const [orders, setOrders] = useState<VendorOrder[]>(INITIAL_ORDERS);
  const [notice, setNotice] = useState<{ title: string; text: string; tone: 'success' | 'info' | 'warning' } | null>(
    null
  );

  const handleUpdateStatus = (orderId: string, nextStatus: OrderStatus) => {
    setOrders((prev) => prev.map((o) => (o.orderId === orderId ? { ...o, status: nextStatus } : o)));
    setNotice({ title: 'Status updated', text: `Order #${orderId} marked as ${nextStatus}.`, tone: 'success' });
  };

  const handleSendWhatsAppAlert = (order: VendorOrder) => {
    const msg = `🚨 *GLOWVAI ORDER DISPATCH ALERT* 🚨
Order #${order.orderId}
Customer: ${order.customerName} (${order.customerPhone})
Address: ${order.deliveryAddress}
Pickup Hub: ${order.hub}
Delivery OTP: ${order.otp}
Amount: ₹${order.total} (${order.payment})`;
    const url = createWhatsAppOrderLink(DISPATCH_PHONE_PRIMARY, msg);
    const opened = window.open(url, '_blank', 'noopener');
    if (!opened) {
      setNotice({
        title: 'WhatsApp alert',
        text: `Alerting dispatch team at ${DISPATCH_PHONE_PRIMARY} and ${DISPATCH_PHONE_SECONDARY}`,
        tone: 'warning',
      });
    }
  };

  return (
    <AdminShell
      active="admin-vendor-portal"
      title="Operations and vendor hub"
      subtitle="Vijayawada hyperlocal dark store network"
      actions={
        <div className="admin-segment" role="tablist" aria-label="Hub view">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'vendor'}
            className={`admin-segment-btn${activeTab === 'vendor' ? ' is-active' : ''}`}
            onClick={() => setActiveTab('vendor')}
          >
            Dark store operator
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'admin'}
            className={`admin-segment-btn${activeTab === 'admin' ? ' is-active' : ''}`}
            onClick={() => setActiveTab('admin')}
          >
            Dispatch control tower
          </button>
        </div>
      }
    >
      {notice && (
        <AdminNotice title={notice.title} text={notice.text} tone={notice.tone} onClose={() => setNotice(null)} />
      )}

      <section className="admin-card admin-section">
        <div className="admin-section-head">
          <span className="admin-eyebrow" style={{ margin: 0 }}>
            Active fulfilment hub
          </span>
        </div>
        <div className="admin-pills" role="radiogroup" aria-label="Fulfilment hub">
          {HUBS.map((h) => (
            <button
              key={h}
              type="button"
              role="radio"
              aria-checked={selectedHub === h}
              className={`admin-pill${selectedHub === h ? ' is-active' : ''}`}
              onClick={() => setSelectedHub(h)}
            >
              {h}
            </button>
          ))}
        </div>
      </section>

      <section className="admin-section">
        <div className="admin-section-head">
          <h2 className="admin-section-title">
            {activeTab === 'vendor' ? 'Incoming packing queue (60s SLA)' : 'Live dispatch stream'}
          </h2>
          <AdminChip tone="info">{orders.length} orders</AdminChip>
        </div>

        <div className="admin-order-grid">
          {orders.map((order) => (
            <article key={order.orderId} className="admin-order-card">
              <div className="admin-order-head">
                <div>
                  <p className="admin-order-id">#{order.orderId}</p>
                  <span className="admin-section-note">{order.hub}</span>
                </div>
                <AdminChip tone={STATUS_TONE[order.status]}>{order.status}</AdminChip>
              </div>

              <div className="admin-order-meta">
                <User size={15} color="var(--text-secondary)" />
                <span>
                  {order.customerName} ({order.customerPhone})
                </span>
              </div>
              <div className="admin-order-meta">
                <MapPin size={15} color="var(--text-secondary)" />
                <span>{order.deliveryAddress}</span>
              </div>

              <div>
                <span className="admin-claim-label">Items to pick (Bin A-01)</span>
                <ul className="admin-order-items" style={{ marginTop: 6 }}>
                  {order.items.map((it) => (
                    <li key={it}>• {it}</li>
                  ))}
                </ul>
              </div>

              <div className="admin-order-foot">
                <span className="admin-price">
                  ₹{order.total} · {order.payment}
                </span>
                <span className="admin-otp">OTP {order.otp}</span>
              </div>

              <div className="admin-order-actions">
                {order.status === 'STORE_ASSIGNED' && (
                  <button
                    type="button"
                    className="admin-btn admin-btn--primary admin-btn--sm"
                    onClick={() => handleUpdateStatus(order.orderId, 'PACKED')}
                  >
                    <Box size={14} />
                    Mark packed
                  </button>
                )}
                {order.status === 'PACKED' && (
                  <button
                    type="button"
                    className="admin-btn admin-btn--primary admin-btn--sm"
                    onClick={() => handleUpdateStatus(order.orderId, 'IN_TRANSIT')}
                  >
                    <Bike size={14} />
                    Handover to rider
                  </button>
                )}
                <button type="button" className="admin-btn admin-btn--sm" onClick={() => handleSendWhatsAppAlert(order)}>
                  <MessageCircle size={14} />
                  WhatsApp alert
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </AdminShell>
  );
};

export default VendorAdminPortalScreen;
