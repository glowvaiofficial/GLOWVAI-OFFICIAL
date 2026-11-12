import type { ReactNode } from 'react';
import { useId } from 'react';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import type { LanguageCode } from '@/lib/shop/settings/rules';
import { useLanguageStore, useT } from '../../core/i18n/store';
import type { MessageKey } from '../../core/i18n/messages';
import './settings.css';

const DATE_LOCALE: Record<LanguageCode, string> = { en: 'en-IN', hi: 'hi-IN', te: 'te-IN' };

// A date for the customer, in India time and in the shop's language. Returns "" for a missing value.
export const useDateLabel = () => {
  const language = useLanguageStore((s) => s.language);
  return (ms: number | null | undefined): string =>
    typeof ms === 'number' && Number.isFinite(ms) && ms > 0
      ? new Date(ms).toLocaleDateString(DATE_LOCALE[language], { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })
      : '';
};

interface SettingsPageProps {
  title: string;
  subtitle?: string;
  // Desktop panel: no header and no back button, the hub already shows where the customer is.
  embedded?: boolean;
  onBack?: () => void;
  children: ReactNode;
}

// The frame for every settings screen. Full page on phones; a panel next to the section list on large screens.
export const SettingsPage = ({ title, subtitle, embedded = false, onBack, children }: SettingsPageProps) => {
  const t = useT();
  if (embedded) {
    return (
      <section className="settings-panel" aria-labelledby="settings-panel-title">
        <h2 className="settings-panel-title" id="settings-panel-title">{title}</h2>
        {children}
      </section>
    );
  }
  return (
    <div className="settings-page">
      <header className="settings-header">
        {onBack && (
          <button type="button" className="settings-back" onClick={onBack} aria-label={t('common.back')}>
            <ArrowLeft size={20} strokeWidth={2.2} aria-hidden="true" />
          </button>
        )}
        <div className="settings-header-copy">
          <h1 className="settings-title">{title}</h1>
          {subtitle && <p className="settings-subtitle">{subtitle}</p>}
        </div>
      </header>
      {children}
    </div>
  );
};

interface SettingsRowProps {
  icon: ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  current?: boolean;
  danger?: boolean;
}

// One row in the section list. The whole row is the button, at least 44px tall, with a chevron.
export const SettingsRow = ({ icon, title, description, onClick, current = false, danger = false }: SettingsRowProps) => (
  <button
    type="button"
    className={`settings-row${current ? ' is-current' : ''}${danger ? ' is-danger' : ''}`}
    onClick={onClick}
    aria-current={current ? 'true' : undefined}
  >
    <span className="settings-row-icon" aria-hidden="true">{icon}</span>
    <span className="settings-row-copy">
      <span className="settings-row-title">{title}</span>
      <span className="settings-row-desc">{description}</span>
    </span>
    <ChevronRight size={20} className="settings-row-chevron" aria-hidden="true" />
  </button>
);

interface SwitchProps {
  label: string;
  help?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
  footnote?: string;
}

// An on/off switch with its label and help text linked for screen readers.
export const SettingsSwitch = ({ label, help, checked, disabled = false, onChange, footnote }: SwitchProps) => {
  const labelId = useId();
  const helpId = useId();
  return (
    <div className="settings-switch">
      <div className="settings-switch-copy">
        <span className="settings-switch-label" id={labelId}>{label}</span>
        {help && <span className="settings-switch-help" id={helpId}>{help}</span>}
        {footnote && <span className="settings-switch-help" role="note">{footnote}</span>}
      </div>
      <button
        type="button"
        role="switch"
        className="settings-switch-control"
        aria-checked={checked}
        aria-labelledby={labelId}
        aria-describedby={help ? helpId : undefined}
        disabled={disabled}
        onClick={() => onChange(!checked)}
      >
        <span className="settings-switch-knob" aria-hidden="true" />
      </button>
    </div>
  );
};

// A "Coming soon" page for a section another team fills in. Same frame on phones and in the desktop panel.
export const PlaceholderBody = ({ titleKey, embedded = false, onBack }: { titleKey: MessageKey; embedded?: boolean; onBack?: () => void }) => {
  const t = useT();
  return (
    <SettingsPage title={t(titleKey)} embedded={embedded} onBack={onBack}>
      <p className="settings-empty">{t('common.comingSoonBody')}</p>
    </SettingsPage>
  );
};
