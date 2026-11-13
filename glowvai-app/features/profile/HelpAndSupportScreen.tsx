import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, ExternalLink, FileText, Inbox, Mail, MessageSquare, RefreshCw, RotateCcw, Send, Truck } from 'lucide-react';
import { useApp } from '../../context/useApp';
import {
  SUPPORT_CATEGORIES,
  createSupportTicket,
  fetchSupportTickets,
  replySupportTicket,
  supportCategoryLabel,
  type SupportCategory,
  type SupportTicketView,
} from '../../core/services/shopApi';
import { useCustomerStore } from '../../core/state/customerStore';
import { openWhatsAppSupport, SUPPORT_HOTLINE } from '../../core/utils/whatsapp';
import { ProfileHeader } from './ProfileShared';

const SUPPORT_EMAIL = 'contact@glowvai.in';
const SUPPORT_PHONE_LABEL = `+91 ${SUPPORT_HOTLINE.slice(0, 5)} ${SUPPORT_HOTLINE.slice(5)}`;

// Answers describe only what the shop and the glowvai.in help pages actually offer.
const FAQS = [
  {
    q: 'How do I track my order?',
    a: 'Open My orders and choose your order to see its latest status, as recorded by the GlowVai team.',
  },
  {
    q: 'What if a product arrives damaged?',
    a: 'Report a problem here within 48 hours of delivery and choose "Item arrived damaged". The returns page explains replacements and refunds.',
  },
  {
    q: 'Which areas do you deliver to?',
    a: 'We deliver to covered areas of Vijayawada. Your address is checked at checkout, and the delivery page lists the areas.',
  },
  {
    q: 'Can I cancel an order?',
    a: 'Yes, from the order page, until the GlowVai team starts preparing it. After that, report a problem here.',
  },
  {
    q: 'Is the skin scan private?',
    a: 'Your face is used only to check the scan position and create cosmetic insights. Identity recognition is not used.',
  },
];

const HELP_PAGES = [
  { href: '/returns', title: 'Returns & refunds', icon: <RotateCcw size={18} /> },
  { href: '/delivery', title: 'Delivery areas', icon: <Truck size={18} /> },
  { href: '/faq', title: 'All questions', icon: <FileText size={18} /> },
];

// Status codes as the admin panel writes them (WAITING_CUSTOMER is "waiting for you").
const STATUS_TEXT: Record<string, string> = {
  OPEN: 'Open',
  IN_PROGRESS: 'In progress',
  WAITING_CUSTOMER: 'Waiting for you',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
};
const statusText = (status: string) => STATUS_TEXT[status] ?? (status ? status.replace(/_/g, ' ').toLowerCase() : 'Open');
const statusTone = (status: string) => (status === 'RESOLVED' || status === 'CLOSED' ? 'profile-pill is-success' : status === 'WAITING_CUSTOMER' ? 'profile-pill is-warning' : 'profile-pill');
// A customer can reply while the team has the request open. Resolved and closed requests take no more replies.
const canReply = (status: string) => status === 'OPEN' || status === 'IN_PROGRESS' || status === 'WAITING_CUSTOMER';

const formatWhen = (iso: string) => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
};

// Help & support. "Report a problem" creates a request the GlowVai team handles in the admin panel (Customer
// Support), and "My requests" shows their status and replies. WhatsApp and email remain as other ways to reach us.
export const HelpAndSupportScreen = () => {
  const { activeParams, goBack, navigate, customerDetails } = useApp();
  const paramOrderId: string | undefined = activeParams?.orderId;
  const orders = useCustomerStore((s) => s.orders);
  const loadOrders = useCustomerStore((s) => s.loadOrders);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [category, setCategory] = useState<SupportCategory>(paramOrderId ? 'MISSING_PRODUCT' : 'ORDER_DELAY');
  const [orderId, setOrderId] = useState(paramOrderId ?? '');
  const [subject, setSubject] = useState('');
  const [details, setDetails] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sentId, setSentId] = useState<string | null>(null);
  const [tickets, setTickets] = useState<SupportTicketView[]>([]);
  const [ticketsState, setTicketsState] = useState<{ status: 'loading' | 'ready' | 'error'; error: string | null }>({ status: 'loading', error: null });
  const [openTicket, setOpenTicket] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [replyState, setReplyState] = useState<{ id: string | null; error: string | null }>({ id: null, error: null });

  // Loads the customer's requests once when the screen opens, and again on "Refresh". There is no background polling.
  const loadTickets = async () => {
    setTicketsState((s) => ({ status: tickets.length ? s.status : 'loading', error: null }));
    const res = await fetchSupportTickets();
    if (res.ok) {
      setTickets(res.data?.tickets ?? []);
      setTicketsState({ status: 'ready', error: null });
    } else {
      setTicketsState({ status: 'error', error: res.error });
    }
  };

  useEffect(() => {
    void loadOrders();
    void loadTickets();
  }, []);

  // Sends a reply to one of the customer's own requests, then reloads the list so the thread matches the server.
  const handleReply = async (ticketId: string) => {
    const body = (replyText[ticketId] ?? '').trim();
    if (!body) return setReplyState({ id: ticketId, error: 'Write your reply first.' });
    setReplyState({ id: ticketId, error: null });
    const res = await replySupportTicket(ticketId, body);
    if (!res.ok) return setReplyState({ id: ticketId, error: res.error || 'Your reply could not be sent. Try again.' });
    setReplyText((r) => ({ ...r, [ticketId]: '' }));
    setReplyState({ id: null, error: null });
    void loadTickets();
  };

  const handleSend = async () => {
    if (subject.trim().length < 3) return setFormError('Add a short subject.');
    if (details.trim().length < 10) return setFormError('Tell us a little more so the team can help (at least a sentence).');
    setFormError(null);
    setSending(true);
    const res = await createSupportTicket({ category, subject: subject.trim(), description: details.trim(), orderId: orderId || null });
    setSending(false);
    if (!res.ok) {
      setFormError(res.error || 'Your request could not be sent. Try again.');
      return;
    }
    setSentId(res.data?.ticketId ?? null);
    setSubject('');
    setDetails('');
    void loadTickets();
  };

  const whatsappText = () =>
    [
      'Hi GlowVai support,',
      `Topic: ${supportCategoryLabel(category)}`,
      orderId ? `Order: #${orderId}` : null,
      '',
      details.trim(),
    ]
      .filter((line): line is string => line !== null)
      .join('\n');

  return (
    <main className="profile-screen">
      <ProfileHeader title="Help & support" eyebrow="GlowVai customer care" onBack={goBack} />

      <div className="profile-body">
        <div className="profile-side">
        <p className="profile-label">My requests</p>
        <section className="profile-card">
          <div className="profile-action-row">
            <button type="button" className="profile-button is-outline" onClick={() => void loadTickets()} disabled={ticketsState.status === 'loading'}>
              <RefreshCw size={16} /> Refresh
            </button>
          </div>
          {ticketsState.status === 'loading' && <p className="profile-empty" role="status">Loading your requests…</p>}
          {ticketsState.status === 'error' && (
            <div className="profile-empty-block" role="alert">
              <p className="profile-empty">{ticketsState.error || 'Your requests could not be loaded.'}</p>
              <button type="button" className="profile-button is-outline" onClick={() => void loadTickets()}>
                <RefreshCw size={16} /> Try again
              </button>
            </div>
          )}
          {ticketsState.status === 'ready' && tickets.length === 0 && (
            <div className="profile-empty-block">
              <span className="profile-empty-icon"><Inbox size={24} /></span>
              <p className="profile-empty">No requests yet. Problems you report here show up with their status and replies.</p>
            </div>
          )}
          {tickets.map((ticket) => {
            const isOpen = openTicket === ticket.id;
            return (
              <div key={ticket.id} className="profile-faq-item">
                <button type="button" className="profile-ticket-button" aria-expanded={isOpen} onClick={() => setOpenTicket(isOpen ? null : ticket.id)}>
                  <span className="profile-ticket-top">
                    <span className={statusTone(ticket.status)}>{statusText(ticket.status)}</span>
                    <span className="profile-list-note">{formatWhen(ticket.createdAt)}</span>
                  </span>
                  <span className="profile-ticket-title">{ticket.subject}</span>
                  <span className="profile-list-note">
                    {ticket.id} · {supportCategoryLabel(ticket.category)}
                    {ticket.orderId ? ` · Order #${ticket.orderId}` : ''}
                  </span>
                </button>
                {isOpen && (
                  <div className="profile-thread">
                    {ticket.messages.length === 0 && !ticket.resolution && (
                      <p className="profile-field-hint">No reply yet. The GlowVai team will respond here.</p>
                    )}
                    {ticket.messages.map((message, index) => (
                      <p key={index} className={message.kind === 'CUSTOMER' ? 'profile-bubble is-user' : 'profile-bubble'}>
                        <small>
                          {message.kind === 'CUSTOMER' ? 'You' : 'GlowVai team'} · {formatWhen(message.at)}
                          {message.evidenceRequest ? ' · Evidence requested' : ''}
                        </small>
                        {message.text}
                      </p>
                    ))}
                    {ticket.resolution && (
                      <p className="profile-bubble">
                        <small>Resolution</small>
                        {ticket.resolution}
                      </p>
                    )}
                    {canReply(ticket.status) ? (
                      <div className="profile-reply">
                        <label className="profile-field">
                          <span className="profile-field-label">Reply to GlowVai</span>
                          <textarea
                            className="profile-input is-textarea"
                            value={replyText[ticket.id] ?? ''}
                            maxLength={2000}
                            onChange={(e) => setReplyText((r) => ({ ...r, [ticket.id]: e.target.value }))}
                            placeholder="Add details or answer the team's question"
                          />
                        </label>
                        {replyState.id === ticket.id && replyState.error && <p className="profile-field-error" role="alert">{replyState.error}</p>}
                        <button type="button" className="profile-button is-primary" onClick={() => void handleReply(ticket.id)}>
                          <Send size={16} /> Send reply
                        </button>
                      </div>
                    ) : (
                      <p className="profile-field-hint">This request is {statusText(ticket.status).toLowerCase()}. Start a new request if you still need help.</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </section>

        <p className="profile-label">Other ways to reach us</p>
        <section className="profile-card">
          <button type="button" className="profile-list-item" onClick={() => openWhatsAppSupport(details.trim() ? whatsappText() : undefined)}>
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
        <p className="profile-label">Report a problem</p>
        <section className="profile-card profile-card-body">
          {sentId && (
            <p className="profile-privacy-note" role="status">
              <Send size={16} /> Request {sentId} sent. The GlowVai team will reply here under My requests.
            </p>
          )}
          {!customerDetails && (
            <p className="profile-field-hint">
              Tip: <button type="button" className="profile-text-link" onClick={() => navigate('customer-details', { returnTo: 'profile-support' })}>add your name and mobile number</button> so the team can contact you.
            </p>
          )}
          <div className="profile-form-grid">
            <label className="profile-field">
              <span className="profile-field-label">What is it about?</span>
              <select className="profile-input" value={category} onChange={(e) => setCategory(e.target.value as SupportCategory)}>
                {SUPPORT_CATEGORIES.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
              </select>
            </label>
            <label className="profile-field">
              <span className="profile-field-label">Order (optional)</span>
              <select className="profile-input" value={orderId} onChange={(e) => setOrderId(e.target.value)}>
                <option value="">Not about an order</option>
                {paramOrderId && !orders.some((o) => o.orderId === paramOrderId) && <option value={paramOrderId}>#{paramOrderId}</option>}
                {orders.map((order) => (
                  <option key={order.orderId} value={order.orderId}>
                    #{order.orderId} · {order.items[0]?.title ?? 'Order'}{order.items.length > 1 ? ` + ${order.items.length - 1} more` : ''}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="profile-field">
            <span className="profile-field-label">Subject</span>
            <input className="profile-input" value={subject} maxLength={120} onChange={(e) => setSubject(e.target.value)} placeholder="A few words, e.g. Serum bottle leaked" />
          </label>
          <label className="profile-field">
            <span className="profile-field-label">What happened?</span>
            <textarea className="profile-input is-textarea" value={details} maxLength={2000} onChange={(e) => setDetails(e.target.value)} placeholder="Share the details so we can help quickly" />
          </label>
          {formError && <p className="profile-field-error" role="alert">{formError}</p>}
          <button type="button" className="profile-button is-primary is-block" onClick={() => void handleSend()} disabled={sending}>
            <Send size={16} />
            {sending ? 'Sending…' : 'Send to GlowVai support'}
          </button>
          <p className="profile-field-hint">Skin reactions and products that may not be genuine are sent to the team as urgent.</p>
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
