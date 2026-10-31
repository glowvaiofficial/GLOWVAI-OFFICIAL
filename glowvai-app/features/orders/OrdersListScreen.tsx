import React, { useState } from 'react';
import { Bell, CheckCircle2, ChevronRight, Clock, MapPin, RotateCcw, Star, Zap } from 'lucide-react';
import { useApp } from '../../context/useApp';
import { OrdersHeader } from './components/OrdersHeader';

const ACTIVE_THUMBS = [
  'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=200&q=80',
  'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=200&q=80',
  'https://images.unsplash.com/photo-1586495777744-4413f21062fa?auto=format&fit=crop&w=200&q=80',
  'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?auto=format&fit=crop&w=200&q=80',
];

const PAST_THUMBS_1 = [
  'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=200&q=80',
  'https://images.unsplash.com/photo-1586495777744-4413f21062fa?auto=format&fit=crop&w=200&q=80',
];

const PAST_THUMBS_2 = ['https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=200&q=80'];

const ACTIVE_ORDER_ID = 'GV28491';

interface PastOrderCardProps {
  id: string;
  date: string;
  total: string;
  thumbs: string[];
  moreItems?: boolean;
  onRate: (id: string) => void;
}

const PastOrderCard: React.FC<PastOrderCardProps> = ({ id, date, total, thumbs, moreItems, onRate }) => (
  <article className="orders-past-card">
    <div className="orders-card-head">
      <div>
        <strong>#{id}</strong>
        <span>{date}</span>
      </div>
      <span className="orders-badge is-delivered">
        <CheckCircle2 size={12} /> Delivered
      </span>
    </div>

    <div className="orders-thumbs">
      {thumbs.map((url, i) => (
        <img key={i} src={url} alt="" />
      ))}
      {moreItems && <span className="orders-more-items">+1 item</span>}
    </div>

    <div className="orders-past-footer">
      <strong>{total}</strong>
      <div className="orders-past-actions">
        <button className="orders-chip is-rate" onClick={() => onRate(id)}>
          <Star size={13} /> Rate Order
        </button>
        <button className="orders-chip is-buy">
          <RotateCcw size={13} /> Buy Again
        </button>
      </div>
    </div>
  </article>
);

export const OrdersListScreen: React.FC = () => {
  const { goBack, navigate, showToast } = useApp();
  const [activeTab, setActiveTab] = useState<'active' | 'past'>('active');

  const handleTrack = (id: string) => navigate('orders-tracking', { orderId: id });
  const handleDetails = (id: string) => navigate('orders-detail', { orderId: id });
  const handleRate = (id: string) => navigate('orders-rate', { orderId: id });

  return (
    <main className="orders-screen is-list">
      <OrdersHeader
        title="My Orders"
        subtitle="BEAUTY · FASTER."
        onBack={goBack}
        right={
          <button className="orders-icon-button" aria-label="Notifications" onClick={() => showToast('No new notifications')}>
            <Bell size={18} />
            <span className="orders-unread-dot" />
          </button>
        }
      />

      <div className="orders-body">
        <div className="orders-segment" role="tablist">
          <button
            role="tab"
            aria-selected={activeTab === 'active'}
            className={activeTab === 'active' ? 'is-active' : ''}
            onClick={() => setActiveTab('active')}
          >
            Active (1)
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'past'}
            className={activeTab === 'past' ? 'is-active' : ''}
            onClick={() => setActiveTab('past')}
          >
            Past Orders
          </button>
        </div>

        {activeTab === 'active' ? (
          <>
            <p className="orders-section-label">ACTIVE ORDER</p>
            <article
              className="orders-active-card"
              role="button"
              tabIndex={0}
              onClick={() => handleDetails(ACTIVE_ORDER_ID)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') handleDetails(ACTIVE_ORDER_ID);
              }}
            >
              <div className="orders-card-head">
                <div>
                  <strong className="is-large">#{ACTIVE_ORDER_ID}</strong>
                  <span>Placed today · 12:42 PM</span>
                </div>
                <div className="orders-badge-stack">
                  <span className="orders-badge is-on-way">On the way</span>
                  <span className="orders-badge is-eta">
                    <Zap size={11} /> Arriving in 6 mins
                  </span>
                </div>
              </div>

              <div className="orders-thumbs">
                {ACTIVE_THUMBS.map((url, i) => (
                  <img key={i} src={url} alt="" />
                ))}
              </div>

              <div className="orders-summary-row">
                <div>
                  <strong>Total: ₹1,347</strong>
                  <span className="orders-address-line">
                    <MapPin size={12} /> Home · Vijayawada
                  </span>
                </div>
                <ChevronRight size={18} />
              </div>

              <div className="orders-timeline">
                <div className="orders-timeline-step is-done">
                  <span className="orders-dot">
                    <CheckCircle2 size={12} />
                  </span>
                  <small>Confirmed</small>
                </div>
                <div className="orders-timeline-line is-done" />
                <div className="orders-timeline-step is-done">
                  <span className="orders-dot">
                    <CheckCircle2 size={12} />
                  </span>
                  <small>Packed</small>
                </div>
                <div className="orders-timeline-line" />
                <div className="orders-timeline-step is-current">
                  <span className="orders-dot">
                    <Clock size={12} />
                  </span>
                  <small>On the way</small>
                </div>
                <div className="orders-timeline-line" />
                <div className="orders-timeline-step">
                  <span className="orders-dot is-pending" />
                  <small>Delivered</small>
                </div>
              </div>

              <button
                className="orders-primary-button"
                onClick={(event) => {
                  event.stopPropagation();
                  handleTrack(ACTIVE_ORDER_ID);
                }}
              >
                <Zap size={16} /> Track Order →
              </button>
            </article>

            <p className="orders-section-label">RECENTLY COMPLETED</p>
            <PastOrderCard id="GV27356" date="Delivered · Apr 28, 2025" total="₹2,892" thumbs={PAST_THUMBS_1} moreItems onRate={handleRate} />
          </>
        ) : (
          <>
            <p className="orders-section-label">PAST ORDERS HISTORY</p>
            <PastOrderCard id="GV27356" date="Delivered · Apr 28, 2025" total="₹2,892" thumbs={PAST_THUMBS_1} onRate={handleRate} />
            <PastOrderCard id="GV26190" date="Delivered · Mar 14, 2025" total="₹1,649" thumbs={PAST_THUMBS_2} onRate={handleRate} />
          </>
        )}
      </div>
    </main>
  );
};
