import React from 'react';
import { ProfileOverviewScreen } from '../features/profile/ProfileOverviewScreen';

// The legacy 'profile' route shows the redesigned profile tab so every path renders the same account page.
export const ProfileScreen: React.FC = () => <ProfileOverviewScreen />;
