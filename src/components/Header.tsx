import { motion } from 'framer-motion';
import { HeartPulse } from 'lucide-react';
import { MODEL_METRICS } from '../data/patients';

export default function Header() {
  return (
    <motion.header
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="glass pointer-events-auto flex items-center gap-3 rounded-2xl px-4 py-2.5"
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-vital-400/15 text-vital-300 glow-vital">
        <HeartPulse size={18} />
      </div>
      <div className="pr-2">
        <h1 className="font-display text-base font-bold leading-none tracking-tight">
          <span className="text-gradient-vital">CardioScope</span>{' '}
          <span className="text-gray-100">3D</span>
        </h1>
        <p className="mt-0.5 text-[10.5px] text-gray-400">
          Interactive cardiovascular risk stratification
        </p>
      </div>
      <div className="ml-1 hidden items-center gap-2 border-l border-white/10 pl-3 md:flex">
        <Stat label="Patients" value={`${MODEL_METRICS.n}`} />
        <Stat label="ROC-AUC" value={MODEL_METRICS.auc.toFixed(3)} accent />
        <Stat label="Accuracy" value={`${(MODEL_METRICS.accuracy * 100).toFixed(0)}%`} />
      </div>
    </motion.header>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="text-center">
      <div className={`font-mono text-sm font-semibold leading-none ${accent ? 'text-vital-300' : 'text-gray-100'}`}>
        {value}
      </div>
      <div className="mt-0.5 text-[9px] uppercase tracking-wider text-gray-500">{label}</div>
    </div>
  );
}
