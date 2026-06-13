import { useMemo, useState } from 'react';
import Scene from './components/Scene';
import Header from './components/Header';
import ControlPanel from './components/ControlPanel';
import RiskPanel from './components/RiskPanel';
import { riskScore, patients } from './lib/analytics';
import { FEATURE_META } from './data/features';
import { FEATURES } from './data/patients';
import type { Feature } from './data/patients';
import type { ViewState } from './types';

function baselineInput(): Record<Feature, number> {
  return Object.fromEntries(FEATURES.map((f) => [f, FEATURE_META[f].default])) as Record<Feature, number>;
}

export default function App() {
  const [view, setView] = useState<ViewState>({
    colorMode: 'diagnosis',
    posMode: 'pca',
    axes: { x: 'age', y: 'thalach', z: 'chol' },
    k: 3,
  });
  const [hovered, setHovered] = useState<number | null>(null);
  const [input, setInput] = useState<Record<Feature, number>>(baselineInput());
  const [showUser, setShowUser] = useState(true);

  const userRisk = useMemo(() => riskScore(input), [input]);

  const randomize = () => {
    const p = patients[Math.floor(Math.random() * patients.length)];
    setInput(Object.fromEntries(FEATURES.map((f) => [f, p[f]])) as Record<Feature, number>);
    setShowUser(true);
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      {/* 3D canvas fills the viewport */}
      <div className="absolute inset-0">
        <Scene
          colorMode={view.colorMode}
          posMode={view.posMode}
          axes={view.axes}
          k={view.k}
          hovered={hovered}
          setHovered={setHovered}
          showUser={showUser}
          input={input}
          userRisk={userRisk}
        />
      </div>

      {/* Vignette for legibility */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(ellipse at center, transparent 45%, rgba(7,8,9,0.65) 100%)' }}
      />

      {/* HUD overlay */}
      <div className="pointer-events-none absolute inset-0 p-4">
        {/* Header — top left */}
        <div className="absolute left-4 top-4">
          <Header />
        </div>

        {/* Citation — bottom left */}
        <p className="absolute bottom-4 left-4 max-w-[290px] text-[10px] leading-relaxed text-gray-500">
          Data: UCI Heart Disease (Cleveland), Detrano et&nbsp;al. · 297 patients ·
          risk model &amp; PCA/k-means computed in-browser. Educational demo — not a diagnostic tool.
        </p>

        {/* Right control rail — single scroll container so nothing falls off short screens */}
        <div className="pointer-events-auto absolute right-3 top-4 bottom-4 flex w-[300px] flex-col gap-3 overflow-y-auto pr-1.5">
          <ControlPanel view={view} setView={setView} />
          <RiskPanel
            input={input}
            setInput={setInput}
            risk={userRisk}
            showUser={showUser}
            setShowUser={setShowUser}
            onRandomize={randomize}
            onReset={() => setInput(baselineInput())}
          />
        </div>
      </div>
    </div>
  );
}
