import { Activity, ArrowRight, Package, ShieldCheck, Store, type LucideIcon } from 'lucide-react';
import { useApp } from '../../context/useApp';
import type { PortedScreenName } from '../../core/routes/names';
import { AdminShell } from './components/AdminShell';

const PORTAL_LINKS: Array<{
  screen: PortedScreenName;
  title: string;
  desc: string;
  icon: LucideIcon;
}> = [
  {
    screen: 'admin-claims',
    title: 'Dermatology claims',
    desc: 'Review photo evidence and medical notes for 14-day warranty refunds.',
    icon: ShieldCheck,
  },
  {
    screen: 'admin-darkstore',
    title: 'Darkstore operations',
    desc: 'Track the live pick queue, pick SLAs and rider dispatch for the Payikapuram hub.',
    icon: Package,
  },
  {
    screen: 'admin-vendor-portal',
    title: 'Vendor and dispatch hub',
    desc: 'Switch between the dark store operator view and the dispatch control tower.',
    icon: Activity,
  },
  {
    screen: 'vendor-home',
    title: 'Vendor home',
    desc: 'Store-side console for incoming orders, packing and daily settlement.',
    icon: Store,
  },
];

export const AdminPortalScreen = () => {
  const { navigate } = useApp();

  return (
    <AdminShell
      active="admin-portal"
      title="Admin portal"
      subtitle="Claims, darkstore operations and vendor tools for the Vijayawada network."
    >
      <div className="admin-hero">
        <div className="admin-hero-icon">
          <ShieldCheck size={22} />
        </div>
        <div>
          <p className="admin-hero-title">Choose a workspace</p>
          <p className="admin-hero-text">Each area opens in this console. Use the sidebar to move between them.</p>
        </div>
      </div>

      <div className="admin-hub-grid">
        {PORTAL_LINKS.map(({ screen, title, desc, icon: Icon }) => (
          <button key={screen} type="button" className="admin-hub-card" onClick={() => navigate(screen)}>
            <span className="admin-hub-icon">
              <Icon size={20} />
            </span>
            <h2 className="admin-hub-title">{title}</h2>
            <p className="admin-hub-desc">{desc}</p>
            <span className="admin-hub-link">
              Open <ArrowRight size={14} />
            </span>
          </button>
        ))}
      </div>
    </AdminShell>
  );
};
