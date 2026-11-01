import React from 'react';
import { ExternalLink, GraduationCap, Info } from 'lucide-react';
import { useApp } from '../../context/useApp';
import { STUDENT_PORTAL_URL } from '../profile/ProfileShared';
import { AuthShell } from './components/AuthShell';

// The shop has no student verification backend: the old form accepted an ID upload, sent nothing and then
// opened the referral hub as if it had been submitted. Verification happens on the earn portal, so this
// screen sends students there.
const PORTAL_LABEL = STUDENT_PORTAL_URL.replace(/^https:\/\//, '');

export const StudentVerificationScreen: React.FC = () => {
  const { navigate, goBack } = useApp();

  return (
    <AuthShell
      onBack={goBack}
      footer={
        <>
          <a className="auth-primary-button" href={STUDENT_PORTAL_URL} target="_blank" rel="noopener noreferrer">
            Verify on {PORTAL_LABEL} <ExternalLink aria-hidden="true" />
          </a>
          <button type="button" className="auth-secondary-button" onClick={() => navigate('profile-support')}>
            Contact support
          </button>
        </>
      }
    >
      <div className="auth-hero-icon" aria-hidden="true">
        <GraduationCap />
      </div>

      <h1 className="auth-title auth-center">Student verification</h1>
      <p className="auth-subtitle auth-center">
        Students sign up and verify on the glowvai earn portal. Follow the steps there; it opens in a new tab.
      </p>

      <div className="auth-info-banner">
        <Info aria-hidden="true" />
        <div>
          <strong>Your status isn&apos;t shown in the shop yet</strong>
          <p>After you verify on the portal, the shop can&apos;t confirm it here. Contact support if you need help.</p>
        </div>
      </div>
    </AuthShell>
  );
};

export default StudentVerificationScreen;
