import React, { useState } from 'react';
import { ArrowLeft, MessageSquare, Plus, Send, CheckCircle2, Clock } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { SupportTicket } from '../types';
import '../responsive/account.css';

export const SupportScreen: React.FC = () => {
  const { goBack, supportTickets, createTicket, replyToTicket, activeParams } = useApp();

  const [isCreating, setIsCreating] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(supportTickets[0]?.id ?? null);
  const selectedTicket: SupportTicket | null = supportTickets.find((ticket) => ticket.id === selectedTicketId) ?? null;

  // New ticket state
  const [category, setCategory] = useState<SupportTicket['category']>(
    activeParams?.orderId ? 'Order issue' : 'Delivery issue'
  );
  const [subject, setSubject] = useState(
    activeParams?.orderId ? `Query regarding Order #${activeParams.orderId}` : ''
  );
  const [message, setMessage] = useState('');
  const [newReply, setNewReply] = useState('');

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;
    const ticket = await createTicket(category, subject, message, activeParams?.orderId);
    setSelectedTicketId(ticket.id);
    setIsCreating(false);
    setSubject('');
    setMessage('');
  };

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReply.trim() || !selectedTicket) return;
    replyToTicket(selectedTicket.id, newReply);
    setNewReply('');
  };

  // Message thread and reply box. Shown inside the selected card on phone, and in the side pane on wide screens.
  const renderThread = (t: SupportTicket) => (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
        {t.messages.map((m, mIdx) => (
          <div
            key={mIdx}
            style={{
              alignSelf: m.sender === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '85%',
              backgroundColor: m.sender === 'user' ? '#2854C5' : '#F0F2F6',
              color: m.sender === 'user' ? '#FFFFFF' : '#161A22',
              padding: '8px 12px',
              borderRadius: '10px',
              fontSize: '12px',
              lineHeight: '17px',
            }}
          >
            <div style={{ fontSize: '10px', opacity: 0.8, marginBottom: '2px' }}>
              {m.sender === 'user' ? 'You' : 'Vijayawada Support'} • {m.timestamp}
            </div>
            {m.text}
          </div>
        ))}
      </div>

      {/* Reply Input */}
      <form onSubmit={handleSendReply} style={{ display: 'flex', gap: '8px' }}>
        <input
          type="text"
          placeholder="Type your reply..."
          value={newReply}
          onChange={(e) => setNewReply(e.target.value)}
          style={{
            flex: 1,
            padding: '8px 12px',
            borderRadius: '8px',
            border: '1px solid #CBD5E1',
            fontSize: '12px',
          }}
        />
        <button
          type="submit"
          style={{
            padding: '8px 12px',
            backgroundColor: '#2854C5',
            color: '#FFFFFF',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Send size={14} />
        </button>
      </form>
    </>
  );

  return (
    <div className="support-screen"
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#F7F8FB',
        overflowY: 'auto',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '12px 16px',
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid #ECEEF2',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 30,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button onClick={goBack} style={{ padding: '6px' }}>
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 style={{ fontSize: '15px', fontWeight: 700, color: '#161A22' }}>
              Customer Support
            </h1>
            <span style={{ fontSize: '11px', color: '#19734F', fontWeight: 600 }}>
              Vijayawada care team
            </span>
          </div>
        </div>

        <button
          onClick={() => setIsCreating(!isCreating)}
          style={{
            padding: '6px 12px',
            borderRadius: '8px',
            backgroundColor: isCreating ? '#F0F2F6' : '#2854C5',
            color: isCreating ? '#545B69' : '#FFFFFF',
            fontSize: '12px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <Plus size={14} />
          <span>{isCreating ? 'View Tickets' : 'New Ticket'}</span>
        </button>
      </div>

      <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '32px' }}>
        {isCreating ? (
          /* Create Ticket Form */
          <div className="support-form"
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              padding: '16px',
              border: '1px solid #E2E5EB',
            }}
          >
            <h2 style={{ fontSize: '15px', fontWeight: 800, color: '#161A22', marginBottom: '14px' }}>
              Open a Support Ticket
            </h2>

            <form onSubmit={handleCreateTicket} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#545B69', marginBottom: '6px', display: 'block' }}>
                  Issue Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '13px',
                    backgroundColor: '#FFFFFF',
                  }}
                >
                  <option value="Delivery issue">Delivery issue (Delayed ETA, rider inquiry)</option>
                  <option value="Order issue">Order issue (Missing or damaged item)</option>
                  <option value="Payment issue">Payment issue (Deduction query, refund)</option>
                  <option value="Beauty Insurance claim">Beauty Insurance claim</option>
                  <option value="Skin-related adverse reaction">Skin-related adverse reaction</option>
                  <option value="Other">Other general inquiry</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#545B69', marginBottom: '6px', display: 'block' }}>
                  Subject
                </label>
                <input
                  type="text"
                  required
                  placeholder="Brief summary of your inquiry..."
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '13px',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#545B69', marginBottom: '6px', display: 'block' }}>
                  Details
                </label>
                <textarea
                  required
                  placeholder="Please provide full details so we can resolve this promptly..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  style={{
                    width: '100%',
                    height: '100px',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '13px',
                    resize: 'none',
                  }}
                />
              </div>

              <button
                type="submit"
                style={{
                  padding: '12px',
                  backgroundColor: '#2854C5',
                  color: '#FFFFFF',
                  borderRadius: '10px',
                  fontSize: '13px',
                  fontWeight: 700,
                  marginTop: '6px',
                }}
              >
                Submit Support Ticket
              </button>
            </form>
          </div>
        ) : (
          /* Active Ticket Viewer */
          <div className="support-layout">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {supportTickets.map((t) => {
                const isSelected = selectedTicket?.id === t.id;
                return (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTicketId(t.id)}
                    style={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '14px',
                      border: `1.5px solid ${isSelected ? '#2854C5' : '#E2E5EB'}`,
                      padding: '14px',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 800, color: '#161A22' }}>#{t.id}</span>
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            color: t.status === 'Resolved' ? '#19734F' : '#A76516',
                            backgroundColor: t.status === 'Resolved' ? '#F0FDF4' : '#FFFBEB',
                            padding: '1px 6px',
                            borderRadius: '4px',
                          }}
                        >
                          {t.status}
                        </span>
                      </div>
                      <span style={{ fontSize: '11px', color: '#818896' }}>{t.createdAt}</span>
                    </div>

                    <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#161A22' }}>{t.subject}</h3>
                    <div style={{ fontSize: '11px', color: '#687080', marginTop: '2px' }}>Category: {t.category}</div>

                    {/* Message Thread (if selected, phone only) */}
                    {isSelected && (
                      <div className="support-inline-thread" style={{ marginTop: '14px', borderTop: '1px solid #F0F2F6', paddingTop: '12px' }}>
                        {renderThread(t)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Wide-screen thread pane. Hidden on phone by the stylesheet's wide-screen rules. */}
            <div className="support-pane" hidden>
              {selectedTicket ? (
                <>
                  <div className="support-pane-head">
                    <span style={{ fontSize: '12px', fontWeight: 800, color: '#161A22' }}>#{selectedTicket.id}</span>
                    <h2>{selectedTicket.subject}</h2>
                    <div style={{ fontSize: '11px', color: '#687080' }}>Category: {selectedTicket.category} • {selectedTicket.status}</div>
                  </div>
                  {renderThread(selectedTicket)}
                </>
              ) : (
                <p className="support-pane-empty">
                  No ticket selected. Use New Ticket to contact the Vijayawada care team.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
