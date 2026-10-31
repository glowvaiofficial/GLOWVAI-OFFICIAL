import { ChevronRight, CreditCard, Gift, Heart, HelpCircle, MapPin, Package, RotateCcw, Settings, Sparkles } from 'lucide-react';
import { useApp } from '../../context/useApp';
import { getInitials, ProfileHeader, ProfileListItem } from './ProfileShared';

const statusLabel = (status: string): string => {
  const text = status.replace(/_/g, ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
};

export const ProfileOverviewScreen = () => {
  const { user, customerDetails, orders, skinReports, activeReport, wishlist, navigate } = useApp();
  const name = customerDetails?.fullName || user?.name || 'Add your name';
  const phone = customerDetails?.phoneNumber || user?.phoneNumber || 'Contact details not added';
  const report = activeReport ?? skinReports[0] ?? null;
  const recentOrder = orders[0] ?? null;

  return (
    <main className="profile-screen">
      <ProfileHeader eyebrow="SMART SKIN · BEAUTY · FASTER" title="My Profile" />

      <div className="profile-body">
        <div className="profile-side">
        <section className="profile-card">
          <button type="button" className="profile-user-button" onClick={() => navigate('profile-settings')}>
            <span className="profile-hero-avatar">{getInitials(customerDetails?.fullName || user?.name)}</span>
            <span className="profile-user-copy">
              <span className="profile-user-name">{name}</span>
              <span className="profile-user-phone">{phone}</span>
            </span>
            <ChevronRight size={20} className="profile-chevron" />
          </button>
        </section>
        </div>

        <div className="profile-main">
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
            <span className="profile-tile-top"><Package size={20} /><ChevronRight size={16} /></span>
            <span className="profile-tile-label">My orders</span>
          </button>
          <button type="button" className="profile-tile" onClick={() => navigate('shop-wishlist')}>
            <span className="profile-tile-top"><Heart size={20} /><ChevronRight size={16} /></span>
            <span className="profile-tile-label">Wishlist</span>
            <span className="profile-tile-note">{wishlist.length} saved</span>
          </button>
          <button type="button" className="profile-tile is-blue" onClick={() => navigate('scan-report')}>
            <span className="profile-tile-top"><RotateCcw size={20} /><ChevronRight size={16} /></span>
            <span className="profile-tile-label">Saved routines</span>
          </button>
          <button type="button" className="profile-tile is-blue" onClick={() => navigate('profile-referrals')}>
            <span className="profile-tile-top"><Gift size={20} /><ChevronRight size={16} /></span>
            <span className="profile-tile-label">Glow rewards</span>
          </button>
        </div>

        <p className="profile-label">Recent order</p>
        <section className="profile-card">
          {recentOrder ? (
            <button type="button" className="profile-ticket-button" onClick={() => navigate('orders-list')}>
              <span className="profile-ticket-top">
                <span className="profile-pill">{statusLabel(recentOrder.status)}</span>
                <span className="profile-ticket-meta">₹{recentOrder.finalPayable.toLocaleString('en-IN')}</span>
              </span>
              <span className="profile-ticket-title">
                {recentOrder.items[0]?.productName ?? 'Order'}
                {recentOrder.items.length > 1 ? ` + ${recentOrder.items.length - 1} more` : ''}
              </span>
              <span className="profile-text-link">View order →</span>
            </button>
          ) : (
            <p className="profile-empty">No orders yet. Your recent order will show up here.</p>
          )}
        </section>
        </div>

        <div className="profile-side">
        <p className="profile-label">Account settings</p>
        <section className="profile-card">
          <ProfileListItem icon={<MapPin size={16} />} title="My addresses" onClick={() => navigate('address-list')} />
          <ProfileListItem icon={<CreditCard size={16} />} title="Payment methods" onClick={() => navigate('checkout-payment-method')} />
          <ProfileListItem icon={<Settings size={16} />} title="Settings & privacy" onClick={() => navigate('profile-settings')} />
          <ProfileListItem icon={<HelpCircle size={16} />} title="Help & support" onClick={() => navigate('profile-support')} />
        </section>
        </div>
      </div>
    </main>
  );
};
