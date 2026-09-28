import { motion } from 'framer-motion';
import { HeartPulse, FileText } from 'lucide-react';
import { MODEL_METRICS } from '../data/patients';

export default function Header({ onOpenModelCard }: { onOpenModelCard: () => void }) {
  return (
    <motion.header
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="glass pointer-events-auto flex items-center gap-3 rounded-2xl px-3 py-2 md:px-4 md:py-2.5"
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-vital-400/15 text-vital-300 glow-vital md:h-9 md:w-9">
        <HeartPulse size={18} aria-hidden />
      </div>
      <div className="min-w-0 pr-1">
        <h1 className="font-display text-base font-bold leading-none tracking-tight">
          <span className="text-gradient-vital">CardioScope</span>{' '}
          <span className="text-gray-100">3D</span>
        </h1>
        <p className="mt-0.5 hidden text-[10.5px] text-gray-400 sm:block">
          Interactive cardiovascular risk stratification
        </p>
      </div>
      <div className="ml-1 hidden items-center gap-3 border-l border-white/10 pl-3 lg:flex">
        <Stat label="Patients" value={`${MODEL_METRICS.n}`} />
        <Stat label="CV ROC-AUC" value={MODEL_METRICS.cv.auc.toFixed(3)} accent />
        <Stat label="CV accuracy" value={`${(MODEL_METRICS.cv.accuracy * 100).toFixed(0)}%`} />
      </div>
      <button
        onClick={onOpenModelCard}
        className="ml-auto flex shrink-0 items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] font-medium text-gray-300 transition hover:border-vital-400/40 hover:text-vital-300"
      >
        <FileText size={12} aria-hidden /> Model card
      </button>
    </motion.header>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="text-center" title={`${MODEL_METRICS.cv.folds}-fold cross-validated (held-out) estimate`}>
      <div className={`font-mono text-sm font-semibold leading-none ${accent ? 'text-vital-300' : 'text-gray-100'}`}>
        {value}
      </div>
      <div className="mt-0.5 text-[9px] uppercase tracking-wider text-gray-500">{label}</div>
    </div>
  );
}
