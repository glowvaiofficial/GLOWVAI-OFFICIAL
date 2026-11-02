import { useState } from 'react';
import { ChevronDown, ChevronRight, ChevronUp, CreditCard, Eye, LogIn, LogOut, MapPin, Smartphone, Sparkles, Trash2, User, ShieldCheck } from 'lucide-react';
import { useApp } from '../../context/useApp';
import { getInitials, ProfileHeader, ProfileListItem } from './ProfileShared';

export const SettingsAndSecurityScreen = () => {
  const { user, customerDetails, skinReports, activeReport, logout, deleteAccount, navigate, goBack } = useApp();
  const [privacyExpanded, setPrivacyExpanded] = useState(true);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const name = customerDetails?.fullName || user?.name || 'Add your name';
  const hasReport = Boolean(activeReport ?? skinReports[0]);

  return (
    <main className="profile-screen">
      <ProfileHeader title="Settings & privacy" onBack={goBack} />

      <div className="profile-body">
        <div className="profile-side">
        <section className="profile-card">
          <button type="button" className="profile-user-button" onClick={() => navigate('profile-edit')}>
            <span className="profile-hero-avatar">{getInitials(customerDetails?.fullName || user?.name)}</span>
            <span className="profile-user-copy">
              <span className="profile-user-name">{name}</span>
              {user?.phoneNumber ? (
                <span className="profile-pill is-success"><ShieldCheck size={12} />Phone verified</span>
              ) : (
                <span className="profile-user-phone">Not signed in</span>
              )}
            </span>
            <ChevronRight size={20} className="profile-chevron" />
          </button>
        </section>

        <p className="profile-label">Account settings</p>
        <section className="profile-card">
          <ProfileListItem icon={<User size={16} />} title="Edit profile" onClick={() => navigate('profile-edit')} />
          <ProfileListItem icon={<MapPin size={16} />} title="Saved addresses" onClick={() => navigate('address-list')} />
          <ProfileListItem icon={<CreditCard size={16} />} title="Payment methods" onClick={() => navigate('checkout-payment-method')} />
          <ProfileListItem icon={<Smartphone size={16} />} title="Change phone number" note="A verification code is sent to the new number" onClick={() => navigate('auth-change-phone')} />
        </section>
        </div>

        <div className="profile-main">
        <p className="profile-label">Privacy</p>
        <section className="profile-card">
          <button type="button" className="profile-list-item" onClick={() => setPrivacyExpanded(!privacyExpanded)} aria-expanded={privacyExpanded}>
            <span className="profile-list-icon"><Eye size={16} /></span>
            <span className="profile-list-copy"><span className="profile-list-title">AI scan privacy</span></span>
            {privacyExpanded ? <ChevronUp size={18} className="profile-chevron" /> : <ChevronDown size={18} className="profile-chevron" />}
          </button>
          {privacyExpanded && (
            <p className="profile-privacy-note">
              <ShieldCheck size={16} />
              Your face is used only to validate scan position and create cosmetic insights. Identity recognition is not used.
            </p>
          )}
          <ProfileListItem
            icon={<Sparkles size={16} />}
            title="Skin scan history"
            note={hasReport ? 'Open your latest skin report' : 'No scans yet'}
            onClick={() => navigate(hasReport ? 'scan-report' : 'scan-intro')}
          />
          <ProfileListItem icon={<Trash2 size={16} />} title="Delete account data" note="Removes scan reports, orders, cart and saved details" danger onClick={() => setDeleteConfirmOpen(true)} />
        </section>

        {user ? (
          <button type="button" className="profile-button is-outline is-block" onClick={logout}>
            <LogOut size={18} />
            Sign out
          </button>
        ) : (
          <button type="button" className="profile-button is-primary is-block" onClick={() => navigate('login')}>
            <LogIn size={18} />
            Sign in
          </button>
        )}
        </div>
      </div>

      {deleteConfirmOpen && (
        <div className="profile-modal-backdrop">
          <div className="profile-modal" role="dialog" aria-modal="true" aria-labelledby="profile-delete-title">
            <h2 id="profile-delete-title">Delete account data?</h2>
            <p>This signs you out and removes your skin scan reports, orders, cart and saved contact details from this shop. It cannot be undone.</p>
            <button type="button" className="profile-button is-outline is-block" onClick={() => setDeleteConfirmOpen(false)}>Cancel</button>
            <button
              type="button"
              className="profile-button is-danger is-block"
              onClick={() => {
                setDeleteConfirmOpen(false);
                deleteAccount();
              }}
            >
              Delete my data
            </button>
          </div>
        </div>
      )}
    </main>
  );
};
