import { useState } from 'react';
import { ChevronDown, ChevronUp, Eye, LogIn, LogOut, MapPin, ShieldCheck, Smartphone, Sparkles, Trash2, User } from 'lucide-react';
import { useApp } from '../../context/useApp';
import { getInitials, ProfileHeader, ProfileListItem } from './ProfileShared';

// Biometric login, app lock, notifications, language and appearance are mobile-app settings with no effect in the
// web shop, so they are not shown here. Only settings that do something on the web are listed.
export const SettingsAndSecurityScreen = () => {
  const { user, customerDetails, logout, deleteAccount, navigate, goBack } = useApp();
  const [privacyExpanded, setPrivacyExpanded] = useState(true);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const savedName = customerDetails?.fullName || user?.name || '';
  const phone = customerDetails?.phoneNumber || user?.phoneNumber || '';

  return (
    <main className="profile-screen">
      <ProfileHeader title="Settings & privacy" onBack={goBack} />

      <div className="profile-body is-settings">
        <div className="profile-side">
          <section className="profile-card">
            <button type="button" className="profile-user-button" onClick={() => navigate('profile-edit')}>
              <span className="profile-hero-avatar">{getInitials(savedName)}</span>
              <span className="profile-user-copy">
                <span className="profile-user-name">{savedName || 'Add your name'}</span>
                {user ? (
                  <span className="profile-pill is-success"><ShieldCheck size={12} />Signed in{user.phoneNumber ? ` · ${user.phoneNumber}` : ''}</span>
                ) : (
                  <span className="profile-user-phone">{phone || 'Not signed in'}</span>
                )}
              </span>
              <span className="profile-user-action">Edit</span>
            </button>
          </section>

          <p className="profile-label">Account</p>
          <section className="profile-card">
            <ProfileListItem icon={<User size={16} />} title="Edit profile" note="Name, email and skin profile" onClick={() => navigate('profile-edit')} />
            <ProfileListItem icon={<MapPin size={16} />} title="Saved addresses" note="Delivery addresses for checkout" onClick={() => navigate('address-list')} />
            <ProfileListItem icon={<Smartphone size={16} />} title="Change phone number" note="Our support team handles number changes" onClick={() => navigate('auth-change-phone')} />
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
                <span>Your face is used only to check the scan position and create cosmetic insights. Identity recognition is not used.</span>
              </p>
            )}
            <ProfileListItem icon={<Sparkles size={16} />} title="Skin scan report" note="Your latest scan results" onClick={() => navigate('scan-report')} />
            <ProfileListItem icon={<Trash2 size={16} />} title="Delete account data" note="Removes scan history, addresses and profile data" danger onClick={() => setDeleteConfirmOpen(true)} />
          </section>

          {user ? (
            <button type="button" className="profile-button is-outline is-block" onClick={logout}>
              <LogOut size={18} />
              Sign out
            </button>
          ) : (
            <button type="button" className="profile-button is-outline is-block" onClick={() => navigate('auth-login')}>
              <LogIn size={18} />
              Sign in
            </button>
          )}
        </div>
      </div>

      {deleteConfirmOpen && (
        <div
          className="profile-modal-backdrop"
          onKeyDown={(e) => { if (e.key === 'Escape') setDeleteConfirmOpen(false); }}
        >
          <div className="profile-modal" role="alertdialog" aria-modal="true" aria-labelledby="profile-delete-title" aria-describedby="profile-delete-desc">
            <span className="profile-modal-icon"><Trash2 size={20} /></span>
            <h2 id="profile-delete-title">Delete account data?</h2>
            <p id="profile-delete-desc">This removes your skin scan history, saved addresses and profile details from this device. It cannot be undone.</p>
            <div className="profile-modal-actions">
              <button type="button" className="profile-button is-outline" onClick={() => setDeleteConfirmOpen(false)} autoFocus>Cancel</button>
              <button
                type="button"
                className="profile-button is-danger"
                onClick={() => {
                  setDeleteConfirmOpen(false);
                  deleteAccount();
                }}
              >
                Delete data
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};
