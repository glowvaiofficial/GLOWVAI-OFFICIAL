import React from 'react';
import { StudentReferralScreen as StudentProgrammeScreen } from '../features/profile/StudentReferralScreen';

// The legacy 'student-referral' route shows the redesigned student programme page. Verification is handled on the
// earn portal, so no student status or referral code is invented here.
export const StudentReferralScreen: React.FC = () => <StudentProgrammeScreen />;
