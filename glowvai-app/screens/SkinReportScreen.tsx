import React, { useEffect, useRef, useState } from 'react';
import { ArrowDown } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { HomeScreen } from './HomeScreen';
import type { SkinAnalysisResult } from '../core/services/skinModelService';
import { ScanHeader } from '../features/scan/components/ScanHeader';
import { ScanReportContent, ScanReportEmpty } from '../features/scan/ScanReportScreen';
import { loadLatestScanEntry } from '../features/scan/services/scanHistory';

// The skin report with the scan-to-commerce handoff: the customer's latest real scan, then a scroll cue,
// then the shop slides up and hands over to Home. Without a saved scan it shows an honest empty state.
// The older sample report from the face-capture flow is not shown: its values were placeholders.
export const SkinReportScreen: React.FC = () => {
  const { navigate, goBack } = useApp();
  const commerceRef = useRef<HTMLDivElement>(null);
  const [commerceVisible, setCommerceVisible] = useState(false);
  const [entry, setEntry] = useState<{ savedAt: number | null; result: SkinAnalysisResult } | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    loadLatestScanEntry().then((latest) => {
      if (!active) return;
      setEntry(latest);
      setLoaded(true);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('glowvai:commerce-reveal', { detail: { visible: false } }));
    const target = commerceRef.current;
    if (!target) return;
    // Phones scroll inside .screen-content; tablet and desktop scroll the page.
    const wide = window.matchMedia('(min-width: 720px)').matches;
    const root = wide ? null : target.closest('.screen-content');
    let timer: ReturnType<typeof setTimeout> | undefined;
    const observer = new IntersectionObserver(([observed]) => {
      if (!observed.isIntersecting) return;
      setCommerceVisible(true);
      window.dispatchEvent(new CustomEvent('glowvai:commerce-reveal', { detail: { visible: true } }));
      timer = setTimeout(() => navigate('home'), 1150);
      observer.disconnect();
    }, { root, threshold: 0.1, rootMargin: '0px 0px -72px 0px' });
    observer.observe(target);
    return () => {
      observer.disconnect();
      if (timer) clearTimeout(timer);
      window.dispatchEvent(new CustomEvent('glowvai:commerce-reveal', { detail: { visible: false } }));
    };
  }, [navigate, entry]);

  return (
    <main className="scan-screen skin-report-screen">
      <ScanHeader title="Your skin report" subtitle={entry ? 'Cosmetic skin assessment' : undefined} onBack={goBack} />
      {!loaded ? null : !entry ? (
        <ScanReportEmpty />
      ) : (
        <>
          <div className="scan-body scan-report-body">
            <ScanReportContent result={entry.result} savedAt={entry.savedAt} />
            <button
              type="button"
              className="skin-report-cue"
              onClick={() => commerceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            >
              <span>Scroll to shop your routine</span>
              <ArrowDown size={18} aria-hidden="true" />
            </button>
          </div>

          <div ref={commerceRef} className={`commerce-reveal ${commerceVisible ? 'is-revealed' : 'is-awaiting'}`}>
            <div className="commerce-color-wash" aria-hidden="true" />
            <div className="commerce-reveal-handle" aria-hidden="true" />
            <HomeScreen embedded />
          </div>
        </>
      )}
    </main>
  );
};
