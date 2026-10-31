import { useState } from 'react';
import { ChevronDown, ChevronUp, MessageSquare, PlusCircle, Send } from 'lucide-react';
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

const FAQS = [
  {
    q: 'How fast is 10-Min Express Delivery in Vijayawada?',
    a: 'Orders placed within our Payikapuram and Benz Circle dark store coverage areas are picked, packed, and delivered by our dedicated riders within 15–30 minutes max.',
  },
  {
    q: 'What is GlowVAI 100% Beauty Protection Coverage?',
    a: 'Every product purchase can opt-in for ₹29 Beauty Protection. If a product causes breakouts or redness within 14 days, upload photo proof for 100% wallet refund.',
  },
  {
    q: 'How do I redeem GlowVAI Referral Coins?',
    a: 'Referral coins earned from student invites can be redeemed directly on the checkout screen for up to 20% instant cart discount.',
  },
  {
    q: 'Can I cancel an active order before delivery?',
    a: 'Yes! Orders can be cancelled free of charge from the Order Details screen before our dark store finishes packing.',
  },
];

export const HelpAndSupportScreen = () => {
  const { supportTickets, createTicket, replyToTicket, activeParams, goBack, showToast } = useApp();
  const orderId: string | undefined = activeParams?.orderId;
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);
  const [isCreating, setIsCreating] = useState(Boolean(orderId));
  const [category, setCategory] = useState<TicketCategory>(orderId ? 'Order issue' : 'Delivery issue');
  const [subject, setSubject] = useState(orderId ? `Query regarding Order #${orderId}` : '');
  const [message, setMessage] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(supportTickets[0]?.id ?? null);
  const [reply, setReply] = useState('');
  const selectedTicket = supportTickets.find((ticket) => ticket.id === selectedId) ?? null;

  const handleCreateTicket = async () => {
    if (!subject.trim() || !message.trim()) {
      setFormError('Add a subject and some details so we can help.');
      return;
    }
    try {
      const ticket = await createTicket(category, subject.trim(), message.trim(), orderId);
      setSelectedId(ticket.id);
      setIsCreating(false);
      setSubject('');
      setMessage('');
      setFormError(null);
      showToast('Support ticket created');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not create the ticket. Try again.');
    }
  };

  const handleReply = () => {
    if (!reply.trim() || !selectedTicket) return;
    replyToTicket(selectedTicket.id, reply.trim());
    setReply('');
  };

  return (
    <main className="profile-screen">
      <ProfileHeader title="Help & support" eyebrow="Vijayawada care team" onBack={goBack} />

      <div className="profile-body">
        <div className="profile-side">
        <button type="button" className="profile-card profile-list-row profile-whatsapp" onClick={() => openWhatsAppSupport()}>
          <span className="profile-whatsapp-icon"><MessageSquare size={20} /></span>
          <span className="profile-list-copy">
            <span className="profile-list-title">Chat with our operations team</span>
            <span className="profile-list-note">WhatsApp +91 {SUPPORT_HOTLINE}</span>
          </span>
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
                  {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>
                {isExpanded && <p className="profile-faq-answer">{faq.a}</p>}
              </div>
            );
          })}
        </section>

        </div>

        <div className="profile-main">
        <div className="profile-section-head">
          <p className="profile-label">Your support tickets</p>
          <button
            type="button"
            className="profile-button is-secondary is-small"
            onClick={() => {
              setIsCreating(!isCreating);
              setFormError(null);
            }}
          >
            <PlusCircle size={14} />
            {isCreating ? 'View tickets' : 'New ticket'}
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
            <button type="button" className="profile-button is-primary is-block" onClick={handleCreateTicket}>Submit ticket</button>
          </section>
        ) : supportTickets.length === 0 ? (
          <section className="profile-card">
            <p className="profile-empty">No tickets yet. Create one and our team will reply here.</p>
          </section>
        ) : (
          <section className="profile-card">
            {supportTickets.map((ticket) => {
              const isSelected = selectedTicket?.id === ticket.id;
              const resolved = ticket.status === 'Resolved' || ticket.status === 'Closed';
              return (
                <div key={ticket.id}>
                  <button type="button" className="profile-ticket-button" aria-expanded={isSelected} onClick={() => setSelectedId(isSelected ? null : ticket.id)}>
                    <span className="profile-ticket-top">
                      <span className="profile-ticket-meta">#{ticket.id}</span>
                      <span className={resolved ? 'profile-pill is-success' : 'profile-pill is-warning'}>{ticket.status}</span>
                    </span>
                    <span className="profile-ticket-title">{ticket.subject}</span>
                    <span className="profile-ticket-meta">{ticket.category} · {ticket.createdAt}</span>
                  </button>

                  {isSelected && (
                    <div className="profile-thread">
                      {ticket.messages.map((item, index) => (
                        <p key={`${ticket.id}-${index}`} className={item.sender === 'user' ? 'profile-bubble is-user' : 'profile-bubble'}>
                          <small>{item.sender === 'user' ? 'You' : 'Vijayawada support'} · {item.timestamp}</small>
                          {item.text}
                        </p>
                      ))}
                      <form
                        className="profile-reply-row"
                        onSubmit={(e) => {
                          e.preventDefault();
                          handleReply();
                        }}
                      >
                        <input className="profile-input" value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Type your reply" aria-label="Reply to ticket" />
                        <button type="submit" className="profile-button is-primary is-small" aria-label="Send reply">
                          <Send size={14} />
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              );
            })}
          </section>
        )}
        </div>
      </div>
    </main>
  );
};
