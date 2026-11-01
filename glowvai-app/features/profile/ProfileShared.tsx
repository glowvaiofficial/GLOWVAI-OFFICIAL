import type { ReactNode } from 'react';
import { ArrowLeft, ChevronRight } from 'lucide-react';

export const getInitials = (name?: string | null): string => {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'G';
  return parts.slice(0, 2).map((part) => part[0].toUpperCase()).join('');
};

// The campus / earn programme runs on its own portal; student verification is handled there, not in the shop.
export const STUDENT_PORTAL_URL = 'https://earn.glowvai.in';
// Public shop address that friends can open. Personal invite links are not connected to the shop yet.
export const SHOP_SHARE_URL = 'https://glowvai.in/shop';

export const openExternal =(url: string): void => {
  window.open(url, '_blank', 'noopener,noreferrer');
};

export const copyText = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};

interface ProfileHeaderProps {
  title: string;
  eyebrow?: string;
  onBack?: () => void;
  right?: ReactNode;
}

// The title sits flush left; there is no spacer, so screens without a back button line up with the page edge.
export const ProfileHeader = ({ title, eyebrow, onBack, right }: ProfileHeaderProps) => (
  <header className="profile-header">
    {onBack && (
      <button type="button" className="profile-icon-button" onClick={onBack} aria-label="Go back">
        <ArrowLeft size={20} strokeWidth={2.2} />
      </button>
    )}
    <div className="profile-header-copy">
      {eyebrow && <span className="profile-eyebrow">{eyebrow}</span>}
      <h1 className="profile-title">{title}</h1>
    </div>
    {right}
  </header>
);

interface ProfileListItemProps {
  icon: ReactNode;
  title: string;
  note?: string;
  value?: string;
  danger?: boolean;
  onClick: () => void;
}

export const ProfileListItem = ({ icon, title, note, value, danger = false, onClick }: ProfileListItemProps) => (
  <button type="button" className="profile-list-item" onClick={onClick}>
    <span className={danger ? 'profile-list-icon is-danger' : 'profile-list-icon'}>{icon}</span>
    <span className="profile-list-copy">
      <span className={danger ? 'profile-list-title is-danger' : 'profile-list-title'}>{title}</span>
      {note && <span className="profile-list-note">{note}</span>}
    </span>
    {value && <span className="profile-list-value">{value}</span>}
    <ChevronRight size={18} className="profile-chevron" />
  </button>
);
