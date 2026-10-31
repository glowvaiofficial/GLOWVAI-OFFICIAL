import React from 'react';
import { CheckCircle2, Download, HelpCircle, MessageSquare, Phone, RotateCcw, Star } from 'lucide-react';
import { useApp } from '../../context/useApp';
import { SUPPORT_HOTLINE } from '../../core/utils/whatsapp';
import { OrdersHeader } from './components/OrdersHeader';

const DEFAULT_ORDER_ID = 'GV28491';

const ORDER_ITEMS = [
  {
    id: '1',
    name: 'GlowVAI Vitamin C Face Serum',
    variant: 'Brightening · 30ml',
    category: 'Skincare',
    qty: 1,
    price: 699,
    image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=300&q=80',
  },
  {
    id: '2',
    name: 'GlowVAI Hydra Plump Face Cream',
    variant: 'Hydration · 50g',
    category: 'Moisturizer',
    qty: 1,
    price: 499,
    image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=300&q=80',
  },
  {
    id: '3',
    name: 'GlowVAI Matte Lipstick',
    variant: 'Long Stay · Shade 08',
    category: 'Lips',
    qty: 1,
    price: 349,
    image: 'https://images.unsplash.com/photo-1586495777744-4413f21062fa?auto=format&fit=crop&w=300&q=80',
  },
];

const TIMELINE = [
  { stage: 'Confirmed', time: '12:42 PM' },
  { stage: 'Packed', time: '12:45 PM' },
  { stage: 'Out for delivery', time: '12:47 PM' },
  { stage: 'Delivered', time: '12:52 PM' },
];

export const OrderDetailsScreen: React.FC = () => {
  const { goBack, navigate, activeParams } = useApp();
  const orderId: string = activeParams?.orderId || activeParams?.id || DEFAULT_ORDER_ID;

  const openSupport = () => navigate('support', { orderId });
  const openRate = () => navigate('orders-rate', { orderId });

  return (
    <main className="orders-screen is-detail">
      <OrdersHeader
        title="Order Details"
        onBack={goBack}
        right={
          <button className="orders-icon-button" aria-label="Help" onClick={openSupport}>
            <HelpCircle size={18} />
          </button>
        }
      />

      <div className="orders-body">
        <div className="orders-detail-side">
        <section className="orders-status-card">
          <div className="orders-status-head">
            <span className="orders-badge is-delivered">
              <CheckCircle2 size={14} /> Delivered
            </span>
            <strong>#{orderId}</strong>
          </div>
          <div className="orders-meta-row">
            <span>Order date:</span>
            <b>13 Sep 2026</b>
          </div>
          <div className="orders-meta-row">
            <span>Delivery address:</span>
            <b>Home · Payakapuram, Vijayawada</b>
          </div>
        </section>

        <p className="orders-section-label">DELIVERY TIMELINE</p>
        <section className="orders-card orders-timeline-card">
          {TIMELINE.map((item, idx) => (
            <div key={item.stage} className="orders-timeline-row">
              <div className="orders-timeline-icon">
                <span className="orders-check-dot">
                  <CheckCircle2 size={14} />
                </span>
                {idx < TIMELINE.length - 1 && <span className="orders-vline" />}
              </div>
              <div className="orders-timeline-text">
                <b>{item.stage}</b>
                <small>{item.time}</small>
              </div>
            </div>
          ))}
        </section>

        </div>

        <div className="orders-detail-main">
        <div className="orders-section-head">
          <p className="orders-section-label">ITEMS IN YOUR ORDER</p>
          <span className="orders-count">{ORDER_ITEMS.length} items</span>
        </div>
        <section className="orders-card orders-items-card">
          {ORDER_ITEMS.map((item, idx) => (
            <div key={item.id}>
              <div className="orders-item-row">
                <img src={item.image} alt="" />
                <div className="orders-item-copy">
                  <span className="orders-category">{item.category}</span>
                  <b>{item.name}</b>
                  <small>{item.variant}</small>
                  <small className="is-qty">Qty: {item.qty}</small>
                </div>
                <strong className="orders-item-price">₹{item.price}</strong>
              </div>
              {idx < ORDER_ITEMS.length - 1 && <div className="orders-divider" />}
            </div>
          ))}
        </section>

        <p className="orders-section-label">BILL SUMMARY</p>
        <section className="orders-card orders-bill-card">
          <div className="orders-bill-row">
            <span>Item Total</span>
            <b>₹1,547</b>
          </div>
          <div className="orders-bill-row">
            <span>Discounts (GLOW10)</span>
            <b className="is-discount">–₹250</b>
          </div>
          <div className="orders-bill-row">
            <span>Delivery Fee</span>
            <b>₹50</b>
          </div>
          <div className="orders-bill-row">
            <span>Taxes &amp; Charges</span>
            <b>₹0</b>
          </div>
          <div className="orders-grand-total">
            <span>Grand Total</span>
            <strong>₹1,347</strong>
          </div>
        </section>

        <p className="orders-section-label">QUICK ACTIONS</p>
        <div className="orders-action-grid">
          <button className="orders-action-tile">
            <Download size={18} /> Download Invoice
          </button>
          <button className="orders-action-tile">
            <RotateCcw size={18} /> Buy Again
          </button>
          <button className="orders-action-tile" onClick={openRate}>
            <Star size={18} /> Rate Order
          </button>
          <button className="orders-action-tile" onClick={openSupport}>
            <HelpCircle size={18} /> Get Help
          </button>
        </div>

        <section className="orders-support-card">
          <div className="orders-support-head">
            <span className="orders-support-icon">
              <MessageSquare size={20} />
            </span>
            <div>
              <b>Need help with this order?</b>
              <small>Our support team is here for you.</small>
            </div>
          </div>
          <div className="orders-support-actions">
            <button className="orders-primary-button is-compact" onClick={openSupport}>
              <MessageSquare size={14} /> Chat Now
            </button>
            <a className="orders-secondary-button" href={`tel:+91${SUPPORT_HOTLINE}`}>
              <Phone size={14} /> Call
            </a>
          </div>
        </section>
        </div>
      </div>
    </main>
  );
};
