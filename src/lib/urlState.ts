import { FEATURES, type Feature } from '../data/patients';
import { FEATURE_META } from '../data/features';
import type { ColorMode, PosMode, ViewState } from '../types';
import type { Input } from './analytics';

export interface AppState {
  view: ViewState;
  input: Input;
  showUser: boolean;
}

const COLOR_MODES: ColorMode[] = ['diagnosis', 'risk', 'cluster'];
const POS_MODES: PosMode[] = ['pca', 'features'];

export function baselineInput(): Input {
  return Object.fromEntries(FEATURES.map((f) => [f, FEATURE_META[f].default])) as Input;
}

export const DEFAULT_STATE: AppState = {
  view: { colorMode: 'diagnosis', posMode: 'pca', axes: { x: 'age', y: 'thalach', z: 'chol' }, k: 3 },
  input: baselineInput(),
  showUser: true,
};

const isFeature = (s: string): s is Feature => (FEATURES as readonly string[]).includes(s);

function validValue(f: Feature, v: number): boolean {
  const m = FEATURE_META[f];
  if (!Number.isFinite(v)) return false;
  if (m.kind === 'categorical') return m.options!.some((o) => o.value === v);
  return v >= m.min && v <= m.max;
}

/** Serialize state into a compact, shareable URL hash. */
export function encodeState(s: AppState): string {
  const p = new URLSearchParams();
  p.set('pos', s.view.posMode);
  p.set('color', s.view.colorMode);
  p.set('k', String(s.view.k));
  p.set('axes', [s.view.axes.x, s.view.axes.y, s.view.axes.z].join(','));
  p.set('in', FEATURES.map((f) => s.input[f]).join(','));
  if (!s.showUser) p.set('you', '0');
  return p.toString();
}

/** Parse a URL hash back into state; anything invalid falls back to the default. */
export function decodeState(hash: string): AppState {
  const p = new URLSearchParams(hash.replace(/^#/, ''));
  const d = DEFAULT_STATE;
  const pos = p.get('pos') as PosMode | null;
  const color = p.get('color') as ColorMode | null;
  const k = Number(p.get('k'));
  const axes = (p.get('axes') ?? '').split(',');
  const vals = (p.get('in') ?? '').split(',').map(Number);

  const input = { ...d.input };
  if (vals.length === FEATURES.length) {
    FEATURES.forEach((f, i) => { if (validValue(f, vals[i])) input[f] = vals[i]; });
  }

  return {
    view: {
      posMode: pos && POS_MODES.includes(pos) ? pos : d.view.posMode,
      colorMode: color && COLOR_MODES.includes(color) ? color : d.view.colorMode,
      k: Number.isInteger(k) && k >= 2 && k <= 6 ? k : d.view.k,
      axes: axes.length === 3 && axes.every(isFeature)
        ? { x: axes[0] as Feature, y: axes[1] as Feature, z: axes[2] as Feature }
        : d.view.axes,
    },
    input,
    showUser: p.get('you') !== '0',
  };
}
