import { useState } from 'react';
import { ChevronDown, ChevronUp, ExternalLink, FileText, Mail, MessageSquare, RotateCcw, Send, Truck } from 'lucide-react';
import { useApp } from '../../context/useApp';
import { openWhatsAppSupport, SUPPORT_HOTLINE } from '../../core/utils/whatsapp';
import { ProfileHeader } from './ProfileShared';

const SUPPORT_EMAIL = 'contact@glowvai.in';
const SUPPORT_PHONE_LABEL = `+91 ${SUPPORT_HOTLINE.slice(0, 5)} ${SUPPORT_HOTLINE.slice(5)}`;

const ISSUE_TOPICS = [
  'Delivery',
  'Missing or damaged item',
  'Payment or refund',
  'Skin reaction to a product',
  'Suitability cover',
  'Something else',
];

// Answers describe only what the shop and the glowvai.in help pages actually offer.
const FAQS = [
  {
    q: 'How do I track my order?',
    a: 'Open Orders and choose your order to see its latest status. The order page also has a Help button that brings the order number here.',
  },
  {
    q: 'What if a product arrives damaged?',
    a: 'Message us on WhatsApp or email within 48 hours of delivery with a photo of the product. The returns page explains replacements and refunds.',
  },
  {
    q: 'Which areas do you deliver to?',
    a: 'We deliver to covered areas of Vijayawada. Your address is checked at checkout, and the delivery page lists the areas.',
  },
  {
    q: 'Can I cancel an order?',
    a: 'You can request a cancellation from the order tracking page until the order is on its way.',
  },
  {
    q: 'Is the skin scan private?',
    a: 'Your face is used only to check the scan position and create cosmetic insights. Identity recognition is not used.',
  },
];

const HELP_PAGES = [
  { href: '/returns', title: 'Returns & refunds', icon: <RotateCcw size={16} /> },
  { href: '/delivery', title: 'Delivery areas', icon: <Truck size={16} /> },
  { href: '/faq', title: 'All questions', icon: <FileText size={16} /> },
];

export const HelpAndSupportScreen = () => {
  const { activeParams, goBack } = useApp();
  const paramOrderId: string | undefined = activeParams?.orderId;
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);
  const [topic, setTopic] = useState(paramOrderId ? ISSUE_TOPICS[1] : ISSUE_TOPICS[0]);
  const [orderId, setOrderId] = useState(paramOrderId ?? '');
  const [details, setDetails] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Support has no ticket backend yet, so the message goes to the team on WhatsApp, where they reply.
  const handleSend = () => {
    if (details.trim().length < 10) {
      setFormError('Tell us a little more so the team can help.');
      return;
    }
    setFormError(null);
    const lines = [
      'Hi GlowVai support,',
      `Topic: ${topic}`,
      orderId.trim() ? `Order: #${orderId.trim().replace(/^#/, '')}` : null,
      '',
      details.trim(),
    ].filter((line): line is string => line !== null);
    openWhatsAppSupport(lines.join('\n'));
  };

  return (
    <main className="profile-screen">
      <ProfileHeader title="Help & support" eyebrow="GlowVai customer care" onBack={goBack} />

      <div className="profile-body">
        <div className="profile-side">
        <p className="profile-label">Contact us</p>
        <section className="profile-card">
          <button type="button" className="profile-list-item" onClick={() => openWhatsAppSupport()}>
            <span className="profile-whatsapp-icon"><MessageSquare size={18} /></span>
            <span className="profile-list-copy">
              <span className="profile-list-title">Chat on WhatsApp</span>
              <span className="profile-list-note">{SUPPORT_PHONE_LABEL}</span>
            </span>
            <ExternalLink size={16} className="profile-chevron" />
          </button>
          <a className="profile-list-item" href={`mailto:${SUPPORT_EMAIL}`}>
            <span className="profile-list-icon is-large"><Mail size={18} /></span>
            <span className="profile-list-copy">
              <span className="profile-list-title">Email us</span>
              <span className="profile-list-note">{SUPPORT_EMAIL}</span>
            </span>
            <ExternalLink size={16} className="profile-chevron" />
          </a>
        </section>

        <p className="profile-label">Help pages</p>
        <section className="profile-card">
          {HELP_PAGES.map((page) => (
            <a key={page.href} className="profile-list-item" href={page.href} target="_blank" rel="noopener noreferrer">
              <span className="profile-list-icon">{page.icon}</span>
              <span className="profile-list-copy"><span className="profile-list-title">{page.title}</span></span>
              <ExternalLink size={16} className="profile-chevron" />
            </a>
          ))}
        </section>
        </div>

        <div className="profile-main">
        <p className="profile-label">Tell us what went wrong</p>
        <section className="profile-card profile-card-body">
          <div className="profile-form-grid">
            <label className="profile-field">
              <span className="profile-field-label">Topic</span>
              <select className="profile-input" value={topic} onChange={(e) => setTopic(e.target.value)}>
                {ISSUE_TOPICS.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </label>
            <label className="profile-field">
              <span className="profile-field-label">Order number (optional)</span>
              <input className="profile-input" value={orderId} onChange={(e) => setOrderId(e.target.value)} placeholder="e.g. GLOW-123456" autoCapitalize="characters" />
            </label>
          </div>
          <label className="profile-field">
            <span className="profile-field-label">What happened?</span>
            <textarea className="profile-input is-textarea" value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Share the details so we can help quickly" />
          </label>
          {formError && <p className="profile-field-error" role="alert">{formError}</p>}
          <button type="button" className="profile-button is-primary is-block" onClick={handleSend}>
            <Send size={16} />
            Send on WhatsApp
          </button>
          <p className="profile-field-hint">Opens WhatsApp with your message filled in. Our team replies to you there.</p>
        </section>

        <p className="profile-label">Common questions</p>
        <section className="profile-card">
          {FAQS.map((faq, index) => {
            const isExpanded = expandedFaq === index;
            return (
              <div key={faq.q} className="profile-faq-item">
                <button
                  type="button"
                  className="profile-faq-question"
                  aria-expanded={isExpanded}
                  onClick={() => setExpandedFaq(isExpanded ? null : index)}
                >
                  <span>{faq.q}</span>
                  {isExpanded ? <ChevronUp size={18} className="profile-chevron" /> : <ChevronDown size={18} className="profile-chevron" />}
                </button>
                {isExpanded && <p className="profile-faq-answer">{faq.a}</p>}
              </div>
            );
          })}
        </section>
        </div>
      </div>
    </main>
  );
};
