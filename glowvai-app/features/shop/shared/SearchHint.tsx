import React, { useEffect, useState } from 'react';
import { HINT_FADE_MS, HINT_INTERVAL_MS, SEARCH_HINTS, hintText, nextHintIndex } from './searchHints';

// The hint text inside the home search button. The button keeps its own aria-label, so the rotating text is
// not read out and never changes the search. With reduced motion there is no rotation: one static hint.
export function SearchHint({ hints }: { hints?: readonly string[] } = {}) {
  // Hints the admin set replace the built-in ones.
  const list = hints && hints.length > 0 ? hints : null;
  const count = list ? list.length : SEARCH_HINTS.length;
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let fadeTimer: number | undefined;
    const timer = window.setInterval(() => {
      setVisible(false);
      fadeTimer = window.setTimeout(() => {
        setIndex((i) => nextHintIndex(i, count));
        setVisible(true);
      }, HINT_FADE_MS);
    }, HINT_INTERVAL_MS);

    return () => {
      window.clearInterval(timer);
      if (fadeTimer !== undefined) window.clearTimeout(fadeTimer);
    };
  }, [count]);

  const i = index % count;
  return <span className={`shop-home-hint${visible ? ' is-visible' : ''}`}>{list ? hintText(list[i]) : `Search for ${SEARCH_HINTS[i]}...`}</span>;
}
