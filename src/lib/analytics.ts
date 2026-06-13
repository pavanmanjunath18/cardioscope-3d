import { PCA } from 'ml-pca';
import { kmeans } from 'ml-kmeans';
import {
  patients,
  FEATURES,
  FEATURE_MEAN,
  FEATURE_STD,
  MODEL_COEF,
  MODEL_INTERCEPT,
  type Patient,
  type Feature,
} from '../data/patients';

export type Vec3 = [number, number, number];

const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));

/** Standardize a single feature value with the training mean/std. */
export function standardize(feature: Feature, value: number): number {
  return (value - FEATURE_MEAN[feature]) / FEATURE_STD[feature];
}

/** Logistic-regression risk probability for any feature vector (0..1). */
export function riskScore(input: Record<Feature, number>): number {
  let z = MODEL_INTERCEPT;
  for (const f of FEATURES) z += MODEL_COEF[f] * standardize(f, input[f]);
  return sigmoid(z);
}

/** Per-feature contribution to the log-odds — for the "why" breakdown. */
export function riskContributions(input: Record<Feature, number>) {
  return FEATURES.map((f) => ({
    feature: f,
    contribution: MODEL_COEF[f] * standardize(f, input[f]),
  })).sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));
}

// --- 3D positioning -----------------------------------------------------

const SCALE = 7.5;

function minMax(feature: Feature) {
  let lo = Infinity, hi = -Infinity;
  for (const p of patients) {
    const v = p[feature];
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  return { lo, hi };
}

const RANGES = Object.fromEntries(
  FEATURES.map((f) => [f, minMax(f)]),
) as Record<Feature, { lo: number; hi: number }>;

/** Map a raw feature value into [-SCALE, SCALE] for axis-mode plotting. */
export function axisPosition(feature: Feature, value: number): number {
  const { lo, hi } = RANGES[feature];
  const t = hi === lo ? 0.5 : (value - lo) / (hi - lo);
  return (t - 0.5) * 2 * SCALE;
}

// --- PCA (computed once over the standardized cohort) --------------------

const standardizedMatrix = patients.map((p) =>
  FEATURES.map((f) => standardize(f, p[f])),
);

const pca = new PCA(standardizedMatrix, { center: false, scale: false });
const pcaScores = pca.predict(standardizedMatrix, { nComponents: 3 }).to2DArray();
const explained = pca.getExplainedVariance();

// Normalize PCA scores so the cloud fills the scene nicely.
function normalizeColumns(rows: number[][]): number[][] {
  const cols = rows[0].length;
  const maxAbs = new Array(cols).fill(1e-6);
  for (const r of rows) for (let c = 0; c < cols; c++) maxAbs[c] = Math.max(maxAbs[c], Math.abs(r[c]));
  return rows.map((r) => r.map((v, c) => (v / maxAbs[c]) * SCALE));
}
const pcaPositions = normalizeColumns(pcaScores) as Vec3[];

export const pcaInfo = {
  explained: explained.slice(0, 3),
  positions: pcaPositions,
};

/** Project the user's input vector into the same PCA space. */
export function pcaProjectInput(input: Record<Feature, number>): Vec3 {
  const std = FEATURES.map((f) => standardize(f, input[f]));
  const scores = pca.predict([std], { nComponents: 3 }).to2DArray()[0];
  // Reuse the same per-column normalization as the cohort.
  const cols = pcaScores[0].length;
  const maxAbs = new Array(cols).fill(1e-6);
  for (const r of pcaScores) for (let c = 0; c < cols; c++) maxAbs[c] = Math.max(maxAbs[c], Math.abs(r[c]));
  return [
    (scores[0] / maxAbs[0]) * SCALE,
    (scores[1] / maxAbs[1]) * SCALE,
    (scores[2] / maxAbs[2]) * SCALE,
  ];
}

// --- K-means (memoized per k) -------------------------------------------

const kmeansCache = new Map<number, number[]>();
export function clusterAssignments(k: number): number[] {
  if (kmeansCache.has(k)) return kmeansCache.get(k)!;
  const res = kmeans(standardizedMatrix, k, { seed: 42, initialization: 'kmeans++' });
  kmeansCache.set(k, res.clusters);
  return res.clusters;
}

// --- Colors -------------------------------------------------------------

/** Risk -> hex along green→amber→red. */
export function riskColor(p: number): string {
  const stops: [number, [number, number, number]][] = [
    [0, [52, 211, 153]],   // emerald
    [0.5, [251, 191, 36]], // amber
    [1, [244, 63, 94]],    // rose
  ];
  let a = stops[0], b = stops[stops.length - 1];
  for (let i = 0; i < stops.length - 1; i++) {
    if (p >= stops[i][0] && p <= stops[i + 1][0]) { a = stops[i]; b = stops[i + 1]; break; }
  }
  const t = (p - a[0]) / (b[0] - a[0] || 1);
  const c = a[1].map((v, i) => Math.round(v + (b[1][i] - v) * t));
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}

export const CLUSTER_COLORS = ['#2DD4BF', '#A78BFA', '#F472B6', '#FBBF24', '#60A5FA', '#34D399'];

// Precompute each patient's model risk once.
export const patientRisk: number[] = patients.map((p) =>
  riskScore(p as unknown as Record<Feature, number>),
);

export function defaultInput(): Record<Feature, number> {
  // Cohort median-ish defaults come from FEATURE_META; this is a fallback.
  return Object.fromEntries(FEATURES.map((f) => [f, FEATURE_MEAN[f]])) as Record<Feature, number>;
}

export { patients, FEATURES };
export type { Patient, Feature };
