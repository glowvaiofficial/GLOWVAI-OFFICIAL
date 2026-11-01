import type { ReactNode } from 'react';
import { Activity, LayoutDashboard, LogOut, Package, ShieldCheck, Store, X, type LucideIcon } from 'lucide-react';
import { useApp } from '../../../context/useApp';
import type { PortedScreenName } from '../../../core/routes/names';
import '../admin.css';

const NAV_ITEMS: Array<{ screen: PortedScreenName; label: string; icon: LucideIcon }> = [
  { screen: 'admin-portal', label: 'Portal', icon: LayoutDashboard },
  { screen: 'admin-claims', label: 'Claims', icon: ShieldCheck },
  { screen: 'admin-darkstore', label: 'Darkstore Ops', icon: Package },
  { screen: 'admin-vendor-portal', label: 'Vendor Hub', icon: Activity },
  { screen: 'vendor-home', label: 'Vendor Home', icon: Store },
];

interface AdminShellProps {
  active: PortedScreenName;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}

export const AdminShell = ({ active, title, subtitle, actions, children }: AdminShellProps) => {
  const { navigate } = useApp();

  return (
    <div className="admin-root">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <div className="admin-brand-mark">G</div>
          <div>
            <span className="admin-brand-name">GlowVAI Admin</span>
            <span className="admin-brand-sub">Operations console</span>
          </div>
        </div>

        <nav className="admin-nav" aria-label="Admin sections">
          {NAV_ITEMS.map(({ screen, label, icon: Icon }) => (
            <button
              key={screen}
              type="button"
              className={`admin-nav-item${screen === active ? ' is-active' : ''}`}
              aria-current={screen === active ? 'page' : undefined}
              onClick={() => navigate(screen)}
            >
              <Icon size={18} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="admin-sidebar-footer">
          <button type="button" className="admin-btn admin-btn--ghost" onClick={() => navigate('home')}>
            <LogOut size={16} />
            Back to store
          </button>
        </div>
      </aside>

      <div className="admin-main">
        <header className="admin-page-header">
          <div>
            <p className="admin-eyebrow">GlowVAI Admin</p>
            <h1 className="admin-page-title">{title}</h1>
            {subtitle && <p className="admin-page-subtitle">{subtitle}</p>}
          </div>
          {actions && <div className="admin-page-actions">{actions}</div>}
        </header>
        <main className="admin-content">{children}</main>
      </div>
    </div>
  );
};

type ChipTone = 'info' | 'success' | 'warning' | 'danger' | 'neutral';

export const AdminChip = ({ tone = 'neutral', children }: { tone?: ChipTone; children: ReactNode }) => (
  <span className={`admin-chip admin-chip--${tone}`}>{children}</span>
);

export const AdminNotice = ({
  title,
  text,
  tone = 'info',
  onClose,
}: {
  title: string;
  text: string;
  tone?: 'info' | 'success' | 'warning';
  onClose: () => void;
}) => (
  <div className={`admin-notice${tone === 'info' ? '' : ` admin-notice--${tone}`}`} role="status">
    <div>
      <span className="admin-notice-title">{title}</span>
      <span className="admin-notice-text">{text}</span>
    </div>
    <button type="button" className="admin-notice-close" onClick={onClose} aria-label="Dismiss">
      <X size={16} />
    </button>
  </div>
);

export const AdminEmpty = ({ title, text, icon }: { title: string; text?: string; icon?: ReactNode }) => (
  <div className="admin-empty">
    {icon && <div className="admin-empty-icon">{icon}</div>}
    <p className="admin-empty-title">{title}</p>
    {text && <span>{text}</span>}
  </div>
);
