import { Bell, ChevronRight, Gift, Heart, HelpCircle, MapPin, Package, ScanFace, Settings, Sparkles } from 'lucide-react';
import { useInbox } from '../../core/notifications/inboxStore';
import { useApp } from '../../context/useApp';
import { getInitials, ProfileHeader, ProfileListItem } from './ProfileShared';
import { formatRupee, orderTotal, statusLabel as orderStatusLabel, useShopOrders } from '../orders/orderUtils';

const countLabel = (count: number, singular: string, plural = `${singular}s`): string =>
  `${count} ${count === 1 ? singular : plural}`;

export const ProfileOverviewScreen = () => {
  const { user, customerDetails, skinReports, activeReport, wishlist, navigate } = useApp();
  const { orders } = useShopOrders();
  const name = customerDetails?.fullName || user?.name || 'Add your details';
  const phone = customerDetails?.phoneNumber ? `+91 ${customerDetails.phoneNumber} · not verified yet` : 'Name and mobile number not added';
  const report = activeReport ?? skinReports[0] ?? null;
  const recentOrder = orders[0] ?? null;
  const unread = useInbox((s) => s.unreadCount);

  return (
    <main className="profile-screen">
      <ProfileHeader title="My account" />

      <div className="profile-body">
        <div className="profile-side">
        <section className="profile-card">
          <button type="button" className="profile-user-button" onClick={() => navigate(customerDetails ? 'profile-edit' : 'login', customerDetails ? undefined : { returnTo: 'profile-tab' })}>
            <span className="profile-hero-avatar">{getInitials(customerDetails?.fullName || user?.name)}</span>
            <span className="profile-user-copy">
              <span className="profile-user-name">{name}</span>
              <span className="profile-user-phone">{phone}</span>
            </span>
            <ChevronRight size={20} className="profile-chevron" />
          </button>
        </section>

        <section className="profile-glow-card">
          <div className="profile-glow-top">
            <span className="profile-glow-icon"><Sparkles size={20} /></span>
            <div className="profile-glow-copy">
              <span className="profile-label">My glow profile</span>
              <h2 className="profile-card-title">{report ? `${report.skinType} skin` : 'No skin scan yet'}</h2>
            </div>
            {report && (
              <span className={report.isSample ? 'profile-pill is-muted' : 'profile-pill'}>
                {report.isSample ? 'Sample' : `${report.skinScore}/100`}
              </span>
            )}
          </div>
          <p className="profile-card-sub">
            {report
              ? report.recommendedIngredients.slice(0, 3).join(', ') || 'Open your report for routine suggestions.'
              : 'Scan your skin to build a profile and get product suggestions.'}
          </p>
          <button
            type="button"
            className="profile-text-link"
            onClick={() => navigate(report ? 'scan-report' : 'scan-intro')}
          >
            {report ? 'View skin report →' : 'Start skin scan →'}
          </button>
        </section>

        <p className="profile-label">My account hub</p>
        <div className="profile-tiles">
          <button type="button" className="profile-tile" onClick={() => navigate('orders-list')}>
            <span className="profile-tile-top"><span className="profile-tile-icon"><Package size={19} /></span><ChevronRight size={16} /></span>
            <span className="profile-tile-label">My orders</span>
            <span className="profile-tile-note">{orders.length ? countLabel(orders.length, 'order') : 'No orders yet'}</span>
          </button>
          <button type="button" className="profile-tile" onClick={() => navigate('shop-wishlist')}>
            <span className="profile-tile-top"><span className="profile-tile-icon"><Heart size={19} /></span><ChevronRight size={16} /></span>
            <span className="profile-tile-label">Wishlist</span>
            <span className="profile-tile-note">{wishlist.length} saved</span>
          </button>
          <button type="button" className="profile-tile" onClick={() => navigate(report ? 'scan-report' : 'scan-intro')}>
            <span className="profile-tile-top"><span className="profile-tile-icon"><ScanFace size={19} /></span><ChevronRight size={16} /></span>
            <span className="profile-tile-label">Skin reports</span>
            <span className="profile-tile-note">{skinReports.length ? countLabel(skinReports.length, 'report') : 'Scan to get one'}</span>
          </button>
          <button type="button" className="profile-tile" onClick={() => navigate('profile-referrals')}>
            <span className="profile-tile-top"><span className="profile-tile-icon"><Gift size={19} /></span><ChevronRight size={16} /></span>
            <span className="profile-tile-label">Refer friends</span>
            <span className="profile-tile-note">Share GlowVai</span>
          </button>
        </div>
        </div>

        <div className="profile-main">
        <p className="profile-label">Recent order</p>
        <section className="profile-card">
          {recentOrder ? (
            <button type="button" className="profile-ticket-button" onClick={() => navigate('orders-detail', { orderId: recentOrder.orderId })}>
              <span className="profile-ticket-top">
                <span className="profile-pill">{orderStatusLabel(recentOrder.status)}</span>
                <span className="profile-ticket-meta">{formatRupee(orderTotal(recentOrder))}</span>
              </span>
              <span className="profile-ticket-title">
                {recentOrder.items[0]?.title ?? 'Order'}
                {recentOrder.items.length > 1 ? ` + ${recentOrder.items.length - 1} more` : ''}
              </span>
              <span className="profile-text-link">View order →</span>
            </button>
          ) : (
            <div className="profile-empty-block">
              <span className="profile-empty-icon"><Package size={24} /></span>
              <h3 className="profile-empty-title">No orders yet</h3>
              <p className="profile-empty">Your recent order will show up here.</p>
              <button type="button" className="profile-button is-primary" onClick={() => navigate('shop-home')}>Start shopping</button>
            </div>
          )}
        </section>

        <p className="profile-label">Account settings</p>
        <section className="profile-card">
          <ProfileListItem icon={<MapPin size={18} />} title="My addresses" onClick={() => navigate('address-list')} />
          <ProfileListItem icon={<Bell size={18} />} title="Notifications" value={unread > 0 ? String(unread) : undefined} onClick={() => navigate('notifications-list')} />
          <ProfileListItem icon={<Settings size={18} />} title="Settings & privacy" onClick={() => navigate('profile-settings')} />
          <ProfileListItem icon={<HelpCircle size={18} />} title="Help & support" onClick={() => navigate('profile-support')} />
        </section>
        </div>
      </div>
    </main>
  );
};
