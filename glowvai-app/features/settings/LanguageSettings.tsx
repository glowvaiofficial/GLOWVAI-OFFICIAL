import { useState } from 'react';
import { LANGUAGE_CODES, type LanguageCode } from '@/lib/shop/settings/rules';
import { saveLanguage } from '../../core/services/shopApi';
import { useLanguageStore, useT } from '../../core/i18n/store';
import type { MessageKey } from '../../core/i18n/messages';
import { SettingsPage } from './SettingsParts';

const OPTION_LABEL: Record<LanguageCode, MessageKey> = {
  en: 'language.en',
  hi: 'language.hi',
  te: 'language.te',
};

// The shop language. The choice applies at once on this device, then is saved to the account.
export const LanguageSettings = ({ embedded = false }: { embedded?: boolean }) => {
  const t = useT();
  const language = useLanguageStore((s) => s.language);
  const setLanguage = useLanguageStore((s) => s.setLanguage);
  const [busy, setBusy] = useState(false);
  // The status keeps catalogue keys, not text, so it is translated in the language the page shows after the switch.
  // A server message is kept as plain text and rendered as text, never as HTML.
  const [status, setStatus] = useState<{ tone: 'ok' | 'error'; key: MessageKey; detail?: string } | null>(null);

  const choose = async (next: LanguageCode) => {
    if (next === language || busy) return;
    setLanguage(next);
    setBusy(true);
    setStatus(null);
    const res = await saveLanguage(next);
    setBusy(false);
    if (res.ok) setStatus({ tone: 'ok', key: 'language.saved' });
    else setStatus({ tone: 'error', key: 'language.deviceOnly', detail: res.error ?? undefined });
  };

  return (
    <SettingsPage title={t('language.title')} embedded={embedded}>
      <div className="settings-card settings-stack">
        <p className="settings-note">{t('language.note')}</p>
        <div role="radiogroup" aria-label={t('language.title')} className="settings-choice-group">
          {LANGUAGE_CODES.map((code) => (
            <button
              key={code}
              type="button"
              role="radio"
              aria-checked={language === code}
              className="settings-choice"
              onClick={() => void choose(code)}
              disabled={busy}
              lang={code}
            >
              <span className="settings-choice-dot" aria-hidden="true" />
              <span>{t(OPTION_LABEL[code])}</span>
            </button>
          ))}
        </div>
        {status && (
          <p className={`settings-status ${status.tone === 'ok' ? 'is-ok' : 'is-error'}`} role={status.tone === 'ok' ? 'status' : 'alert'}>
            {t(status.key)}{status.detail ? ` ${status.detail}` : ''}
          </p>
        )}
      </div>
    </SettingsPage>
  );
};
