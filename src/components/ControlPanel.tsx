import { motion } from 'framer-motion';
import { Boxes, Grid3x3, Activity, HeartPulse, Layers, Sparkles } from 'lucide-react';
import { FEATURES } from '../lib/analytics';
import { FEATURE_META } from '../data/features';
import { pcaInfo, CLUSTER_COLORS } from '../lib/analytics';
import type { ViewState, ColorMode, PosMode } from '../types';
import type { Feature } from '../data/patients';

interface Props {
  view: ViewState;
  setView: (v: ViewState) => void;
}

function Segmented<T extends string>({
  value, options, onChange,
}: {
  value: T;
  options: { value: T; label: string; icon: React.ReactNode }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex gap-1 rounded-lg bg-white/[0.03] p-1">
      {options.map((o) => (
        <button
          key={o.value}
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
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="glass pointer-events-auto flex w-full shrink-0 flex-col gap-4 rounded-2xl p-4"
    >
      <div>
        <div className="label-eyebrow mb-2 flex items-center gap-1.5">
          <Boxes size={12} /> Spatial layout
        </div>
        <Segmented<PosMode>
          value={view.posMode}
          onChange={(v) => set({ posMode: v })}
          options={[
            { value: 'pca', label: 'PCA space', icon: <Sparkles size={12} /> },
            { value: 'features', label: 'Features', icon: <Grid3x3 size={12} /> },
          ]}
        />
        {view.posMode === 'pca' ? (
          <p className="mt-2 text-[10.5px] leading-snug text-gray-500">
            13 clinical features compressed to 3 principal components —{' '}
            <span className="text-gray-300">
              {((pcaInfo.explained[0] + pcaInfo.explained[1] + pcaInfo.explained[2]) * 100).toFixed(0)}%
            </span>{' '}
            of variance retained.
          </p>
        ) : (
          <div className="mt-2.5 flex flex-col gap-1.5">
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
            <span className="flex items-center gap-1.5"><Dot c="#2DD4BF" /> Healthy</span>
            <span className="flex items-center gap-1.5"><Dot c="#F43F5E" /> Disease</span>
          </div>
        )}
        {view.colorMode === 'risk' && (
          <div className="mt-2.5">
            <div className="h-2 rounded-full" style={{ background: 'linear-gradient(90deg,#34D399,#FBBF24,#F43F5E)' }} />
            <div className="mt-1 flex justify-between text-[10px] text-gray-500">
              <span>0% risk</span><span>100%</span>
            </div>
          </div>
        )}
        {view.colorMode === 'cluster' && (
          <div className="mt-2.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-gray-400">Clusters (k)</span>
              <span className="font-mono text-vital-300">{view.k}</span>
            </div>
            <input
              type="range" min={2} max={6} step={1} value={view.k}
              onChange={(e) => set({ k: Number(e.target.value) })}
              className="mt-1.5 w-full"
            />
            <div className="mt-2 flex gap-1.5">
              {Array.from({ length: view.k }).map((_, i) => (
                <Dot key={i} c={CLUSTER_COLORS[i % CLUSTER_COLORS.length]} />
              ))}
            </div>
            <p className="mt-1.5 text-[10px] leading-snug text-gray-500">
              Unsupervised k-means on standardized features — diagnosis labels are <em>not</em> used.
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function Dot({ c }: { c: string }) {
  return <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: c, boxShadow: `0 0 8px ${c}` }} />;
}
