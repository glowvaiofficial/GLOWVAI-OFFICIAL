import React from 'react';
import { Building2, ExternalLink, GraduationCap, IdCard, Info, Mail } from 'lucide-react';
import { useApp } from '../../context/useApp';
import { safeHapticImpact } from '../../core/utils/haptics';
import { AuthShell } from './components/AuthShell';

const STUDENT_PORTAL_URL = 'https://earn.glowvai.in';

const REQUIREMENTS = [
  { id: 'email', icon: <Mail />, title: 'College or university email', body: 'The address your college gave you.' },
  { id: 'college', icon: <Building2 />, title: 'College name', body: 'As it appears on your ID card.' },
  { id: 'id', icon: <IdCard />, title: 'Photo of your college ID', body: 'JPG, PNG or PDF.' },
];

// Student IDs are not checked inside the shop yet. The student portal handles applications.
export const StudentVerificationScreen: React.FC = () => {
  const { goBack } = useApp();

  const handleOpenPortal = () => {
    safeHapticImpact();
    window.open(STUDENT_PORTAL_URL, '_blank', 'noopener,noreferrer');
  };

  return (
    <AuthShell
      onBack={goBack}
      footer={
        <button type="button" className="auth-primary-button" onClick={handleOpenPortal}>
          Open the student portal
          <ExternalLink aria-hidden="true" />
        </button>
      }
    >
      <div className="auth-hero-icon" aria-hidden="true">
        <GraduationCap />
      </div>

      <h1 className="auth-title auth-center">Student verification</h1>
      <p className="auth-subtitle auth-center">Apply for the GlowVAI student programme on our student portal.</p>

      <div className="auth-info-banner">
        <Info aria-hidden="true" />
        <div>
          <strong>Verification in the shop is not available yet</strong>
          <p>The shop cannot check student IDs yet. Apply on the portal with the details below.</p>
        </div>
      </div>

      <span className="auth-section-label">What you will need</span>
      <div className="auth-card auth-card-list">
        {REQUIREMENTS.map((item) => (
          <div className="auth-permission-row" key={item.id}>
            <span className="auth-permission-icon" aria-hidden="true">{item.icon}</span>
            <div className="auth-permission-text">
              <strong>{item.title}</strong>
              <p>{item.body}</p>
            </div>
          </div>
        ))}
      </div>
    </AuthShell>
  );
};

export default StudentVerificationScreen;
