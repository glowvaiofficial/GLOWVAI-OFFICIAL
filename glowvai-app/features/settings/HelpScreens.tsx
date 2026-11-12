import { HelpCircle, Headphones, Lock, FileText } from 'lucide-react';
import { siteConfig } from '@/config/site';
import { useApp } from '../../context/useApp';
import { useT } from '../../core/i18n/store';
import { faqItems, LEGAL_DRAFT_BANNER, privacyPage, termsPage, type LegalFacts, type LegalPage } from './legalContent';
import { SettingsPage, SettingsRow } from './SettingsParts';

// Business facts from configuration only. Anything not set is shown as "Not set" by the legal content.
export const legalFacts = (): LegalFacts => ({
  legalName: siteConfig.legalName || null,
  address: siteConfig.address || null,
  supportEmail: siteConfig.supportEmail || null,
  supportPhone: siteConfig.phone || null,
  supportHours: (process.env.NEXT_PUBLIC_SUPPORT_HOURS ?? '').trim() || null,
  manufacturerName: siteConfig.compliance.manufacturerName || null,
  licenceNumber: siteConfig.compliance.licenceNumber || null,
});

export const HelpIndexScreen = ({ embedded = false }: { embedded?: boolean }) => {
  const t = useT();
  const { navigate } = useApp();
  return (
    <SettingsPage title={t('help.title')} embedded={embedded}>
      <nav aria-label={t('help.title')} className="settings-list">
        <SettingsRow icon={<HelpCircle size={18} aria-hidden="true" />} title={t('help.faq')} description={t('section.help.desc')} onClick={() => navigate('help-faq')} />
        <SettingsRow icon={<Headphones size={18} aria-hidden="true" />} title={t('help.contact')} description={t('help.contactBody')} onClick={() => navigate('profile-support')} />
        <SettingsRow icon={<FileText size={18} aria-hidden="true" />} title={t('help.terms')} description={LEGAL_DRAFT_BANNER} onClick={() => navigate('help-terms')} />
        <SettingsRow icon={<Lock size={18} aria-hidden="true" />} title={t('help.privacy')} description={LEGAL_DRAFT_BANNER} onClick={() => navigate('help-privacy')} />
      </nav>
    </SettingsPage>
  );
};

export const FaqScreen = ({ embedded = false }: { embedded?: boolean }) => {
  const t = useT();
  const items = faqItems(legalFacts());
  return (
    <SettingsPage title={t('help.faq')} embedded={embedded}>
      <div className="settings-card">
        <p className="settings-banner" role="note">{LEGAL_DRAFT_BANNER}</p>
        {items.map((item) => (
          <details key={item.id} className="settings-faq">
            <summary>{item.question}</summary>
            <p>{item.answer}</p>
          </details>
        ))}
      </div>
    </SettingsPage>
  );
};

// Renders one legal page. Every value is placed as text, so nothing from the configuration is read as markup.
const LegalBody = ({ page }: { page: LegalPage }) => (
  <div className="settings-card settings-legal">
    <p className="settings-banner" role="note">{page.banner}</p>
    <p>{page.intro}</p>
    {page.sections.map((section) => (
      <section key={section.heading}>
        <h2>{section.heading}</h2>
        {section.paragraphs.map((p, i) => <p key={i}>{p}</p>)}
        {section.bullets && (
          <ul>
            {section.bullets.map((b, i) => <li key={i}>{b}</li>)}
          </ul>
        )}
      </section>
    ))}
  </div>
);

export const TermsScreen = ({ embedded = false }: { embedded?: boolean }) => {
  const t = useT();
  return (
    <SettingsPage title={t('help.terms')} embedded={embedded}>
      <LegalBody page={termsPage(legalFacts())} />
    </SettingsPage>
  );
};

export const PrivacyPolicyScreen = ({ embedded = false }: { embedded?: boolean }) => {
  const t = useT();
  return (
    <SettingsPage title={t('help.privacy')} embedded={embedded}>
      <LegalBody page={privacyPage(legalFacts())} />
    </SettingsPage>
  );
};
