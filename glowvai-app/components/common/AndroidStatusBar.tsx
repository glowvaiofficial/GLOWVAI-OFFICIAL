import React, { useState, useEffect } from 'react';
import { Wifi, BatteryMedium, Signal } from 'lucide-react';

interface AndroidStatusBarProps { tone?: 'light' | 'brand'; }

export const AndroidStatusBar: React.FC<AndroidStatusBarProps> = ({ tone = 'light' }) => {
  const [time, setTime] = useState<string>('09:41');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }));
    };
    updateTime();
    const timer = setInterval(updateTime, 30000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div
      className="android-status-bar"
      style={{
        height: '28px',
        padding: '0 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '12px',
        fontWeight: 600,
        color: tone === 'brand' ? '#FFFFFF' : '#161A22',
        backgroundColor: tone === 'brand' ? '#0F5CF6' : '#FFFFFF',
        userSelect: 'none',
        zIndex: 100,
      }}
    >
      <span>{time}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <Signal size={13} strokeWidth={2.5} />
        <Wifi size={13} strokeWidth={2.5} />
        <BatteryMedium size={15} strokeWidth={2.5} />
      </div>
    </div>
  );
};
