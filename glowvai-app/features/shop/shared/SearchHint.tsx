import React, { useEffect, useState } from 'react';
import { HINT_FADE_MS, HINT_INTERVAL_MS, SEARCH_HINTS, nextHintIndex } from './searchHints';

// The hint text inside the home search button. The button keeps its own aria-label, so the rotating text is
// not read out and never changes the search. With reduced motion there is no rotation: one static hint.
export function SearchHint() {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let fadeTimer: number | undefined;
    const timer = window.setInterval(() => {
      setVisible(false);
      fadeTimer = window.setTimeout(() => {
        setIndex((i) => nextHintIndex(i, SEARCH_HINTS.length));
        setVisible(true);
      }, HINT_FADE_MS);
    }, HINT_INTERVAL_MS);

    return () => {
      window.clearInterval(timer);
      if (fadeTimer !== undefined) window.clearTimeout(fadeTimer);
    };
  }, []);

  return <span className={`shop-home-hint${visible ? ' is-visible' : ''}`}>Search for {SEARCH_HINTS[index]}...</span>;
}
