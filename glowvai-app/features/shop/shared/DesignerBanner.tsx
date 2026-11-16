import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, ExternalLink, Sparkles, X } from 'lucide-react';
import { useBlockStyle, useDesigner } from './DesignerStyle';

// The banner layouts of the designer for the hero carousel, on both homes. The carousel keeps its own markup and timer;
// this adds what a layout needs (arrows, progress bars, story circles with a full-screen slide, the video) and tells the
// CSS which layout is on (data-gv-layout on the block wrapper).

export type BannerSlide = { title: string; image: string; onOpen: () => void };

const reduced = (): boolean => {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
};

// The hero's layout. `video` falls back to the default slide show when no video address is set.
export function useHeroDesign(): { layout: string | undefined; video: string | undefined } {
  const style = useBlockStyle();
  const { heroVideo } = useDesigner();
  const layout = style?.layout === 'video' && !heroVideo ? undefined : style?.layout;
  return { layout, video: layout === 'video' ? heroVideo : undefined };
}

export function HeroVideo({ src }: { src: string }) {
  const [failed, setFailed] = useState(false);
  // People who prefer reduced motion do not get an autoplaying video: the slide's picture shows instead.
  if (failed || reduced()) return null;
  return <video className="gvd-hero-video" src={src} muted loop autoPlay playsInline preload="metadata" aria-hidden="true" onError={() => setFailed(true)} />;
}

export function HeroExtras({ layout, slides, current, onGo, ms, nativeArrows = false }: { layout: string | undefined; slides: BannerSlide[]; current: number; onGo: (index: number) => void; ms: number; nativeArrows?: boolean }) {
  const [story, setStory] = useState<number | null>(null);
  const count = slides.length;
  if (layout === 'arrows' && count > 1 && !nativeArrows) {
    return (
      <>
        <button type="button" className="gvd-arrow is-prev" onClick={() => onGo((current - 1 + count) % count)} aria-label="Previous slide">
          <ChevronLeft size={20} aria-hidden="true" />
        </button>
        <button type="button" className="gvd-arrow is-next" onClick={() => onGo((current + 1) % count)} aria-label="Next slide">
          <ChevronRight size={20} aria-hidden="true" />
        </button>
      </>
    );
  }
  if (layout === 'progress-bars' && count > 1) {
    return (
      <div className="gvd-bars" role="group" aria-label="Choose a slide" style={{ '--gvd-ms': `${ms}ms` } as React.CSSProperties}>
        {slides.map((s, i) => (
          <button key={i} type="button" className={i < current ? 'is-done' : i === current ? 'is-on' : ''} onClick={() => onGo(i)} aria-label={`Show slide ${i + 1}: ${s.title}`} aria-current={i === current}>
            <span key={i === current ? `on-${current}` : 'off'} />
          </button>
        ))}
      </div>
    );
  }
  if (layout === 'story-strip') {
    return (
      <>
        <div className="gvd-stories" role="list" aria-label="Stories">
          {slides.map((s, i) => (
            <button key={i} type="button" role="listitem" className="gvd-story" onClick={() => setStory(i)} aria-label={`Open story: ${s.title}`}>
              <span className="gvd-story-ring">{s.image ? <img src={s.image} alt="" loading="lazy" decoding="async" /> : <Sparkles size={22} aria-hidden="true" />}</span>
              <span className="gvd-story-label">{s.title}</span>
            </button>
          ))}
        </div>
        {story !== null && <StoryViewer slides={slides} start={story} onClose={() => setStory(null)} />}
      </>
    );
  }
  return null;
}

// Full-screen story: one slide at a time (picture, title, an Open button), tap the right or left half to move, Escape or
// the close button to leave. Moves on by itself every 5 seconds unless the visitor prefers reduced motion.
function StoryViewer({ slides, start, onClose }: { slides: BannerSlide[]; start: number; onClose: () => void }) {
  const [i, setI] = useState(start);
  const last = slides.length - 1;
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') setI((n) => Math.min(last, n + 1));
      if (e.key === 'ArrowLeft') setI((n) => Math.max(0, n - 1));
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [last, onClose]);
  useEffect(() => {
    if (reduced()) return;
    const t = window.setTimeout(() => (i < last ? setI(i + 1) : onClose()), 5000);
    return () => window.clearTimeout(t);
  }, [i, last, onClose]);
  const s = slides[i]!;
  return (
    <div className="gvd-story-view" role="dialog" aria-modal="true" aria-label={`Story: ${s.title}`}>
      <div className="gvd-story-bars" aria-hidden="true">
        {slides.map((_, n) => (
          <span key={n} className={n < i ? 'is-done' : n === i ? 'is-on' : ''}>
            <span />
          </span>
        ))}
      </div>
      <button type="button" className="gvd-story-close" onClick={onClose} aria-label="Close story">
        <X size={22} aria-hidden="true" />
      </button>
      {s.image ? <img className="gvd-story-img" src={s.image} alt="" /> : <span className="gvd-story-blank" aria-hidden="true" />}
      <button type="button" className="gvd-story-prev" onClick={() => setI(Math.max(0, i - 1))} aria-label="Previous story" />
      <button type="button" className="gvd-story-next" onClick={() => (i < last ? setI(i + 1) : onClose())} aria-label="Next story" />
      <div className="gvd-story-copy">
        <strong>{s.title}</strong>
        <button
          type="button"
          onClick={() => {
            onClose();
            s.onOpen();
          }}
        >
          Open <ExternalLink size={15} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
