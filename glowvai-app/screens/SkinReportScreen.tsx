import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowLeft, ChevronDown, CircleDot, Droplets, ShoppingBag, Sparkles, SunMedium } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { HomeScreen } from './HomeScreen';
import '../responsive/entry-scan.css';

export const SkinReportScreen: React.FC = () => {
  const { activeReport, navigate, goBack } = useApp();
  const commerceRef = useRef<HTMLDivElement>(null);
  const [commerceVisible, setCommerceVisible] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  // No invented report: without a completed scan the screen shows an empty state instead.
  const report = activeReport;

  const signals = useMemo(() => report?.observations.slice(0, 4) ?? [], [report]);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('glowvai:commerce-reveal', { detail: { visible: false } }));
    const target = commerceRef.current;
    // Phones scroll inside .screen-content; tablet and desktop scroll the page.
    const wide = window.matchMedia('(min-width: 720px)').matches;
    const root = wide ? null : target?.closest('.screen-content');
    if (!target) return;
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
  }, [navigate]);

  const iconFor = (name: string) => name.toLowerCase().includes('hydrat') ? <Droplets /> : name.toLowerCase().includes('texture') ? <Sparkles /> : name.toLowerCase().includes('bright') || name.toLowerCase().includes('dark') ? <SunMedium /> : <CircleDot />;
  const shopRecommendations = () => commerceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  if (!report) {
    return (
      <main className="skin-dashboard">
        <section className="skin-dashboard-sheet">
          <button type="button" onClick={goBack} aria-label="Go back" style={{ display: 'grid', placeItems: 'center', width: 40, height: 40, marginBottom: 8, border: 0, borderRadius: 12, background: '#eef1f6', color: '#111827' }}><ArrowLeft size={20} /></button>
          <header className="skin-dashboard-title">
            <div><span>NO SCAN YET</span><h1>No skin report yet</h1><p>Scan your face to get a beauty guide. It is not a medical diagnosis.</p></div>
          </header>
          <button className="commerce-empty-cta" onClick={() => navigate('face-prep')}>Start skin scan</button>
        </section>
      </main>
    );
  }

  return (
    <main className="skin-dashboard">
      <section className="skin-dashboard-sheet">
        <header className="skin-dashboard-title">
          <div><span>SCAN COMPLETE</span><h1>Your skin today</h1><p>A quick beauty guide, not a medical diagnosis.</p></div>
          <time>{report.timestamp}</time>
        </header>
        {report.isSample && <p role="note" className="skin-sample-notice">Sample result. The skin analysis engine is not connected yet, so these scores are placeholders.</p>}

        <section className="skin-gauge" aria-label={`Skin score ${report.skinScore} out of 100`}>
          <div className="skin-gauge-labels"><span>Needs care</span><span>Fair</span><span>Healthy glow</span></div>
          <svg viewBox="0 0 260 142" role="img" aria-hidden="true">
            <path className="skin-gauge-track" d="M30 124 A100 100 0 0 1 230 124" pathLength="100" />
            <path className="skin-gauge-progress" d="M30 124 A100 100 0 0 1 230 124" pathLength="100" style={{ '--report-score': report.skinScore } as React.CSSProperties} />
          </svg>
          <div className="skin-gauge-score"><b>{report.skinScore}</b><span>/100</span><small>{report.skinScore >= 75 ? 'Your skin looks well balanced' : 'A simple routine can help'}</small></div>
        </section>

        <div className="skin-summary" aria-label="Report summary">
          <div><small>Skin type</small><b>{report.skinType}</b></div>
          <div><small>Skin tone</small><b>{report.skinTone}</b></div>
          <div><small>Analysed</small><b>Today</b></div>
        </div>

        <section className="skin-insights" aria-labelledby="skin-signals-title">
          <div className="skin-zone-card">
            <h2>Your face zones</h2>
            <div className="skin-face-map" aria-label="Illustration of forehead, T-zone, and cheek areas">
              <span className="skin-face-outline" />
              <span className="skin-zone skin-zone-forehead">Forehead</span>
              <span className="skin-zone skin-zone-t">T-zone</span>
              <span className="skin-zone skin-zone-left" />
              <span className="skin-zone skin-zone-right">Cheeks</span>
            </div>
          </div>

          <div className="skin-signal-card">
            <div className="skin-section-heading"><h2 id="skin-signals-title">Key signals</h2><span>{signals.length} checked</span></div>
            <div className="skin-signal-list">
              {signals.map((item, index) => {
                const good = item.severity === 'low';
                return <div className={`skin-signal${good ? ' is-good' : ' is-watch'}`} key={item.name} style={{ '--signal-order': index } as React.CSSProperties}>
                  <span className="skin-signal-icon">{iconFor(item.name)}</span>
                  <div><b>{item.name}</b><span><i style={{ width: `${item.score}%` }} /></span></div>
                  <em>{good ? 'Good' : 'Watch'}</em>
                </div>;
              })}
            </div>
          </div>
        </section>

        <section className="skin-routine" aria-labelledby="routine-title">
          <div className="skin-section-heading"><div><h2 id="routine-title">Your routine</h2><p>Three steps are enough to start.</p></div></div>
          <div className="skin-routine-grid">
            <div><strong>Morning <SunMedium size={17} /></strong><ol><li><span>1</span>Cleanse</li><li><span>2</span>Treat</li><li><span>3</span>Protect</li></ol></div>
            <div><strong>Evening <Sparkles size={17} /></strong><ol><li><span>1</span>Cleanse</li><li><span>2</span>Treat</li><li><span>3</span>Moisturise</li></ol></div>
          </div>
        </section>

        <button className="skin-shop-cta" onClick={shopRecommendations}><ShoppingBag size={20} /><span>Shop your recommendations</span><ArrowDown size={19} /></button>
        <button className={`skin-details-toggle${detailsOpen ? ' is-open' : ''}`} onClick={() => setDetailsOpen((value) => !value)} aria-expanded={detailsOpen}>See full details <ChevronDown size={17} /></button>
        {detailsOpen && <div className="skin-details-panel">{signals.map((item) => <p key={item.name}><b>{item.name}:</b> {item.notes}</p>)}<p><b>Useful ingredients:</b> {report.recommendedIngredients.join(', ')}.</p></div>}
        <div className="skin-scroll-hint"><span /><p>Scroll down to reveal your matched shop</p><span /></div>
      </section>

      <div ref={commerceRef} className={`commerce-reveal ${commerceVisible ? 'is-revealed' : 'is-awaiting'}`}>
        <div className="commerce-color-wash" aria-hidden="true" />
        <div className="commerce-reveal-handle" aria-hidden="true" />
        <HomeScreen embedded />
      </div>
    </main>
  );
};
