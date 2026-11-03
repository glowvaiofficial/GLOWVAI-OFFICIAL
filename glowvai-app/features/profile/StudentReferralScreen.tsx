import { ChevronRight, ExternalLink, GraduationCap, HelpCircle, Info } from 'lucide-react';
import { useApp } from '../../context/useApp';
import { ProfileHeader } from './ProfileShared';

// Student sign-up happens on the glowvai.in referral page, which collects the details and the student ID itself.
// The shop has no verification backend, so this screen explains the real route instead of collecting anything.
const REFERRAL_PAGE_URL = '/referral';

const STEPS = [
  'Open the GlowVai referral page and choose the campus ambassador sign-up.',
  'Enter your details and college name, add a UPI ID for payouts and upload your student ID card.',
  'The GlowVai team reviews your application. The programme terms are listed on that page.',
];

export const StudentReferralScreen = () => {
  const { goBack, navigate } = useApp();

  return (
    <main className="profile-screen">
      <ProfileHeader title="Student programme" eyebrow="Campus ambassadors" onBack={goBack} />

      <div className="profile-body">
        <div className="profile-side">
        <section className="profile-card profile-card-body">
          <span className="profile-feature-icon"><GraduationCap size={22} /></span>
          <h2 className="profile-card-title">Student verification is not in the shop yet</h2>
          <p className="profile-card-sub">
            Students join through the GlowVai referral page. Nothing is verified or saved from this screen, and your shop account is not linked to the programme yet.
          </p>
          <section className="profile-notice">
            <Info size={18} />
            <span>Student discounts and referral rewards in the shop are not available yet.</span>
          </section>
        </section>
        </div>

        <div className="profile-main">
        <p className="profile-label">How to join</p>
        <section className="profile-card profile-card-body">
          <ol className="profile-steps">
            {STEPS.map((step, index) => (
              <li key={step} className="profile-step">
                <span className="profile-step-number">{index + 1}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
          <a className="profile-button is-primary is-block" href={REFERRAL_PAGE_URL} target="_blank" rel="noopener noreferrer">
            Open the referral page
            <ExternalLink size={16} />
          </a>
        </section>

        <section className="profile-card">
          <button type="button" className="profile-list-item" onClick={() => navigate('profile-support')}>
            <span className="profile-list-icon"><HelpCircle size={18} /></span>
            <span className="profile-list-copy">
              <span className="profile-list-title">Questions about your application?</span>
              <span className="profile-list-note">Contact GlowVai support</span>
            </span>
            <ChevronRight size={18} className="profile-chevron" />
          </button>
        </section>
        </div>
      </div>
    </main>
  );
};
