'use client';

import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Check, Package, X, type LucideIcon } from 'lucide-react';
import { useApp } from '../../context/useApp';
import { startOrderNotifier } from './orderNotifier';
import { useNotificationStore, type NotificationMessage } from './notificationStore';
import type { MessageTone } from './orderEvents';
import './notifications.css';

// Mounted once inside the app. It starts the order watcher and shows the toasts and dialogs it queues.
export const TOAST_DURATION_MS = 5000;

const ICONS: Record<MessageTone, LucideIcon> = {
  info: Package,
  success: Check,
  warning: AlertTriangle,
  danger: X,
};

const ToneIcon: React.FC<{ tone: MessageTone; size?: number }> = ({ tone, size = 18 }) => {
  const Icon = ICONS[tone];
  return <Icon size={size} aria-hidden={true} />;
};

const ToastCard: React.FC<{ message: NotificationMessage; onOpen: (m: NotificationMessage) => void }> = ({ message, onOpen }) => {
  const [paused, setPaused] = useState(false);
  const dismiss = () => useNotificationStore.getState().dismissToast(message.id);

  // Auto-dismiss after about five seconds. Hovering or focusing the toast keeps it on screen.
  useEffect(() => {
    if (paused) return;
    const timer = window.setTimeout(dismiss, TOAST_DURATION_MS);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused, message.id]);

  return (
    <div
      className={`order-notify-toast order-notify-toast--${message.tone}`}
      role="status"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setPaused(false);
      }}
    >
      <span className="order-notify-icon" aria-hidden="true">
        <ToneIcon tone={message.tone} />
      </span>
      <span className="order-notify-text">
        <span className="order-notify-title">{message.title}</span>
        <span className="order-notify-body">Order {message.orderId}</span>
      </span>
      <button type="button" className="order-notify-link" onClick={() => onOpen(message)}>
        View order
      </button>
      <button type="button" className="order-notify-dismiss" aria-label="Dismiss message" onClick={dismiss}>
        <X size={18} aria-hidden={true} />
      </button>
    </div>
  );
};

const focusableIn = (root: HTMLElement) =>
  Array.from(root.querySelectorAll<HTMLElement>('button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'));

const OrderDialog: React.FC<{
  message: NotificationMessage;
  onOpen: (m: NotificationMessage) => void;
  onClose: (m: NotificationMessage) => void;
}> = ({ message, onOpen, onClose }) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = `order-notify-title-${message.id.replace(/[^A-Za-z0-9_-]/g, '')}`;
  const bodyId = `${titleId}-body`;

  // Focus moves into the dialog on open and goes back to the previous element on close.
  // Escape closes the dialog wherever focus is. The dialog is keyed by message id, so this runs once per message.
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialogRef.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus();
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose(message);
    };
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('keydown', onEscape);
      if (previous && typeof previous.focus === 'function' && document.contains(previous)) previous.focus();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Tab' || !dialogRef.current) return;
    // Keeps Tab and Shift+Tab inside the dialog.
    const items = focusableIn(dialogRef.current);
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div className="order-notify-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(message); }}>
      <div
        ref={dialogRef}
        className="order-notify-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        onKeyDown={onKeyDown}
      >
        <span className={`order-notify-badge order-notify-badge--${message.tone}`} aria-hidden="true">
          <ToneIcon tone={message.tone} size={22} />
        </span>
        <h2 id={titleId} className="order-notify-heading">{message.title}</h2>
        <p id={bodyId} className="order-notify-message">{message.body}</p>
        <dl className="order-notify-facts">
          <div>
            <dt>Order number</dt>
            <dd>{message.orderId}</dd>
          </div>
          {message.amountText && (
            <div>
              <dt>Amount</dt>
              <dd>{message.amountText}</dd>
            </div>
          )}
        </dl>
        <div className="order-notify-actions">
          <button type="button" className="order-notify-primary" data-autofocus onClick={() => onOpen(message)}>
            View order
          </button>
          <button type="button" className="order-notify-secondary" onClick={() => onClose(message)}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export const OrderNotifications: React.FC = () => {
  const { navigate } = useApp();
  const toasts = useNotificationStore((s) => s.toasts);
  const modal = useNotificationStore((s) => s.modals[0] ?? null);

  useEffect(() => startOrderNotifier(), []);

  const openOrder = (message: NotificationMessage) => {
    if (message.variant === 'modal') useNotificationStore.getState().dismissModal(message.id);
    else useNotificationStore.getState().dismissToast(message.id);
    navigate('orders-detail', { orderId: message.orderId });
  };

  const closeModal = (message: NotificationMessage) => useNotificationStore.getState().dismissModal(message.id);

  return (
    <>
      {toasts.length > 0 && (
        <div className="order-notify-stack">
          {toasts.map((message) => (
            <ToastCard key={message.id} message={message} onOpen={openOrder} />
          ))}
        </div>
      )}
      {modal && <OrderDialog key={modal.id} message={modal} onOpen={openOrder} onClose={closeModal} />}
    </>
  );
};
