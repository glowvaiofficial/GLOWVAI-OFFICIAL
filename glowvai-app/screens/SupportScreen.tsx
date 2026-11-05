import React from 'react';
import { HelpAndSupportScreen } from '../features/profile/HelpAndSupportScreen';
import '../features/profile/profile.css';
import '../responsive/profile-admin.css';

// The legacy 'support' route shows the same help screen as 'profile-support'.
// Requests sent from it reach the GlowVai admin panel (Customer Support) through /api/shop/support.
export const SupportScreen: React.FC = () => <HelpAndSupportScreen />;
