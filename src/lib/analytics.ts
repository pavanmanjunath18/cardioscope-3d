import { PCA } from 'ml-pca';
import { kmeans } from 'ml-kmeans';
import {
  patients,
  FEATURES,
  TERMS,
  TERM_MEAN,
  TERM_STD,
  MODEL_COEF,
  MODEL_INTERCEPT,
  type Patient,
  type Feature,
} from '../data/patients';

export type Vec3 = [number, number, number];
export type Input = Record<Feature, number>;

const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));

/** Pull the 13 model features out of a patient row. */
export function patientInput(p: Patient): Input {
  return Object.fromEntries(FEATURES.map((f) => [f, p[f]])) as Input;
}

/**
 * Encode a raw feature vector into the model's standardized design space:
 * numeric features are z-scored, nominal ones become standardized one-hot indicators.
 */
export function encode(input: Input): number[] {
  return TERMS.map((t, j) => {
    const raw = t.level === null ? input[t.feature] : input[t.feature] === t.level ? 1 : 0;
    return (raw - TERM_MEAN[j]) / TERM_STD[j];
  });
}

/** Logistic-regression risk probability for any feature vector (0..1). */
export function riskScore(input: Input): number {
  const x = encode(input);
  let z = MODEL_INTERCEPT;
  for (let j = 0; j < x.length; j++) z += MODEL_COEF[j] * x[j];
  return sigmoid(z);
}

/**
 * Per-feature contribution to the log-odds, relative to the average cohort patient
 * (whose standardized design vector is all zeros). One-hot terms are summed back
 * into their parent feature.
 */
export function riskContributions(input: Input) {
  const x = encode(input);
  const byFeature = Object.fromEntries(FEATURES.map((f) => [f, 0])) as Record<Feature, number>;
  TERMS.forEach((t, j) => { byFeature[t.feature] += MODEL_COEF[j] * x[j]; });
  return FEATURES.map((f) => ({ feature: f, contribution: byFeature[f] })).sort(
    (a, b) => Math.abs(b.contribution) - Math.abs(a.contribution),
  );
}

/** Risk bands anchored on the model's 0.5 decision threshold. */
export const DECISION_THRESHOLD = 0.5;
export function riskBand(p: number) {
  if (p < 0.25) return { label: 'Low risk', color: RISK_LOW };
  if (p < DECISION_THRESHOLD) return { label: 'Borderline', color: RISK_MID };
  return { label: 'High risk', color: RISK_HIGH };
}

// --- Feature ranges -------------------------------------------------------

export const RANGES = Object.fromEntries(
  FEATURES.map((f) => {
    let lo = Infinity, hi = -Infinity;
    for (const p of patients) {
      lo = Math.min(lo, p[f]);
      hi = Math.max(hi, p[f]);
    }
    return [f, { lo, hi }];
  }),
) as Record<Feature, { lo: number; hi: number }>;

// --- 3D positioning -----------------------------------------------------

export const SCALE = 7.5;

/** Map a raw feature value into [-SCALE, SCALE] for axis-mode plotting. */
export function axisPosition(feature: Feature, value: number): number {
  const { lo, hi } = RANGES[feature];
  const t = hi === lo ? 0.5 : (value - lo) / (hi - lo);
  return (t - 0.5) * 2 * SCALE;
}

/** Features with few distinct values — plotted with jitter so points don't stack. */
export const DISCRETE: Record<Feature, boolean> = Object.fromEntries(
  FEATURES.map((f) => [f, new Set(patients.map((p) => p[f])).size <= 4]),
) as Record<Feature, boolean>;

// Jitter amplitude per discrete feature: capped at 40% of the tightest gap between levels.
const JITTER_AMP = Object.fromEntries(
  FEATURES.map((f) => {
    if (!DISCRETE[f]) return [f, 0];
    const levels = [...new Set(patients.map((p) => p[f]))].sort((a, b) => a - b);
    let gap = Infinity;
    for (let i = 1; i < levels.length; i++) gap = Math.min(gap, axisPosition(f, levels[i]) - axisPosition(f, levels[i - 1]));
    return [f, Math.min(1.8, 0.4 * gap)];
  }),
) as Record<Feature, number>;

/** Deterministic pseudo-random in [-0.5, 0.5) for (patient, feature). */
function hashJitter(i: number, f: Feature): number {
  let h = (i + 1) * 374761393 + (FEATURES.indexOf(f) + 1) * 668265263;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return ((h >>> 0) / 4294967296) - 0.5;
}

/** Plot position of cohort patient i on a feature axis (jittered when discrete). */
export function patientAxisPosition(i: number, feature: Feature): number {
  return axisPosition(feature, patients[i][feature]) + hashJitter(i, feature) * JITTER_AMP[feature];
}

// --- PCA (computed once over the standardized design matrix) --------------

const designMatrix = patients.map((p) => encode(patientInput(p)));

const pca = new PCA(designMatrix, { center: false, scale: false });
const pcaScores = pca.predict(designMatrix, { nComponents: 3 }).to2DArray();
const explained = pca.getExplainedVariance();

// Per-component scale so the cloud fills the scene; reused for the user's projection.
const pcaMaxAbs = [0, 1, 2].map((c) => Math.max(1e-6, ...pcaScores.map((r) => Math.abs(r[c]))));
const scalePca = (r: number[]): Vec3 => [0, 1, 2].map((c) => (r[c] / pcaMaxAbs[c]) * SCALE) as Vec3;

export const pcaInfo = {
  explained: explained.slice(0, 3),
  positions: pcaScores.map(scalePca),
};

/** Project the user's input vector into the same PCA space. */
export function pcaProjectInput(input: Input): Vec3 {
  return scalePca(pca.predict([encode(input)], { nComponents: 3 }).to2DArray()[0]);
}

// --- Nearest neighbours (Euclidean in the standardized design space) -------

export function nearestNeighbors(input: Input, k = 5, exclude: number | null = null) {
  const x = encode(input);
  const dists = designMatrix.map((row, i) => {
    let d = 0;
    for (let j = 0; j < row.length; j++) d += (row[j] - x[j]) ** 2;
    return { index: i, distance: Math.sqrt(d) };
  });
  return dists
    .filter((d) => d.index !== exclude)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, k);
}

// --- K-means (memoized per k) -------------------------------------------

const kmeansCache = new Map<number, number[]>();
export function clusterAssignments(k: number): number[] {
  const hit = kmeansCache.get(k);
  if (hit) return hit;
  const res = kmeans(designMatrix, k, { seed: 42, initialization: 'kmeans++' });
  kmeansCache.set(k, res.clusters);
  return res.clusters;
}

const choose2 = (n: number) => (n * (n - 1)) / 2;

/** How well unsupervised clusters line up with the (unused) diagnosis labels. */
export function clusterSummary(k: number) {
  const clusters = clusterAssignments(k);
  const rows = Array.from({ length: k }, () => ({ n: 0, disease: 0 }));
  clusters.forEach((c, i) => {
    rows[c].n++;
    rows[c].disease += patients[i].disease;
  });
  const n = patients.length;
  const purity = rows.reduce((a, r) => a + Math.max(r.disease, r.n - r.disease), 0) / n;

  // Adjusted Rand index between clusters and diagnosis.
  const diseaseTotal = rows.reduce((a, r) => a + r.disease, 0);
  const sumCells = rows.reduce((a, r) => a + choose2(r.disease) + choose2(r.n - r.disease), 0);
  const sumRows = rows.reduce((a, r) => a + choose2(r.n), 0);
  const sumCols = choose2(diseaseTotal) + choose2(n - diseaseTotal);
  const expected = (sumRows * sumCols) / choose2(n);
  const max = (sumRows + sumCols) / 2;
  const ari = max === expected ? 0 : (sumCells - expected) / (max - expected);

  return {
    clusters: rows.map((r, c) => ({ cluster: c, n: r.n, diseaseRate: r.n ? r.disease / r.n : 0 })),
    purity,
    ari,
  };
}

// --- Colors -------------------------------------------------------------
// Blue → amber → rose: distinguishable under the common red-green deficiencies.

export const RISK_LOW = '#38BDF8';
export const RISK_MID = '#FBBF24';
export const RISK_HIGH = '#F43F5E';
export const HEALTHY_COLOR = RISK_LOW;
export const DISEASE_COLOR = RISK_HIGH;

const hexRgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const STOPS: [number, number[]][] = [[0, hexRgb(RISK_LOW)], [0.5, hexRgb(RISK_MID)], [1, hexRgb(RISK_HIGH)]];

/** Risk -> css rgb() along blue→amber→rose. */
export function riskColor(p: number): string {
  const q = Math.min(1, Math.max(0, p));
  const [a, b] = q <= 0.5 ? [STOPS[0], STOPS[1]] : [STOPS[1], STOPS[2]];
  const t = (q - a[0]) / (b[0] - a[0]);
  const c = a[1].map((v, i) => Math.round(v + (b[1][i] - v) * t));
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}

export const CLUSTER_COLORS = ['#2DD4BF', '#A78BFA', '#F472B6', '#FBBF24', '#60A5FA', '#34D399'];

// Precompute each patient's model risk once.
export const patientRisk: number[] = patients.map((p) => riskScore(patientInput(p)));

export { patients, FEATURES };
export type { Patient, Feature };
