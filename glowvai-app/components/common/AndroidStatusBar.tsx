import React from 'react';

interface AndroidStatusBarProps { tone?: 'light' | 'brand'; }

// The shop used to draw a mock Android status bar (clock, signal, Wi-Fi, battery) above every phone screen.
// On a real phone the browser and the OS already show the real one, so the mock is no longer drawn.
// The component stays so the app shell keeps the same structure.
export const AndroidStatusBar: React.FC<AndroidStatusBarProps> = () => null;
