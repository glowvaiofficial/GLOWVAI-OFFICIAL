import { useEffect, useState } from 'react';
import { DESKTOP_MEDIA_QUERY } from '../lib/homeDevice';

// True on screens 1024px wide and more: the shop's browse, category, search and product pages then use their PC layout.
// Phones and tablets keep the layouts they always had. The first render is the phone one (no window on the server).
export function useIsPc(): boolean {
  const [pc, setPc] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia(DESKTOP_MEDIA_QUERY);
    const sync = () => setPc(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);
  return pc;
}
