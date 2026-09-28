import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { MODEL_METRICS, MODEL_COEF, TERMS } from '../data/patients';
import { FEATURE_META } from '../data/features';
import { RISK_HIGH, RISK_LOW } from '../lib/analytics';

const M = MODEL_METRICS;
const pct = (v: number) => `${(v * 100).toFixed(1)}%`;

// Shared plot geometry (unit square data → SVG px).
const W = 220, H = 220, PAD = 28;
const sx = (v: number) => PAD + v * (W - PAD - 8);
const sy = (v: number) => H - PAD - v * (H - PAD - 8);

function Frame({ xLabel, yLabel, children }: { xLabel: string; yLabel: string; children: React.ReactNode }) {
  return (
    <>
      {[0, 0.5, 1].map((t) => (
        <g key={t}>
          <line x1={sx(0)} x2={sx(1)} y1={sy(t)} y2={sy(t)} stroke="rgba(255,255,255,0.07)" />
          <text x={sx(0) - 4} y={sy(t) + 3} textAnchor="end" className="fill-gray-500 text-[8px]">{t}</text>
          <text x={sx(t)} y={sy(0) + 11} textAnchor="middle" className="fill-gray-500 text-[8px]">{t}</text>
        </g>
      ))}
      <line x1={sx(0)} y1={sy(0)} x2={sx(1)} y2={sy(1)} stroke="rgba(255,255,255,0.25)" strokeDasharray="3 3" />
      <text x={(sx(0) + sx(1)) / 2} y={H - 4} textAnchor="middle" className="fill-gray-400 text-[9px]">{xLabel}</text>
      <text x={8} y={(sy(0) + sy(1)) / 2} textAnchor="middle" transform={`rotate(-90 8 ${(sy(0) + sy(1)) / 2})`} className="fill-gray-400 text-[9px]">{yLabel}</text>
      {children}
    </>
  );
}

function RocChart() {
  const [hover, setHover] = useState<number | null>(null);
  const pts = M.cv.roc;
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${sx(x).toFixed(1)},${sy(y).toFixed(1)}`).join('');
  const onMove = (e: React.PointerEvent<SVGRectElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const fx = ((e.clientX - r.left) / r.width) * W;
    let best = 0;
    pts.forEach(([x], i) => { if (Math.abs(sx(x) - fx) < Math.abs(sx(pts[best][0]) - fx)) best = i; });
    setHover(best);
  };
  const h = hover !== null ? pts[hover] : null;
  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto w-full max-w-[300px]" role="img" aria-label={`ROC curve, cross-validated AUC ${M.cv.auc.toFixed(3)}`}>
        <Frame xLabel="False positive rate" yLabel="True positive rate">
          <path d={d} fill="none" stroke="#2DD4BF" strokeWidth={2} strokeLinejoin="round" />
          {h && (
            <g>
              <line x1={sx(h[0])} x2={sx(h[0])} y1={sy(0)} y2={sy(1)} stroke="rgba(255,255,255,0.2)" />
              <circle cx={sx(h[0])} cy={sy(h[1])} r={4} fill="#2DD4BF" stroke="#0D0F11" strokeWidth={2} />
              <text x={sx(0.98)} y={sy(0.06)} textAnchor="end" className="fill-gray-200 text-[9px]">
                FPR {pct(h[0])} · TPR {pct(h[1])}
              </text>
            </g>
          )}
          <rect x={sx(0)} y={sy(1)} width={sx(1) - sx(0)} height={sy(0) - sy(1)} fill="transparent"
            onPointerMove={onMove} onPointerLeave={() => setHover(null)} />
        </Frame>
      </svg>
      <figcaption className="mx-auto mt-1 max-w-[300px] text-[10.5px] text-gray-400">
        ROC curve (out-of-fold predictions) — AUC <span className="font-mono text-gray-200">{M.cv.auc.toFixed(3)}</span>
      </figcaption>
    </figure>
  );
}

function CalibrationChart() {
  const [hover, setHover] = useState<number | null>(null);
  const c = M.cv.calibration;
  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto w-full max-w-[300px]" role="img" aria-label="Calibration plot: predicted versus observed disease rate by decile">
        <Frame xLabel="Mean predicted risk" yLabel="Observed disease rate">
          <path
            d={c.map((b, i) => `${i ? 'L' : 'M'}${sx(b.predicted).toFixed(1)},${sy(b.observed).toFixed(1)}`).join('')}
            fill="none" stroke="#A78BFA" strokeWidth={2} strokeLinejoin="round"
          />
          {c.map((b, i) => (
            <g key={i} onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(null)}>
              <circle cx={sx(b.predicted)} cy={sy(b.observed)} r={10} fill="transparent" />
              <circle cx={sx(b.predicted)} cy={sy(b.observed)} r={hover === i ? 5 : 4} fill="#A78BFA" stroke="#0D0F11" strokeWidth={2} />
            </g>
          ))}
          {hover !== null && (
            <text x={sx(0.02)} y={sy(0.94)} className="fill-gray-200 text-[9px]">
              Decile {hover + 1}: predicted {pct(c[hover].predicted)}, observed {pct(c[hover].observed)} (n={c[hover].n})
            </text>
          )}
        </Frame>
      </svg>
      <figcaption className="mx-auto mt-1 max-w-[300px] text-[10.5px] text-gray-400">
        Calibration by decile — points on the dashed line are perfectly calibrated.
      </figcaption>
    </figure>
  );
}

function Confusion() {
  const { tp, fp, tn, fn } = M.cv.confusion;
  const cell = (v: number, label: string, good: boolean) => (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-2 text-center">
      <div className="font-mono text-lg font-semibold" style={{ color: good ? RISK_LOW : RISK_HIGH }}>{v}</div>
      <div className="text-[9.5px] text-gray-400">{label}</div>
    </div>
  );
  return (
    <div>
      <div className="mb-1 grid grid-cols-[auto_1fr_1fr] items-center gap-1.5 text-[9.5px] uppercase tracking-wider text-gray-500">
        <span />
        <span className="text-center">Predicted disease</span>
        <span className="text-center">Predicted healthy</span>
        <span className="pr-1">Actual disease</span>
        {cell(tp, 'true positives', true)}
        {cell(fn, 'false negatives', false)}
        <span className="pr-1">Actual healthy</span>
        {cell(fp, 'false positives', false)}
        {cell(tn, 'true negatives', true)}
      </div>
      <p className="text-[10.5px] text-gray-400">
        At the 50% threshold: sensitivity <span className="font-mono text-gray-200">{pct(tp / (tp + fn))}</span>,
        specificity <span className="font-mono text-gray-200">{pct(tn / (tn + fp))}</span>.
      </p>
    </div>
  );
}

function termLabel(i: number) {
  const t = TERMS[i];
  const m = FEATURE_META[t.feature];
  if (t.level === null) return m.name;
  const ref = m.options![0].label;
  return `${m.label}: ${m.options!.find((o) => o.value === t.level)!.label} (vs ${ref})`;
}

export default function ModelCard({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  const coefs = MODEL_COEF.map((c, i) => ({ i, c })).sort((a, b) => Math.abs(b.c) - Math.abs(a.c));
  const maxC = Math.max(...coefs.map((x) => Math.abs(x.c)));

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => { if (e.target === ref.current) onClose(); }}
      className="m-auto max-h-[90dvh] w-[min(760px,calc(100vw-24px))] overflow-y-auto rounded-2xl border border-vital-400/15 bg-panel p-0 text-gray-200 shadow-2xl backdrop:bg-black/70 backdrop:backdrop-blur-sm"
      aria-labelledby="model-card-title"
    >
      <div className="p-5">
        <div className="mb-3 flex items-start justify-between gap-4">
          <div>
            <h2 id="model-card-title" className="font-display text-lg font-semibold text-white">Model card</h2>
            <p className="text-[11px] text-gray-400">
              L2-regularized logistic regression · {M.n} patients · nominal features one-hot encoded ·
              converged in {M.fit.iterations} iterations
            </p>
          </div>
          <button onClick={onClose} aria-label="Close model card" className="rounded-lg border border-white/10 p-1.5 text-gray-400 hover:text-gray-200">
            <X size={14} aria-hidden />
          </button>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            ['CV ROC-AUC', M.cv.auc.toFixed(3)],
            ['CV accuracy', pct(M.cv.accuracy)],
            ['Train ROC-AUC', M.train.auc.toFixed(3)],
            ['Train accuracy', pct(M.train.accuracy)],
          ].map(([l, v]) => (
            <div key={l} className="rounded-lg bg-white/[0.03] p-2 text-center">
              <div className="font-mono text-base font-semibold text-gray-100">{v}</div>
              <div className="text-[9.5px] uppercase tracking-wider text-gray-500">{l}</div>
            </div>
          ))}
        </div>
        <p className="mb-4 text-[11px] leading-relaxed text-gray-400">
          Headline numbers are from stratified {M.cv.folds}-fold cross-validation: each patient is scored by a model
          that never saw them, with standardization refit inside every fold. Training-set scores are shown for
          comparison only — they are optimistic by construction.
        </p>

        <div className="grid gap-5 sm:grid-cols-2">
          <RocChart />
          <CalibrationChart />
        </div>

        <h3 className="label-eyebrow mb-2 mt-5">Confusion matrix (cross-validated)</h3>
        <Confusion />

        <h3 className="label-eyebrow mb-2 mt-5">Coefficients (standardized log-odds)</h3>
        <ul className="flex flex-col gap-1">
          {coefs.map(({ i, c }) => (
            <li key={i} className="grid grid-cols-[minmax(0,1fr)_120px_44px] items-center gap-2 text-[10.5px]">
              <span className="truncate text-gray-300" title={termLabel(i)}>{termLabel(i)}</span>
              <div className="relative h-1.5 overflow-hidden rounded-full bg-white/5" aria-hidden="true">
                <div className="absolute top-0 h-full rounded-full" style={{
                  width: `${(Math.abs(c) / maxC) * 50}%`,
                  [c > 0 ? 'left' : 'right']: '50%',
                  background: c > 0 ? RISK_HIGH : RISK_LOW,
                }} />
              </div>
              <span className="text-right font-mono tabular-nums text-gray-300">{c > 0 ? '+' : '−'}{Math.abs(c).toFixed(2)}</span>
            </li>
          ))}
        </ul>

        <h3 className="label-eyebrow mb-2 mt-5">Caveats</h3>
        <ul className="list-disc space-y-1 pl-4 text-[11px] leading-relaxed text-gray-400">
          <li>
            Coefficients are <em>conditional</em> on every other feature. Age (slightly negative) and fasting blood
            sugar (negative) run against the usual clinical intuition: their effect is largely carried by correlated
            features (vessels, max heart rate, ST changes) in this small sample and should not be read causally.
          </li>
          <li>
            The cohort is 297 patients referred for angiography at one clinic in the 1980s — not a screening
            population, so predicted probabilities do not transfer to the general public.
          </li>
          <li>{M.dropped} patients with missing vessel or thalassemia values were dropped.</li>
          <li>Educational demo only — not a diagnostic tool.</li>
        </ul>
      </div>
    </dialog>
  );
}
