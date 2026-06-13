import { motion } from 'framer-motion';
import { Shuffle, RotateCcw, Eye, EyeOff } from 'lucide-react';
import Heart from './Heart';
import { FEATURE_META } from '../data/features';
import { FEATURES, riskColor, riskContributions } from '../lib/analytics';
import type { Feature } from '../data/patients';

interface Props {
  input: Record<Feature, number>;
  setInput: (i: Record<Feature, number>) => void;
  risk: number;
  showUser: boolean;
  setShowUser: (b: boolean) => void;
  onRandomize: () => void;
  onReset: () => void;
}

function riskBand(p: number) {
  if (p < 0.33) return { label: 'Low risk', color: '#34D399' };
  if (p < 0.66) return { label: 'Moderate risk', color: '#FBBF24' };
  return { label: 'High risk', color: '#F43F5E' };
}

function Control({ f, value, onChange }: { f: Feature; value: number; onChange: (v: number) => void }) {
  const m = FEATURE_META[f];
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-gray-300">{m.name}</span>
        {m.kind === 'numeric' && (
          <span className="font-mono text-vital-300">
            {value}{m.unit ? <span className="text-gray-500"> {m.unit}</span> : null}
          </span>
        )}
      </div>
      {m.kind === 'numeric' ? (
        <input
          type="range" min={m.min} max={m.max} step={m.step} value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full"
        />
      ) : (
        <select
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="rounded-md px-2 py-1.5 text-[11px] outline-none"
        >
          {m.options!.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      )}
    </div>
  );
}

export default function RiskPanel({ input, setInput, risk, showUser, setShowUser, onRandomize, onReset }: Props) {
  const band = riskBand(risk);
  const color = riskColor(risk);
  const contribs = riskContributions(input).slice(0, 5);
  const maxAbs = Math.max(...contribs.map((c) => Math.abs(c.contribution)), 0.01);

  return (
    <motion.div
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.15 }}
      className="glass pointer-events-auto flex w-full shrink-0 flex-col rounded-2xl"
    >
      {/* Heart + readout */}
      <div className="relative px-4 pt-4">
        <div className="label-eyebrow mb-1">Cardiac risk simulator</div>
        <div className="relative h-[150px]">
          <Heart risk={risk} />
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-display text-4xl font-bold tabular-nums" style={{ color }}>
              {(risk * 100).toFixed(0)}<span className="text-xl">%</span>
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color }}>
              {band.label}
            </span>
          </div>
        </div>
        <p className="mt-1 text-center text-[10px] text-gray-500">
          Logistic-regression probability of heart disease
        </p>
      </div>

      <div className="mx-4 mt-3 flex gap-2">
        <button
          onClick={() => setShowUser(!showUser)}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-2 py-1.5 text-[11px] font-medium transition ${
            showUser ? 'border-vital-400/40 bg-vital-400/10 text-vital-300' : 'border-white/10 text-gray-400 hover:text-gray-200'
          }`}
        >
          {showUser ? <Eye size={12} /> : <EyeOff size={12} />} Plot in 3D
        </button>
        <button onClick={onRandomize} className="rounded-lg border border-white/10 px-2.5 py-1.5 text-gray-400 transition hover:text-gray-200" title="Random patient">
          <Shuffle size={13} />
        </button>
        <button onClick={onReset} className="rounded-lg border border-white/10 px-2.5 py-1.5 text-gray-400 transition hover:text-gray-200" title="Reset to cohort baseline">
          <RotateCcw size={13} />
        </button>
      </div>

      {/* Top contributing factors */}
      <div className="mx-4 mt-3 rounded-xl bg-white/[0.03] p-3">
        <div className="label-eyebrow mb-2">Top factors driving this score</div>
        <div className="flex flex-col gap-1.5">
          {contribs.map((c) => {
            const pct = (Math.abs(c.contribution) / maxAbs) * 100;
            const up = c.contribution > 0;
            return (
              <div key={c.feature} className="flex items-center gap-2 text-[10.5px]">
                <span className="w-[68px] shrink-0 text-gray-400">{FEATURE_META[c.feature].label}</span>
                <div className="relative h-2 flex-1 rounded-full bg-white/5">
                  <div
                    className="absolute top-0 h-2 rounded-full"
                    style={{
                      width: `${pct}%`,
                      [up ? 'left' : 'right']: '50%',
                      background: up ? '#F43F5E' : '#34D399',
                      transform: up ? 'none' : 'none',
                    }}
                  />
                  <div className="absolute left-1/2 top-[-2px] h-3 w-px bg-white/20" />
                </div>
                <span className={`w-7 shrink-0 text-right font-mono ${up ? 'text-risk-high' : 'text-risk-low'}`}>
                  {up ? '+' : '−'}
                </span>
              </div>
            );
          })}
        </div>
        <p className="mt-2 text-[9.5px] leading-snug text-gray-500">
          <span className="text-risk-high">Red</span> raises risk, <span className="text-risk-low">green</span> lowers it (standardized log-odds weight).
        </p>
      </div>

      {/* Inputs */}
      <div className="mt-3 flex flex-col gap-2.5 px-4 pb-4">
        {FEATURES.map((f) => (
          <Control key={f} f={f} value={input[f]} onChange={(v) => setInput({ ...input, [f]: v })} />
        ))}
      </div>
    </motion.div>
  );
}
