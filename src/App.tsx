import { lazy, Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { MotionConfig } from 'framer-motion';
import { ChevronDown, ChevronUp } from 'lucide-react';
import Header from './components/Header';
import ControlPanel from './components/ControlPanel';
import RiskPanel from './components/RiskPanel';
import ModelCard from './components/ModelCard';
import ErrorBoundary from './components/ErrorBoundary';
import { riskScore, patients, patientInput, nearestNeighbors } from './lib/analytics';
import { baselineInput, decodeState, encodeState, type AppState } from './lib/urlState';
import { hasWebGL, useMediaQuery, usePrefersReducedMotion } from './lib/hooks';
import type { Feature } from './data/patients';

const Scene = lazy(() => import('./components/Scene'));

const RAIL_WIDTH = 300;
const RAIL_GAP = 12;

function SceneMessage({ title, body }: { title: string; body: string }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center p-8">
      <div className="max-w-sm text-center">
        <p className="font-display text-sm font-semibold text-gray-200">{title}</p>
        <p className="mt-1 text-[12px] leading-relaxed text-gray-500">{body}</p>
      </div>
    </div>
  );
}

function SceneLoader() {
  return (
    <div className="absolute inset-0 flex items-center justify-center" role="status">
      <div className="flex items-center gap-3 text-[12px] text-gray-400">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-vital-400/30 border-t-vital-400" aria-hidden />
        Loading 3D cohort…
      </div>
    </div>
  );
}

export default function App() {
  const [state, setState] = useState<AppState>(() => decodeState(window.location.hash));
  const { view, input, showUser } = state;
  const [source, setSource] = useState<number | null>(null);
  const [modelCardOpen, setModelCardOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<'explore' | 'simulate'>('explore');
  const [sheetOpen, setSheetOpen] = useState(true);
  const [sheetHeight, setSheetHeight] = useState(0);
  const sheetRef = useRef<HTMLDivElement>(null);

  const isDesktop = useMediaQuery('(min-width: 768px)');
  const reducedMotion = usePrefersReducedMotion();
  const webgl = useMemo(() => hasWebGL(), []);

  const userRisk = useMemo(() => riskScore(input), [input]);
  const neighbors = useMemo(() => nearestNeighbors(input, 5, source), [input, source]);
  const neighborIdx = useMemo(() => neighbors.map((n) => n.index), [neighbors]);

  // Keep the URL shareable: mirror state into the hash (debounced) and follow pasted links.
  useEffect(() => {
    const t = setTimeout(() => {
      window.history.replaceState(null, '', `#${encodeState(state)}`);
    }, 250);
    return () => clearTimeout(t);
  }, [state]);
  useEffect(() => {
    const onHash = () => {
      setState(decodeState(window.location.hash));
      setSource(null);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // Track the phone bottom sheet's height so the 3D scene can centre above it.
  useLayoutEffect(() => {
    const el = sheetRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSheetHeight(el.getBoundingClientRect().height));
    ro.observe(el);
    return () => ro.disconnect();
  }, [isDesktop]);

  // Re-centre the scene in the area the HUD leaves free (right rail on desktop; header +
  // bottom sheet on phones) and tell it how big that area is for the initial framing.
  const MOBILE_HEADER = 70;
  const viewOffset = isDesktop
    ? { x: (RAIL_WIDTH + RAIL_GAP) / 2, y: 0 }
    : { x: 0, y: Math.max(0, (sheetHeight - MOBILE_HEADER) / 2) };
  const frame = isDesktop
    ? { visibleW: window.innerWidth - RAIL_WIDTH - RAIL_GAP, visibleH: window.innerHeight }
    : sheetHeight
      ? { visibleW: window.innerWidth, visibleH: window.innerHeight - sheetHeight - MOBILE_HEADER }
      : null;

  const setView = (v: AppState['view']) => setState((s) => ({ ...s, view: v }));
  const setShowUser = (b: boolean) => setState((s) => ({ ...s, showUser: b }));
  const setFeature = (f: Feature, v: number) => {
    setSource(null);
    setState((s) => ({ ...s, input: { ...s.input, [f]: v } }));
  };
  const randomize = () => {
    const i = Math.floor(Math.random() * patients.length);
    setSource(i);
    setState((s) => ({ ...s, input: patientInput(patients[i]), showUser: true }));
  };
  const reset = () => {
    setSource(null);
    setState((s) => ({ ...s, input: baselineInput() }));
  };

  const controlPanel = <ControlPanel view={view} setView={setView} />;
  const riskPanel = (
    <RiskPanel
      input={input}
      setFeature={setFeature}
      risk={userRisk}
      showUser={showUser}
      setShowUser={setShowUser}
      onRandomize={randomize}
      onReset={reset}
      source={source}
      neighbors={neighbors}
      webgl={webgl}
      reducedMotion={reducedMotion}
    />
  );

  return (
    <MotionConfig reducedMotion="user">
      <div className="relative h-dvh w-screen overflow-hidden">
        {/* 3D canvas fills the viewport */}
        {webgl ? (
          <ErrorBoundary
            fallback={<SceneMessage title="The 3D view failed to start" body="Your GPU or browser refused the WebGL context. The risk simulator still works." />}
          >
            <Suspense fallback={<SceneLoader />}>
              <Scene
                colorMode={view.colorMode}
                posMode={view.posMode}
                axes={view.axes}
                k={view.k}
                showUser={showUser}
                input={input}
                userRisk={userRisk}
                neighbors={neighborIdx}
                viewOffset={viewOffset}
                frame={frame}
                reducedMotion={reducedMotion}
              />
            </Suspense>
          </ErrorBoundary>
        ) : (
          <SceneMessage title="3D view unavailable" body="This browser doesn't support WebGL, so the patient cloud can't be drawn. The risk simulator still works." />
        )}

        {/* Vignette for legibility */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(ellipse at center, transparent 45%, rgba(7,8,9,0.65) 100%)' }}
        />

        {/* HUD overlay */}
        <div className="pointer-events-none absolute inset-0 z-10">
          <div className="absolute left-3 right-3 top-3 md:left-4 md:right-auto md:top-4" style={isDesktop ? { maxWidth: `calc(100% - ${RAIL_WIDTH + RAIL_GAP * 3}px)` } : undefined}>
            <Header onOpenModelCard={() => setModelCardOpen(true)} />
          </div>

          {isDesktop ? (
            <>
              <p className="absolute bottom-4 left-4 max-w-[290px] text-[10px] leading-relaxed text-gray-500">
                Data: UCI Heart Disease (Cleveland), Detrano et&nbsp;al. · {patients.length} patients ·
                risk model &amp; PCA/k-means computed in-browser. Educational demo — not a diagnostic tool.
              </p>
              {/* Right control rail — one scroll container, only as tall as its content so it
                  never blocks orbiting in the empty space below the panels. */}
              <div
                className="rail pointer-events-auto absolute right-3 top-4 flex max-h-[calc(100%-2rem)] flex-col gap-3 overflow-y-auto pr-1.5"
                style={{ width: RAIL_WIDTH }}
              >
                {controlPanel}
                {riskPanel}
              </div>
            </>
          ) : (
            <div
              ref={sheetRef}
              className="glass pointer-events-auto absolute inset-x-0 bottom-0 flex flex-col rounded-t-2xl border-b-0"
              style={{ maxHeight: sheetOpen ? '52dvh' : undefined }}
            >
              <div className="flex items-center gap-1 p-2" role="tablist" aria-label="Panels">
                {(['explore', 'simulate'] as const).map((t) => (
                  <button
                    key={t}
                    role="tab"
                    aria-selected={mobileTab === t}
                    onClick={() => { setMobileTab(t); setSheetOpen(true); }}
                    className={`flex-1 rounded-lg px-3 py-2 text-[12px] font-medium capitalize transition ${
                      mobileTab === t && sheetOpen ? 'bg-vital-400/15 text-vital-300' : 'text-gray-400'
                    }`}
                  >
                    {t === 'simulate' ? `Simulate · ${(userRisk * 100).toFixed(0)}%` : t}
                  </button>
                ))}
                <button
                  onClick={() => setSheetOpen(!sheetOpen)}
                  aria-label={sheetOpen ? 'Collapse panel' : 'Expand panel'}
                  aria-expanded={sheetOpen}
                  className="rounded-lg p-2 text-gray-400"
                >
                  {sheetOpen ? <ChevronDown size={16} aria-hidden /> : <ChevronUp size={16} aria-hidden />}
                </button>
              </div>
              {sheetOpen && (
                <div className="rail min-h-0 flex-1 overflow-y-auto px-2 pb-3" role="tabpanel">
                  {mobileTab === 'explore' ? controlPanel : riskPanel}
                  <p className="mt-3 px-2 text-[10px] leading-relaxed text-gray-500">
                    Data: UCI Heart Disease (Cleveland), Detrano et&nbsp;al. Educational demo — not a diagnostic tool.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <ModelCard open={modelCardOpen} onClose={() => setModelCardOpen(false)} />
      </div>
    </MotionConfig>
  );
}
