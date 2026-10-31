import { GraduationCap } from 'lucide-react';
import { useApp } from '../../context/useApp';
import { ProfileHeader } from './ProfileShared';
import './referral-extra.css';

// The shop does not expose a student verification status on the user, so this screen does not claim
// verified, pending or rejected. It points to the existing verification flow instead.
export const StudentStatusScreen = () => {
  const { goBack, navigate } = useApp();

  return (
    <main className="profile-screen">
      <div className="referral-column">
        <ProfileHeader title="Student verification" eyebrow="Student status" onBack={goBack} />

        <div className="referral-body">
          <section className="profile-card profile-card-body">
            <div className="referral-status-head">
              <span className="referral-status-icon"><GraduationCap size={20} /></span>
              <div>
                <p className="profile-card-title">Status not shown here</p>
                <p className="profile-card-sub">
                  This app does not show your student verification status yet, so this page cannot confirm whether you are verified.
                </p>
              </div>
            </div>
          </section>

          <section className="profile-card profile-card-body">
            <p className="profile-card-title">Verify your student status</p>
            <p className="profile-card-sub">
              Submit your college email and college name in the student verification flow.
            </p>
            <button type="button" className="profile-button is-primary is-block" onClick={() => navigate('auth-student-verify')}>
              Verify student status →
            </button>
          </section>

          <button type="button" className="profile-button is-outline is-block" onClick={() => navigate('profile-referrals')}>
            Back to referral hub
          </button>
        </div>
      </div>
    </main>
  );
};
