import { ExternalLink, GraduationCap } from 'lucide-react';
import { useApp } from '../../context/useApp';
import { openExternal, ProfileHeader, STUDENT_PORTAL_URL } from './ProfileShared';

// The shop does not store a student verification status, so this screen does not claim verified, pending or
// rejected. Verification is handled on the earn portal, so it links there.
export const StudentStatusScreen = () => {
  const { goBack, navigate } = useApp();

  return (
    <main className="profile-screen is-narrow">
      <ProfileHeader title="Student status" eyebrow="Glow rewards" onBack={goBack} />

      <div className="profile-body">
        <section className="profile-card profile-card-body">
          <div className="profile-status-head">
            <span className="profile-status-icon"><GraduationCap size={20} /></span>
            <div>
              <h2 className="profile-card-title">Status not available here</h2>
              <p className="profile-card-sub">
                The web shop does not store your student verification status, so this page cannot confirm whether you are verified.
              </p>
            </div>
          </div>
        </section>

        <section className="profile-card profile-card-body">
          <h2 className="profile-card-title">Check or start verification</h2>
          <p className="profile-card-sub">
            Student verification is handled on the glowvai earn portal. Open the portal to check your status or apply.
          </p>
          <button type="button" className="profile-button is-primary is-block" onClick={() => openExternal(STUDENT_PORTAL_URL)}>
            Open earn portal
            <ExternalLink size={16} />
          </button>
        </section>

        <button type="button" className="profile-button is-outline is-block" onClick={() => navigate('profile-referrals')}>
          Back to Glow rewards
        </button>
      </div>
    </main>
  );
};
