import React from 'react';
import { HelpAndSupportScreen } from '../features/profile/HelpAndSupportScreen';
import '../features/profile/profile.css';
import '../responsive/profile-admin.css';

// The legacy 'support' route shows the same help screen as 'profile-support'.
// Support has no ticket backend, so customers reach the team on WhatsApp or email instead of an on-device ticket list.
export const SupportScreen: React.FC = () => <HelpAndSupportScreen />;
