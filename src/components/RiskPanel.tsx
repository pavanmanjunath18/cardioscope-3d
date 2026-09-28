import { lazy, Suspense, useId } from 'react';
import { motion } from 'framer-motion';
import { Shuffle, RotateCcw, Eye, EyeOff, Users } from 'lucide-react';
import { FEATURE_META } from '../data/features';
import {
  FEATURES,
  patients,
  riskBand,
  riskColor,
  riskContributions,
  RISK_HIGH,
  RISK_LOW,
  type Input,
} from '../lib/analytics';
import type { Feature } from '../data/patients';
import ErrorBoundary from './ErrorBoundary';

const Heart = lazy(() => import('./Heart'));

interface Props {
  input: Input;
  setFeature: (f: Feature, v: number) => void;
  risk: number;
  showUser: boolean;
  setShowUser: (b: boolean) => void;
  onRandomize: () => void;
  onReset: () => void;
  /** Index of the real patient currently loaded into the simulator, if any. */
  source: number | null;
  neighbors: { index: number; distance: number }[];
  webgl: boolean;
  reducedMotion: boolean;
}

const fmtValue = (f: Feature, v: number) => (FEATURE_META[f].step < 1 ? v.toFixed(1) : String(v));

function Control({ f, value, onChange }: { f: Feature; value: number; onChange: (v: number) => void }) {
  const m = FEATURE_META[f];
  const id = useId();
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-[11px]">
        <label htmlFor={id} className="text-gray-300" title={m.desc}>{m.name}</label>
        {m.kind === 'numeric' && (
          <span className="font-mono text-vital-300" aria-hidden="true">
            {fmtValue(f, value)}{m.unit ? <span className="text-gray-500"> {m.unit}</span> : null}
          </span>
        )}
      </div>
      {m.kind === 'numeric' ? (
        <input
          id={id}
          type="range" min={m.min} max={m.max} step={m.step} value={value}
          aria-valuetext={`${fmtValue(f, value)}${m.unit ? ' ' + m.unit : ''}`}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full"
        />
      ) : (
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="rounded-md px-2 py-1.5 text-[11px] outline-none focus-visible:border-vital-400/60"
        >
          {m.options!.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      )}
    </div>
  );
}

function StaticHeart({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 24 24" className="mx-auto h-full w-auto opacity-80" aria-hidden="true">
      <path fill={color} d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.7 4.5c2.1 0 3.6 1.2 4.3 2.5.7-1.3 2.2-2.5 4.3-2.5 3.7 0 5.8 3.9 4.3 7.3C19.5 16.4 12 21 12 21z" />
    </svg>
  );
}

export default function RiskPanel({
  input, setFeature, risk, showUser, setShowUser, onRandomize, onReset, source, neighbors, webgl, reducedMotion,
}: Props) {
  const band = riskBand(risk);
  const color = riskColor(risk);
  const contribs = riskContributions(input).slice(0, 6);
  const maxAbs = Math.max(...contribs.map((c) => Math.abs(c.contribution)), 0.01);
  const neighborDisease = neighbors.filter((n) => patients[n.index].disease).length;
  const pct = `${(risk * 100).toFixed(0)}%`;

  return (
    <motion.section
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.15 }}
      className="glass pointer-events-auto flex w-full shrink-0 flex-col rounded-2xl"
      aria-label="Cardiac risk simulator"
    >
      {/* Heart + readout */}
      <div className="relative px-4 pt-4">
        <h2 className="label-eyebrow mb-1">Cardiac risk simulator</h2>
        <div className="relative h-[150px]">
          <ErrorBoundary fallback={<StaticHeart color={color} />}>
            {webgl ? (
              <Suspense fallback={<StaticHeart color={color} />}>
                <Heart risk={risk} reducedMotion={reducedMotion} />
              </Suspense>
            ) : (
              <StaticHeart color={color} />
            )}
          </ErrorBoundary>
          <div
            className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"
            role="status"
            aria-live="polite"
          >
            <span className="risk-readout font-display text-4xl font-bold tabular-nums text-white">
              {(risk * 100).toFixed(0)}<span className="text-xl">%</span>
            </span>
            <span
              className="mt-1 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
              style={{ color: band.color }}
            >
              {band.label}
            </span>
          </div>
        </div>
        <p className="mt-1 text-center text-[10px] leading-snug text-gray-500">
          Logistic-regression probability of heart disease.
          ≥50% is the model's “disease” prediction.
        </p>
      </div>

      <div className="mx-4 mt-3 flex gap-2">
        <button
          onClick={() => setShowUser(!showUser)}
          aria-pressed={showUser}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-2 py-1.5 text-[11px] font-medium transition ${
            showUser ? 'border-vital-400/40 bg-vital-400/10 text-vital-300' : 'border-white/10 text-gray-400 hover:text-gray-200'
          }`}
        >
          {showUser ? <Eye size={12} aria-hidden /> : <EyeOff size={12} aria-hidden />} Plot in 3D
        </button>
        <button
          onClick={onRandomize}
          className="rounded-lg border border-white/10 px-2.5 py-1.5 text-gray-400 transition hover:text-gray-200"
          title="Load a random real patient"
          aria-label="Load a random real patient"
        >
          <Shuffle size={13} aria-hidden />
        </button>
        <button
          onClick={onReset}
          className="rounded-lg border border-white/10 px-2.5 py-1.5 text-gray-400 transition hover:text-gray-200"
          title="Reset to cohort baseline"
          aria-label="Reset to cohort baseline"
        >
          <RotateCcw size={13} aria-hidden />
        </button>
      </div>

      {source !== null && (
        <div className="mx-4 mt-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[10.5px] leading-snug text-gray-400">
          Loaded <span className="font-semibold text-gray-200">patient #{source + 1}</span> — actual diagnosis:{' '}
          <span className="font-semibold" style={{ color: patients[source].disease ? RISK_HIGH : RISK_LOW }}>
            {patients[source].disease ? 'disease' : 'healthy'}
          </span>
          . Model says {pct}.
        </div>
      )}

      {/* Top contributing factors */}
      <div className="mx-4 mt-3 rounded-xl bg-white/[0.03] p-3">
        <h3 className="label-eyebrow mb-2">What drives this score</h3>
        <ul className="flex flex-col gap-1.5">
          {contribs.map((c) => {
            const half = (Math.abs(c.contribution) / maxAbs) * 50;
            const up = c.contribution > 0;
            return (
              <li key={c.feature} className="flex items-center gap-2 text-[10.5px]">
                <span className="w-[74px] shrink-0 truncate text-gray-400" title={FEATURE_META[c.feature].name}>
                  {FEATURE_META[c.feature].label}
                </span>
                <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-white/5" aria-hidden="true">
                  <div
                    className="absolute top-0 h-2 rounded-full"
                    style={{
                      width: `${half}%`,
                      [up ? 'left' : 'right']: '50%',
                      background: up ? RISK_HIGH : RISK_LOW,
                    }}
                  />
                  <div className="absolute left-1/2 top-0 h-2 w-px bg-white/25" />
                </div>
                <span
                  className="w-9 shrink-0 text-right font-mono tabular-nums"
                  style={{ color: up ? RISK_HIGH : RISK_LOW }}
                >
                  {up ? '+' : '−'}{Math.abs(c.contribution).toFixed(2)}
                </span>
              </li>
            );
          })}
        </ul>
        <p className="mt-2 text-[9.5px] leading-snug text-gray-500">
          Log-odds contribution <em>compared with the average patient</em> in the cohort.{' '}
          <span className="text-risk-high">Rose</span> raises risk, <span className="text-risk-low">blue</span> lowers it.
        </p>
      </div>

      {/* Nearest real patients */}
      {neighbors.length > 0 && (
        <div className="mx-4 mt-3 rounded-xl bg-white/[0.03] p-3">
          <h3 className="label-eyebrow mb-1.5 flex items-center gap-1.5">
            <Users size={11} aria-hidden /> Most similar real patients
          </h3>
          <p className="mb-1.5 text-[10.5px] text-gray-300">
            <span className="font-semibold text-white">{neighborDisease} of {neighbors.length}</span> had heart disease.
          </p>
          <ul className="grid grid-cols-1 gap-0.5 font-mono text-[10px] text-gray-400">
            {neighbors.map((n) => {
              const p = patients[n.index];
              return (
                <li key={n.index} className="flex justify-between">
                  <span>#{n.index + 1} · {p.age}y {p.sex ? 'M' : 'F'}</span>
                  <span style={{ color: p.disease ? RISK_HIGH : RISK_LOW }}>{p.disease ? 'disease' : 'healthy'}</span>
                </li>
              );
            })}
          </ul>
          <p className="mt-1.5 text-[9.5px] leading-snug text-gray-500">
            Nearest in the model's standardized feature space{showUser ? '; linked to YOU in the 3D view' : ''}.
          </p>
        </div>
      )}

      {/* Inputs — the sticky strip keeps the live score visible while scrolling */}
      <div className="sticky top-0 z-10 mx-4 mt-3 flex items-center justify-between rounded-lg border border-white/10 bg-panel/95 px-3 py-1.5 text-[11px] backdrop-blur">
        <span className="text-gray-400">Live risk</span>
        <span className="font-mono font-semibold tabular-nums" style={{ color }}>
          {pct} · <span style={{ color: band.color }}>{band.label}</span>
        </span>
      </div>
      <div className="mt-2.5 flex flex-col gap-2.5 px-4 pb-4">
        {FEATURES.map((f) => (
          <Control key={f} f={f} value={input[f]} onChange={(v) => setFeature(f, v)} />
        ))}
      </div>
    </motion.section>
  );
}
