import React, { useEffect, useRef, useState } from 'react';
import { ArrowDown } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ShopHomeScreen } from '../features/shop/screens/ShopHomeScreen';
import { ScanHeader } from '../features/scan/components/ScanHeader';
import { ScanResultView } from '../features/scan/components/ScanResultView';
import { ScanReportEmpty, useLatestScanResult } from '../features/scan/ScanReportScreen';
import '../responsive/entry-scan.css';

// Shows the latest real skin analysis (the same result as scan-report) and then reveals the shop below it.
// Without a completed analysis it shows an empty state; no sample or placeholder scores are ever shown.
export const SkinReportScreen: React.FC = () => {
  const { navigate, goBack } = useApp();
  const { result, loaded } = useLatestScanResult();
  const commerceRef = useRef<HTMLDivElement>(null);
  const [commerceVisible, setCommerceVisible] = useState(false);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('glowvai:commerce-reveal', { detail: { visible: false } }));
    const target = commerceRef.current;
    if (!target) return;
    // Phones scroll inside .screen-content; tablet and desktop scroll the page.
    const wide = window.matchMedia('(min-width: 720px)').matches;
    const root = wide ? null : target.closest('.screen-content');
    let timer: ReturnType<typeof setTimeout> | undefined;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
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
  }, [navigate, result]);

  return (
    <div className="scan-screen scan-report-screen skin-report-screen">
      <ScanHeader title="Your skin report" subtitle="Cosmetic skin assessment" onBack={goBack} />
      {loaded && (
        <div className={`scan-body scan-report-body${result ? '' : ' scan-empty'}`}>
          {result ? (
            <>
              <ScanResultView result={result} onRetake={() => navigate('face-prep')} />
              <p className="skin-report-cue">
                <ArrowDown size={16} /> Scroll down to keep shopping
              </p>
            </>
          ) : (
            <ScanReportEmpty />
          )}
        </div>
      )}

      {result && (
        <div ref={commerceRef} className={`commerce-reveal ${commerceVisible ? 'is-revealed' : 'is-awaiting'}`}>
          <div className="commerce-color-wash" aria-hidden="true" />
          <div className="commerce-reveal-handle" aria-hidden="true" />
          <ShopHomeScreen embedded />
        </div>
      )}
    </div>
  );
};
