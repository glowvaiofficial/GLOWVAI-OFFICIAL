import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { useCartStore } from '../../../core/state/cartStore';
import type { BlockStyle, LookSettings } from '../../../../lib/shop/layoutStyle';
import { styleFamily } from '../../../../lib/shop/layoutStyle';
import { campaignPalette, countdownLabel, feedbackEnabled, vibrate } from '../lib/designerStyle';
import '../styles/designer-styles.css';

// The designer style options on the website homes (phone and PC). One provider wraps a home; each block is wrapped in
// <StyledBlock>. With no style and no look saved, both render their children untouched (no wrapper, no listeners), so the
// page is exactly what it was before.

interface Ctx {
  styles: Record<string, BlockStyle>;
  look: LookSettings | undefined;
  heroVideo: string | undefined;
  notify: (message: string, tick?: boolean) => void;
}
const DesignerCtx = createContext<Ctx>({ styles: {}, look: undefined, heroVideo: undefined, notify: () => undefined });
const BlockCtx = createContext<BlockStyle | undefined>(undefined);

export const useDesigner = (): Ctx => useContext(DesignerCtx);
// The style of the block the caller is drawn in (undefined outside a styled block).
export const useBlockStyle = (): BlockStyle | undefined => useContext(BlockCtx);
export const useLook = (): LookSettings | undefined => useContext(DesignerCtx).look;

// Modules the homes draw that belong to a designer block, so they take its style: the best sellers and new launches rows
// sit with the product rows.
export const MODULE_BLOCK: Record<string, string> = { bestsellers: 'product-rails', 'new-launches': 'product-rails' };
export const blockOfModule = (id: string): string => MODULE_BLOCK[id] ?? id;

type Toast = { id: number; message: string; tick: boolean };

export function DesignerStyleProvider({ styles, look, heroVideo, children }: { styles: Record<string, BlockStyle>; look: LookSettings | undefined; heroVideo?: string; children: React.ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const [bounce, setBounce] = useState(false);
  const seq = useRef(0);
  const timer = useRef<number | undefined>(undefined);
  const active = look !== undefined || Object.keys(styles).length > 0;

  const notify = useCallback((message: string, tick = false) => {
    seq.current += 1;
    setToast({ id: seq.current, message, tick });
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast(null), 2600);
  }, []);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const value = useMemo(() => ({ styles, look, heroVideo, notify }), [styles, look, heroVideo, notify]);
  if (!active) return <>{children}</>;

  const palette = campaignPalette(look?.campaign);
  const vars = palette ? ({ '--gvd-wash': palette.wash, '--gvd-tint': palette.tint, '--gvd-accent': palette.accent } as React.CSSProperties) : undefined;
  return (
    <DesignerCtx.Provider value={value}>
      <div className="gvd-root" data-gv-campaign={palette ? look?.campaign : undefined} data-gv-spinner={look?.spinner} data-gvd-bounce={bounce ? 'on' : undefined} style={vars}>
        {look !== undefined && <BagFeedback look={look} notify={notify} onBounce={setBounce} />}
        {children}
        {toast && (
          <div className="gvd-toast" role="status" aria-live="polite" key={toast.id}>
            {toast.tick && <CheckCircle2 size={16} aria-hidden="true" />}
            <span>{toast.message}</span>
          </div>
        )}
      </div>
    </DesignerCtx.Provider>
  );
}

// Watches the bag: when an item is added, shows the toast and tick, bounces the bag icon and vibrates, each only if its
// switch is on in the look. Renders nothing.
function BagFeedback({ look, notify, onBounce }: { look: LookSettings; notify: Ctx['notify']; onBounce: (on: boolean) => void }) {
  const count = useCartStore((s) => s.totalCount);
  const prev = useRef(count);
  useEffect(() => {
    const before = prev.current;
    prev.current = count;
    if (count <= before) return;
    const toastOn = feedbackEnabled(look, 'toast');
    const tickOn = feedbackEnabled(look, 'successTick');
    if (toastOn || tickOn) notify(toastOn ? 'Added to bag' : 'Done', tickOn);
    vibrate(look);
    if (feedbackEnabled(look, 'bagBounce')) {
      onBounce(true);
      const t = window.setTimeout(() => onBounce(false), 700);
      return () => window.clearTimeout(t);
    }
    return undefined;
  }, [count, look, notify, onBounce]);
  return null;
}

// "Sale ends in 2d 3h" for a block with countdownEndsAt. Hidden once the time is past.
function Countdown({ endsAt }: { endsAt: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);
  const label = countdownLabel(endsAt, now);
  if (!label) return null;
  return (
    <p className="gvd-countdown" role="timer">
      <span aria-hidden="true" className="gvd-countdown-dot" />
      Sale ends in <b>{label}</b>
    </p>
  );
}

// Wraps one homepage block with its style as data attributes (the CSS does the rest) and its context. display: contents, so
// the page layout is unchanged. Blocks with no style are returned as they are.
export function StyledBlock({ id, children }: { id: string; children: React.ReactNode }) {
  const { styles } = useDesigner();
  const blockId = blockOfModule(id);
  const s = styles[blockId];
  if (!s) return <>{children}</>;
  return (
    <BlockCtx.Provider value={s}>
      <div
        className="gvd-block"
        data-gv-block={blockId}
        data-gv-family={styleFamily(blockId)}
        data-gv-layout={s.layout && s.layout !== 'rail' && s.layout !== 'auto-slide' ? s.layout : undefined}
        data-gv-card={s.card}
        data-gv-motion={s.motion && s.motion !== 'none' ? s.motion : undefined}
        data-gv-skel={s.skeleton}
        data-gv-sticky={s.stickyHeader ? 'on' : undefined}
        data-gv-stockbar={s.stockBar ? 'on' : undefined}
        data-gv-badges={s.badges && s.badges.length > 0 ? 'on' : undefined}
      >
        {s.countdownEndsAt && <Countdown endsAt={s.countdownEndsAt} />}
        {children}
      </div>
    </BlockCtx.Provider>
  );
}

// A loading spinner in the look's shape (ring by default).
export function DesignerSpinner({ label = 'Loading' }: { label?: string }) {
  const spinner = useLook()?.spinner ?? 'ring';
  return (
    <span className={`gvd-spinner is-${spinner}`} role="status" aria-label={label}>
      {spinner === 'ring' ? null : [0, 1, 2].map((i) => <i key={i} style={{ '--i': i } as React.CSSProperties} />)}
    </span>
  );
}

// Confetti for the very first order, when the look turns it on. CSS only, short, and skipped for reduced motion. `orderKey`
// identifies the order so it fires once; `isFirstOrder` comes from the caller's real order count.
export function FirstOrderConfetti({ look, orderKey, isFirstOrder }: { look: LookSettings | undefined; orderKey: string; isFirstOrder: boolean }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (!isFirstOrder || !orderKey || !feedbackEnabled(look, 'confetti')) return;
    try {
      const flag = `gv-confetti-${orderKey}`;
      if (window.localStorage.getItem(flag)) return;
      window.localStorage.setItem(flag, '1');
    } catch {
      // Storage blocked: it still fires once for this view.
    }
    setShow(true);
    vibrate(look, 25);
    const t = window.setTimeout(() => setShow(false), 3200);
    return () => window.clearTimeout(t);
  }, [look, orderKey, isFirstOrder]);
  if (!show) return null;
  return (
    <div className="gvd-confetti" aria-hidden="true">
      {Array.from({ length: 28 }, (_, i) => (
        <i key={i} style={{ '--x': `${(i * 37) % 100}%`, '--d': `${(i % 7) * 0.12}s`, '--h': `${[212, 232, 262, 282, 190, 172][i % 6]}` } as React.CSSProperties} />
      ))}
    </div>
  );
}
