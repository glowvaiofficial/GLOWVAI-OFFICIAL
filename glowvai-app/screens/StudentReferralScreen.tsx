import React from 'react';
import { StudentReferralScreen as StudentProgrammeScreen } from '../features/profile/StudentReferralScreen';
import '../features/profile/profile.css';
import '../responsive/profile-admin.css';

// The legacy 'student-referral' route shows the same student programme screen as 'profile-referral-code'.
// Sign-up and verification happen on the glowvai.in referral page; the shop has no verification backend.
export const StudentReferralScreen: React.FC = () => <StudentProgrammeScreen />;
