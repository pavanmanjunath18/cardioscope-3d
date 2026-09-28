import { motion } from 'framer-motion';
import { Boxes, Grid3x3, Activity, HeartPulse, Layers, Sparkles } from 'lucide-react';
import { FEATURE_META } from '../data/features';
import {
  FEATURES,
  pcaInfo,
  clusterSummary,
  CLUSTER_COLORS,
  DISEASE_COLOR,
  HEALTHY_COLOR,
  RISK_HIGH,
  RISK_LOW,
  RISK_MID,
} from '../lib/analytics';
import type { ViewState, ColorMode, PosMode } from '../types';
import type { Feature } from '../data/patients';

interface Props {
  view: ViewState;
  setView: (v: ViewState) => void;
}

function Segmented<T extends string>({
  label, value, options, onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string; icon: React.ReactNode }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex gap-1 rounded-lg bg-white/[0.03] p-1" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-medium transition ${
            value === o.value
              ? 'bg-vital-400/15 text-vital-300 glow-vital'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  );
}

function AxisSelect({ axis, value, onChange }: { axis: string; value: Feature; onChange: (f: Feature) => void }) {
  return (
    <label className="flex items-center gap-2 text-[11px]">
      <span className="w-3.5 font-mono font-semibold text-vital-400">{axis}</span>
      <select
        value={value}
        aria-label={`${axis} axis feature`}
        onChange={(e) => onChange(e.target.value as Feature)}
        className="flex-1 rounded-md px-2 py-1.5 text-[11px] outline-none focus:border-vital-400/50"
      >
        {FEATURES.map((f) => (
          <option key={f} value={f}>{FEATURE_META[f].name}</option>
        ))}
      </select>
    </label>
  );
}

export default function ControlPanel({ view, setView }: Props) {
  const set = (patch: Partial<ViewState>) => setView({ ...view, ...patch });

  return (
    <motion.section
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="glass pointer-events-auto flex w-full shrink-0 flex-col gap-4 rounded-2xl p-4"
      aria-label="View controls"
    >
      <div>
        <div className="label-eyebrow mb-2 flex items-center gap-1.5">
          <Boxes size={12} /> Spatial layout
        </div>
        <Segmented<PosMode>
          label="Spatial layout"
          value={view.posMode}
          onChange={(v) => set({ posMode: v })}
          options={[
            { value: 'pca', label: 'PCA space', icon: <Sparkles size={12} /> },
            { value: 'features', label: 'Features', icon: <Grid3x3 size={12} /> },
          ]}
        />
        {view.posMode === 'pca' ? (
          <p className="mt-2 text-[10.5px] leading-snug text-gray-500">
            13 clinical features (18 columns once nominal ones are one-hot encoded) compressed to 3 principal
            components —{' '}
            <span className="text-gray-300">
              {((pcaInfo.explained[0] + pcaInfo.explained[1] + pcaInfo.explained[2]) * 100).toFixed(0)}%
            </span>{' '}
            of variance retained.
          </p>
        ) : (
          <div className="mt-2.5 flex flex-col gap-1.5">
            <p className="text-[10px] leading-snug text-gray-500">
              Discrete features are jittered slightly so stacked patients stay visible.
            </p>
            <AxisSelect axis="X" value={view.axes.x} onChange={(f) => set({ axes: { ...view.axes, x: f } })} />
            <AxisSelect axis="Y" value={view.axes.y} onChange={(f) => set({ axes: { ...view.axes, y: f } })} />
            <AxisSelect axis="Z" value={view.axes.z} onChange={(f) => set({ axes: { ...view.axes, z: f } })} />
          </div>
        )}
      </div>

      <div className="h-px bg-white/[0.06]" />

      <div>
        <div className="label-eyebrow mb-2 flex items-center gap-1.5">
          <Layers size={12} /> Color by
        </div>
        <Segmented<ColorMode>
          label="Color by"
          value={view.colorMode}
          onChange={(v) => set({ colorMode: v })}
          options={[
            { value: 'diagnosis', label: 'Diagnosis', icon: <Activity size={12} /> },
            { value: 'risk', label: 'Risk', icon: <HeartPulse size={12} /> },
            { value: 'cluster', label: 'Clusters', icon: <Boxes size={12} /> },
          ]}
        />

        {view.colorMode === 'diagnosis' && (
          <div className="mt-2.5 flex items-center gap-4 text-[11px]">
            <span className="flex items-center gap-1.5"><Dot c={HEALTHY_COLOR} /> Healthy</span>
            <span className="flex items-center gap-1.5"><Dot c={DISEASE_COLOR} /> Disease</span>
          </div>
        )}
        {view.colorMode === 'risk' && (
          <div className="mt-2.5">
            <div className="h-2 rounded-full" style={{ background: `linear-gradient(90deg,${RISK_LOW},${RISK_MID},${RISK_HIGH})` }} />
            <div className="mt-1 flex justify-between text-[10px] text-gray-500">
              <span>0% risk</span><span>50%</span><span>100%</span>
            </div>
          </div>
        )}
        {view.colorMode === 'cluster' && <ClusterDetails k={view.k} setK={(k) => set({ k })} />}
      </div>
    </motion.section>
  );
}

function Dot({ c }: { c: string }) {
  return <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: c, boxShadow: `0 0 8px ${c}` }} />;
}

function ClusterDetails({ k, setK }: { k: number; setK: (k: number) => void }) {
  const summary = clusterSummary(k);
  return (
    <div className="mt-2.5">
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-gray-400">Clusters (k)</span>
        <span className="font-mono text-vital-300">{k}</span>
      </div>
      <input
        type="range" min={2} max={6} step={1} value={k}
        aria-label="Number of clusters"
        onChange={(e) => setK(Number(e.target.value))}
        className="mt-1.5 w-full"
      />
      <table className="mt-2 w-full text-[10.5px]">
        <caption className="sr-only">Cluster sizes and disease rate</caption>
        <thead>
          <tr className="text-left text-[9.5px] uppercase tracking-wider text-gray-500">
            <th className="font-medium">Cluster</th>
            <th className="text-right font-medium">Patients</th>
            <th className="w-[45%] pl-2 font-medium">Had disease</th>
          </tr>
        </thead>
        <tbody>
          {summary.clusters.map((c) => (
            <tr key={c.cluster}>
              <td className="py-0.5"><Dot c={CLUSTER_COLORS[c.cluster % CLUSTER_COLORS.length]} /></td>
              <td className="text-right font-mono text-gray-300">{c.n}</td>
              <td className="pl-2">
                <div className="flex items-center gap-1.5">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/5">
                    <div className="h-full rounded-full" style={{ width: `${c.diseaseRate * 100}%`, background: DISEASE_COLOR }} />
                  </div>
                  <span className="w-8 text-right font-mono text-gray-300">{(c.diseaseRate * 100).toFixed(0)}%</span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-1.5 text-[10px] leading-snug text-gray-500">
        Unsupervised k-means on standardized features — diagnosis labels are <em>not</em> used, yet clusters
        agree with diagnosis at <span className="text-gray-300">{(summary.purity * 100).toFixed(0)}% purity</span>{' '}
        (adjusted Rand index <span className="text-gray-300">{summary.ari.toFixed(2)}</span>).
      </p>
    </div>
  );
}
