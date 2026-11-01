import { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronRight, ChevronUp, MessageSquare, PlusCircle, Send, X } from 'lucide-react';
import { useApp } from '../../context/useApp';
import { openWhatsAppSupport, SUPPORT_HOTLINE } from '../../core/utils/whatsapp';
import type { SupportTicket } from '../../types';
import { ProfileHeader } from './ProfileShared';

type TicketCategory = SupportTicket['category'];

const TICKET_CATEGORIES: TicketCategory[] = [
  'Delivery issue',
  'Order issue',
  'Payment issue',
  'Refund issue',
  'Damaged product',
  'Beauty Insurance claim',
  'Skin-related adverse reaction',
  'Other',
];

// Answers only describe what the shop shows today. Delivery times, cover and rewards are not promised here.
const FAQS = [
  {
    q: 'How long does delivery take?',
    a: 'It depends on your address and the nearest store. You see the delivery estimate for your address before you pay, and the live status on the order tracking page.',
  },
  {
    q: 'What is Beauty Protection?',
    a: 'Beauty Protection is an optional add-on offered on some products. What it covers and how to make a claim are shown with the product before you add it to your cart.',
  },
  {
    q: 'Can I use Glow Coins at checkout?',
    a: 'Not yet. Glow Coins are not connected to web shop accounts, so they cannot be earned or redeemed here.',
  },
  {
    q: 'Can I cancel an order before delivery?',
    a: 'You can request a cancellation from the order details page until the order is packed. After that, message us on WhatsApp and we will help.',
  },
];

export const HelpAndSupportScreen = () => {
  const { activeParams, goBack, showToast } = useApp();
  const orderId: string | undefined = activeParams?.orderId;
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);
  const [isCreating, setIsCreating] = useState(Boolean(orderId));
  const [category, setCategory] = useState<TicketCategory>(orderId ? 'Order issue' : 'Delivery issue');
  const [subject, setSubject] = useState(orderId ? `Query regarding Order #${orderId}` : '');
  const [message, setMessage] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const ticketsRef = useRef<HTMLDivElement>(null);

  // Opened from an order: the pre-filled form sits below the FAQ on phones, so bring it into view.
  useEffect(() => {
    if (orderId) ticketsRef.current?.scrollIntoView({ block: 'start' });
  }, [orderId]);

  // There is no ticket service behind the web shop, so the message goes to the support team on WhatsApp,
  // where they reply. Nothing is shown as a ticket here, because nobody would answer it in this screen.
  const handleSendMessage = () => {
    if (!subject.trim() || !message.trim()) {
      setFormError('Add a subject and some details so we can help.');
      return;
    }
    const text = [`Hi glowvai support, ${category.toLowerCase()}.`, orderId ? `Order: #${orderId}` : '', `Subject: ${subject.trim()}`, message.trim()]
      .filter(Boolean)
      .join('\n');
    openWhatsAppSupport(text);
    setFormError(null);
    showToast('Opening WhatsApp with your message. Send it there to reach our team.');
  };

  return (
    <main className="profile-screen">
      <ProfileHeader title="Help & support" eyebrow="Customer care" onBack={goBack} />

      <div className="profile-body is-support">
        <div className="profile-side">
        <button type="button" className="profile-card profile-list-row profile-whatsapp" onClick={() => openWhatsAppSupport()}>
          <span className="profile-whatsapp-icon"><MessageSquare size={20} /></span>
          <span className="profile-list-copy">
            <span className="profile-list-title">Chat with us on WhatsApp</span>
            <span className="profile-list-note">+91 {SUPPORT_HOTLINE}</span>
          </span>
          <ChevronRight size={18} className="profile-chevron" />
        </button>

        <p className="profile-label">Frequently asked questions</p>
        <section className="profile-card">
          {FAQS.map((faq, index) => {
            const isExpanded = expandedFaq === index;
            return (
              <div key={faq.q}>
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

        <div className="profile-main">
        <div className="profile-section-head" ref={ticketsRef}>
          <p className="profile-label">Message our team</p>
          <button
            type="button"
            className="profile-button is-secondary is-small"
            onClick={() => {
              setIsCreating(!isCreating);
              setFormError(null);
            }}
          >
            {isCreating ? <X size={14} /> : <PlusCircle size={14} />}
            {isCreating ? 'Cancel' : 'Write to us'}
          </button>
        </div>

        {isCreating ? (
          <section className="profile-card profile-card-body">
            <label className="profile-field">
              <span className="profile-field-label">Issue category</span>
              <select className="profile-input" value={category} onChange={(e) => setCategory(e.target.value as TicketCategory)}>
                {TICKET_CATEGORIES.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </label>
            <label className="profile-field">
              <span className="profile-field-label">Subject</span>
              <input className="profile-input" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Brief summary of your inquiry" />
            </label>
            <label className="profile-field">
              <span className="profile-field-label">Details</span>
              <textarea className="profile-input is-textarea" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Share full details so we can resolve this quickly" />
            </label>
            {formError && <p className="profile-field-error" role="alert">{formError}</p>}
            <button type="button" className="profile-button is-primary is-block" onClick={handleSendMessage}>
              <Send size={16} />
              Send on WhatsApp
            </button>
            <p className="profile-list-note">This opens WhatsApp with your message filled in. Our team replies to you there.</p>
          </section>
        ) : (
          <section className="profile-card">
            <div className="profile-empty-row">
              <span className="profile-list-icon is-muted"><MessageSquare size={16} /></span>
              <span className="profile-list-copy">
                <span className="profile-list-title">Need help with something else?</span>
                <span className="profile-list-note">Write to us and we will open WhatsApp with your message, so our team can reply there.</span>
              </span>
            </div>
          </section>
        )}
        </div>
      </div>
    </main>
  );
};
