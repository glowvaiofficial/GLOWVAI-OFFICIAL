import { ChevronRight, Gift, Heart, HelpCircle, ListChecks, MapPin, Package, Settings, Sparkles } from 'lucide-react';
import { useApp } from '../../context/useApp';
import { getInitials, ProfileHeader, ProfileListItem } from './ProfileShared';

const statusLabel = (status: string): string => {
  const text = status.replace(/_/g, ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
};

const countLabel = (count: number, one: string, many: string, none: string): string =>
  count === 0 ? none : `${count} ${count === 1 ? one : many}`;

export const ProfileOverviewScreen = () => {
  const { user, customerDetails, orders, skinReports, activeReport, wishlist, navigate } = useApp();
  const savedName = customerDetails?.fullName || user?.name || '';
  const phone = customerDetails?.phoneNumber || user?.phoneNumber || '';
  const report = activeReport ?? skinReports[0] ?? null;
  const recentOrder = orders[0] ?? null;

  return (
    <main className="profile-screen">
      <ProfileHeader title="My profile" />

      <div className="profile-body is-overview">
        <div className="profile-side">
          <section className="profile-card">
            <button type="button" className="profile-user-button" onClick={() => navigate('profile-edit')}>
              <span className="profile-hero-avatar">{getInitials(savedName)}</span>
              <span className="profile-user-copy">
                <span className="profile-user-name">{savedName || 'Add your name'}</span>
                <span className="profile-user-phone">{phone || 'Add your contact details'}</span>
              </span>
              <span className="profile-user-action">{savedName ? 'Edit' : 'Add'}</span>
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
              {report ? 'View skin report' : 'Start skin scan'}
              <ChevronRight size={16} />
            </button>
          </section>

          <p className="profile-label">My account hub</p>
          <div className="profile-tiles">
            <button type="button" className="profile-tile" onClick={() => navigate('orders-list')}>
              <span className="profile-tile-icon"><Package size={18} /></span>
              <span className="profile-tile-copy">
                <span className="profile-tile-label">My orders</span>
                <span className="profile-tile-note">{countLabel(orders.length, 'order', 'orders', 'No orders yet')}</span>
              </span>
              <ChevronRight size={16} className="profile-chevron" />
            </button>
            <button type="button" className="profile-tile" onClick={() => navigate('shop-wishlist')}>
              <span className="profile-tile-icon"><Heart size={18} /></span>
              <span className="profile-tile-copy">
                <span className="profile-tile-label">Wishlist</span>
                <span className="profile-tile-note">{countLabel(wishlist.length, 'item saved', 'items saved', 'Nothing saved yet')}</span>
              </span>
              <ChevronRight size={16} className="profile-chevron" />
            </button>
            <button type="button" className="profile-tile" onClick={() => navigate('recommend-routine')}>
              <span className="profile-tile-icon"><ListChecks size={18} /></span>
              <span className="profile-tile-copy">
                <span className="profile-tile-label">Routine guide</span>
                <span className="profile-tile-note">Morning and evening steps</span>
              </span>
              <ChevronRight size={16} className="profile-chevron" />
            </button>
            <button type="button" className="profile-tile" onClick={() => navigate('profile-referrals')}>
              <span className="profile-tile-icon"><Gift size={18} /></span>
              <span className="profile-tile-copy">
                <span className="profile-tile-label">Glow rewards</span>
                <span className="profile-tile-note">Invite friends</span>
              </span>
              <ChevronRight size={16} className="profile-chevron" />
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
                <span className="profile-text-link">View order <ChevronRight size={16} /></span>
              </button>
            ) : (
              <div className="profile-empty-row">
                <span className="profile-list-icon is-muted"><Package size={16} /></span>
                <span className="profile-list-copy">
                  <span className="profile-list-title">No orders yet</span>
                  <span className="profile-list-note">Your most recent order will show up here.</span>
                </span>
                <button type="button" className="profile-button is-secondary is-small" onClick={() => navigate('shop-home')}>
                  Start shopping
                </button>
              </div>
            )}
          </section>
        </div>

        <div className="profile-side">
          <p className="profile-label">Account settings</p>
          <section className="profile-card">
            <ProfileListItem icon={<MapPin size={16} />} title="My addresses" onClick={() => navigate('address-list')} />
            <ProfileListItem icon={<Settings size={16} />} title="Settings & privacy" onClick={() => navigate('profile-settings')} />
            <ProfileListItem icon={<HelpCircle size={16} />} title="Help & support" onClick={() => navigate('profile-support')} />
          </section>
        </div>
      </div>
    </main>
  );
};
