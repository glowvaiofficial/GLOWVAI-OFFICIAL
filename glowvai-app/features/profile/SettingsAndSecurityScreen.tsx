import { useState } from 'react';
import { ChevronDown, ChevronRight, ChevronUp, Eye, MapPin, Sparkles, Trash2, User, ShieldCheck, UserRound } from 'lucide-react';
import { useApp } from '../../context/useApp';
import { createSupportTicket } from '../../core/services/shopApi';
import { getInitials, ProfileHeader, ProfileListItem } from './ProfileShared';

export const SettingsAndSecurityScreen = () => {
  const { user, customerDetails, skinReports, activeReport, navigate, goBack } = useApp();
  const [privacyExpanded, setPrivacyExpanded] = useState(true);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteState, setDeleteState] = useState<{ sending: boolean; error: string | null; ticketId: string | null }>({ sending: false, error: null, ticketId: null });
  const name = customerDetails?.fullName || user?.name || 'Add your details';
  const hasReport = Boolean(activeReport ?? skinReports[0]);

  // Deletion is done by the GlowVai team: this sends them a privacy request, it does not delete anything by itself.
  const requestDeletion = async () => {
    setDeleteState({ sending: true, error: null, ticketId: null });
    const res = await createSupportTicket({
      category: 'PRIVACY_REQUEST',
      subject: 'Request account deletion',
      description: `Please delete my GlowVai shop account and the data linked to it${customerDetails ? ` (name ${customerDetails.fullName}, mobile ${customerDetails.phoneNumber})` : ''}.`,
    });
    setDeleteState({ sending: false, error: res.ok ? null : res.error || 'The request could not be sent. Try again.', ticketId: res.ok ? res.data?.ticketId ?? null : null });
  };

  return (
    <main className="profile-screen">
      <ProfileHeader title="Settings & privacy" onBack={goBack} />

      <div className="profile-body">
        <div className="profile-side">
        <section className="profile-card">
          <button type="button" className="profile-user-button" onClick={() => navigate(customerDetails ? 'profile-edit' : 'customer-details', customerDetails ? undefined : { returnTo: 'profile-settings' })}>
            <span className="profile-hero-avatar">{getInitials(customerDetails?.fullName || user?.name)}</span>
            <span className="profile-user-copy">
              <span className="profile-user-name">{name}</span>
              <span className="profile-user-phone">
                {customerDetails ? `+91 ${customerDetails.phoneNumber} · not verified yet` : 'Save your name and mobile number'}
              </span>
            </span>
            <ChevronRight size={20} className="profile-chevron" />
          </button>
        </section>

        <p className="profile-label">Account settings</p>
        <section className="profile-card">
          {customerDetails ? (
            <ProfileListItem icon={<User size={18} />} title="Edit your details" note="Name, mobile number and email" onClick={() => navigate('profile-edit')} />
          ) : (
            <ProfileListItem icon={<UserRound size={18} />} title="Add your details" note="Needed to place an order" onClick={() => navigate('customer-details', { returnTo: 'profile-settings' })} />
          )}
          <ProfileListItem icon={<MapPin size={18} />} title="Saved addresses" onClick={() => navigate('address-list')} />
        </section>
        </div>

        <div className="profile-main">
        <p className="profile-label">Privacy</p>
        <section className="profile-card">
          <button type="button" className="profile-list-item" onClick={() => setPrivacyExpanded(!privacyExpanded)} aria-expanded={privacyExpanded}>
            <span className="profile-list-icon"><Eye size={18} /></span>
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
            icon={<Sparkles size={18} />}
            title="Skin scan history"
            note={hasReport ? 'Open your latest skin report' : 'No scans yet'}
            onClick={() => navigate(hasReport ? 'scan-report' : 'scan-intro')}
          />
          <ProfileListItem
            icon={<Trash2 size={16} />}
            title="Request account deletion"
            note="Sends a request to the GlowVai team"
            danger
            onClick={() => {
              setDeleteState({ sending: false, error: null, ticketId: null });
              setDeleteConfirmOpen(true);
            }}
          />
        </section>
        </div>
      </div>

      {deleteConfirmOpen && (
        <div className="profile-modal-backdrop">
          <div className="profile-modal" role="dialog" aria-modal="true" aria-labelledby="profile-delete-title">
            <h2 id="profile-delete-title">{deleteState.ticketId ? 'Request sent' : 'Request account deletion?'}</h2>
            {deleteState.ticketId ? (
              <p>
                Your request {deleteState.ticketId} is with the GlowVai team. They will process it and contact you. You can follow it in Help &amp; support under My requests.
              </p>
            ) : (
              <p>
                This sends a deletion request to the GlowVai team. Nothing is deleted straight away: the team checks the request, processes it and contacts you.
              </p>
            )}
            {deleteState.error && <p className="profile-field-error" role="alert">{deleteState.error}</p>}
            {deleteState.ticketId ? (
              <button type="button" className="profile-button is-primary is-block" onClick={() => setDeleteConfirmOpen(false)}>Done</button>
            ) : (
              <>
                <button type="button" className="profile-button is-outline is-block" onClick={() => setDeleteConfirmOpen(false)} disabled={deleteState.sending}>Cancel</button>
                <button type="button" className="profile-button is-danger is-block" onClick={() => void requestDeletion()} disabled={deleteState.sending}>
                  {deleteState.sending ? 'Sending…' : 'Send deletion request'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
};
