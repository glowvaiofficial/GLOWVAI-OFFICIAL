import React, { useEffect, useState } from 'react';
import { BellRing } from 'lucide-react';
import { currentPushState, enableOrderUpdates, NOT_SET_UP_MESSAGE, type PushState } from '../../core/notifications/push';

// The only place that asks for notification permission: it runs when the customer taps the button.
export const PushPrompt: React.FC = () => {
  const [state, setState] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void currentPushState().then((next) => {
      if (active) setState(next);
    });
    return () => {
      active = false;
    };
  }, []);

  const turnOn = async () => {
    if (busy) return;
    if (state === 'not-configured') {
      setMessage(NOT_SET_UP_MESSAGE);
      return;
    }
    setBusy(true);
    setMessage(null);
    const result = await enableOrderUpdates();
    setBusy(false);
    if (result.status === 'enabled') setState('granted');
    else if (result.status === 'denied') setState('denied');
    else if (result.status === 'unsupported') setState('unsupported');
    else if (result.status === 'not-configured') {
      setState('not-configured');
      setMessage(NOT_SET_UP_MESSAGE);
    } else if (result.status === 'error') setMessage(result.message);
  };

  const copy = (() => {
    switch (state) {
      case 'granted':
        return 'Order updates are on for this browser. We will tell you when your order moves along.';
      case 'denied':
        return 'Notifications are blocked for this site. Allow them in your browser settings to get order updates here.';
      case 'unsupported':
        return 'This browser cannot show notifications. Your order updates still appear in this list.';
      case 'not-configured':
        return 'Notifications are not set up yet. Your order updates still appear in this list.';
      default:
        return 'Get a message when your order is accepted, packed, out for delivery or delivered.';
    }
  })();

  const showButton = state === 'default' || state === 'not-configured';

  return (
    <section className="notif-prompt" aria-labelledby="notif-prompt-title">
      <span className="notif-prompt-icon" aria-hidden="true">
        <BellRing size={20} />
      </span>
      <div className="notif-prompt-copy">
        <h2 id="notif-prompt-title">Order updates</h2>
        <p>{copy}</p>
        {message && (
          <p className="notif-prompt-message" role="status">
            {message}
          </p>
        )}
      </div>
      {showButton && (
        <button
          type="button"
          className="notif-primary"
          onClick={() => void turnOn()}
          disabled={busy}
          aria-disabled={state === 'not-configured' ? true : undefined}
        >
          {busy ? 'Turning on...' : 'Turn on order updates'}
        </button>
      )}
    </section>
  );
};
