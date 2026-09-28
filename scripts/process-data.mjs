// Processes the raw UCI Cleveland Heart Disease dataset into a typed TS module.
// - Cleans '?' missing values (drops affected rows, matching standard practice).
// - One-hot encodes the nominal features (cp, restecg, slope, thal) so the model
//   never assumes an order between their codes.
// - Fits a standardized, L2-regularized logistic-regression risk model via
//   gradient descent (run to convergence, not a fixed epoch count).
// - Reports honest held-out metrics from stratified 10-fold cross-validation,
//   plus the ROC curve, confusion matrix and calibration used by the model card.
// - Emits src/data/patients.ts with the cleaned rows + model.
//
// Source: Detrano et al., UCI Machine Learning Repository (Cleveland clinic).
// Run: node scripts/process-data.mjs /tmp/cleveland.data
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const RAW = process.argv[2] || '/tmp/cleveland.data';
const text = readFileSync(RAW, 'utf8').trim();

// Column order in processed.cleveland.data
const COLS = ['age','sex','cp','trestbps','chol','fbs','restecg','thalach','exang','oldpeak','slope','ca','thal','num'];

const rows = [];
let total = 0;
for (const line of text.split('\n')) {
  const parts = line.trim().split(',');
  if (parts.length !== 14) continue;
  total++;
  if (parts.some((p) => p === '?')) continue; // drop rows with missing ca/thal
  const r = {};
  COLS.forEach((c, i) => { r[c] = Number(parts[i]); });
  // Binary target: 0 = no disease, 1-4 = presence of disease -> 1
  r.disease = r.num > 0 ? 1 : 0;
  delete r.num;
  rows.push(r);
}
const dropped = total - rows.length;

const FEATURES = ['age','sex','cp','trestbps','chol','fbs','restecg','thalach','exang','oldpeak','slope','ca','thal'];

// Nominal features -> one-hot with the first level as the reference category.
const NOMINAL = {
  cp: [1, 2, 3, 4],
  restecg: [0, 1, 2],
  slope: [1, 2, 3],
  thal: [3, 6, 7],
};

// Design-matrix columns ("terms"). level === null means the raw value is used.
const TERMS = [];
for (const f of FEATURES) {
  if (NOMINAL[f]) for (const level of NOMINAL[f].slice(1)) TERMS.push({ feature: f, level });
  else TERMS.push({ feature: f, level: null });
}
const encode = (r) => TERMS.map((t) => (t.level === null ? r[t.feature] : r[t.feature] === t.level ? 1 : 0));

const sigmoid = (z) => 1 / (1 + Math.exp(-z));
const LAMBDA = 0.01, LR = 0.5, TOL = 1e-7, MAX_ITERS = 50000;

function fit(data) {
  const X0 = data.map(encode);
  const d = TERMS.length, n = X0.length;
  const mean = [], std = [];
  for (let j = 0; j < d; j++) {
    const m = X0.reduce((a, x) => a + x[j], 0) / n;
    const v = X0.reduce((a, x) => a + (x[j] - m) ** 2, 0) / n;
    mean[j] = m;
    std[j] = Math.sqrt(v) || 1;
  }
  const X = X0.map((x) => x.map((v, j) => (v - mean[j]) / std[j]));
  const y = data.map((r) => r.disease);
  const w = new Array(d).fill(0);
  let b = 0, iters = 0, converged = false;
  for (; iters < MAX_ITERS; iters++) {
    const gw = new Array(d).fill(0); let gb = 0;
    for (let i = 0; i < n; i++) {
      let z = b;
      for (let j = 0; j < d; j++) z += w[j] * X[i][j];
      const err = sigmoid(z) - y[i];
      for (let j = 0; j < d; j++) gw[j] += err * X[i][j];
      gb += err;
    }
    let maxGrad = Math.abs(gb / n);
    for (let j = 0; j < d; j++) {
      const g = gw[j] / n + LAMBDA * w[j];
      maxGrad = Math.max(maxGrad, Math.abs(g));
      w[j] -= LR * g;
    }
    b -= LR * (gb / n);
    if (maxGrad < TOL) { converged = true; break; }
  }
  const predict = (r) => {
    const x = encode(r);
    let z = b;
    for (let j = 0; j < d; j++) z += w[j] * (x[j] - mean[j]) / std[j];
    return sigmoid(z);
  };
  return { w, b, mean, std, iters, converged, predict };
}

function auc(scored) {
  const pos = scored.filter((s) => s.y === 1).map((s) => s.p);
  const neg = scored.filter((s) => s.y === 0).map((s) => s.p);
  let wins = 0;
  for (const pp of pos) for (const nn of neg) wins += pp > nn ? 1 : pp === nn ? 0.5 : 0;
  return wins / (pos.length * neg.length);
}
const accuracy = (scored) => scored.filter((s) => (s.p >= 0.5 ? 1 : 0) === s.y).length / scored.length;

// --- Final model on the full cohort (what the browser uses) ----------------
const model = fit(rows);
if (!model.converged) console.warn(`WARNING: gradient descent did not converge in ${MAX_ITERS} iterations`);
const trainScored = rows.map((r) => ({ p: model.predict(r), y: r.disease }));

// --- Stratified 10-fold cross-validation (seeded, standardization fit per fold)
let seed = 42;
const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const K = 10;
const fold = new Array(rows.length);
for (const cls of [0, 1]) {
  const idx = shuffle(rows.map((r, i) => (r.disease === cls ? i : -1)).filter((i) => i >= 0));
  idx.forEach((i, k) => { fold[i] = k % K; });
}
const oof = new Array(rows.length);
for (let k = 0; k < K; k++) {
  const m = fit(rows.filter((_, i) => fold[i] !== k));
  rows.forEach((r, i) => { if (fold[i] === k) oof[i] = { p: m.predict(r), y: r.disease }; });
}

const cm = { tp: 0, fp: 0, tn: 0, fn: 0 };
for (const s of oof) {
  const pred = s.p >= 0.5 ? 1 : 0;
  if (pred && s.y) cm.tp++; else if (pred) cm.fp++; else if (s.y) cm.fn++; else cm.tn++;
}

// ROC curve points (fpr, tpr) over every distinct threshold.
const P = oof.filter((s) => s.y).length, N = oof.length - P;
const sorted = [...oof].sort((a, b) => b.p - a.p);
const roc = [[0, 0]];
let tp = 0, fp = 0;
for (let i = 0; i < sorted.length; i++) {
  if (sorted[i].y) tp++; else fp++;
  if (i === sorted.length - 1 || sorted[i + 1].p !== sorted[i].p) roc.push([+(fp / N).toFixed(4), +(tp / P).toFixed(4)]);
}

// Calibration: deciles of predicted probability vs. observed disease rate.
const BINS = 10;
const byP = [...oof].sort((a, b) => a.p - b.p);
const calibration = [];
for (let bi = 0; bi < BINS; bi++) {
  const slice = byP.slice(Math.round((bi * byP.length) / BINS), Math.round(((bi + 1) * byP.length) / BINS));
  calibration.push({
    predicted: +(slice.reduce((a, s) => a + s.p, 0) / slice.length).toFixed(4),
    observed: +(slice.reduce((a, s) => a + s.y, 0) / slice.length).toFixed(4),
    n: slice.length,
  });
}

const metrics = {
  n: rows.length,
  dropped,
  train: { accuracy: accuracy(trainScored), auc: auc(trainScored) },
  cv: { folds: K, accuracy: accuracy(oof), auc: auc(oof), confusion: cm, roc, calibration },
  fit: { iterations: model.iters, converged: model.converged, lambda: LAMBDA },
};

const out = `// AUTO-GENERATED by scripts/process-data.mjs — do not edit by hand.
// Real data: UCI Heart Disease (Cleveland), Detrano et al. ${rows.length} patients after
// dropping ${dropped} rows with missing values. Risk model = standardized logistic regression
// with one-hot nominal features, fit in-repo.
// Stratified ${K}-fold CV: ROC-AUC ${metrics.cv.auc.toFixed(3)}, accuracy ${(metrics.cv.accuracy * 100).toFixed(1)}%
// (training-set fit: ROC-AUC ${metrics.train.auc.toFixed(3)}, accuracy ${(metrics.train.accuracy * 100).toFixed(1)}%).

export interface Patient {
  age: number; sex: number; cp: number; trestbps: number; chol: number;
  fbs: number; restecg: number; thalach: number; exang: number; oldpeak: number;
  slope: number; ca: number; thal: number; disease: number;
}

export const FEATURES = ${JSON.stringify(FEATURES)} as const;
export type Feature = (typeof FEATURES)[number];

/** Design-matrix columns. level === null → raw value; otherwise a one-hot indicator for that level. */
export interface Term { feature: Feature; level: number | null }
export const TERMS: Term[] = ${JSON.stringify(TERMS)};

// Standardization of each design column (training mean / population σ).
export const TERM_MEAN: number[] = ${JSON.stringify(model.mean)};
export const TERM_STD: number[] = ${JSON.stringify(model.std)};

// Logistic-regression coefficients on the STANDARDIZED design columns (same order as TERMS).
export const MODEL_COEF: number[] = ${JSON.stringify(model.w)};
export const MODEL_INTERCEPT = ${model.b};

export const MODEL_METRICS = ${JSON.stringify(metrics, null, 2)};

export const patients: Patient[] = ${JSON.stringify(rows)};
`;

mkdirSync(new URL('../src/data/', import.meta.url), { recursive: true });
writeFileSync(new URL('../src/data/patients.ts', import.meta.url), out);
console.log(`Wrote ${rows.length} patients (dropped ${dropped}). Converged=${model.converged} after ${model.iters} iterations.`);
console.log(`CV:    auc=${metrics.cv.auc.toFixed(3)} acc=${(metrics.cv.accuracy * 100).toFixed(1)}%  ${JSON.stringify(cm)}`);
console.log(`Train: auc=${metrics.train.auc.toFixed(3)} acc=${(metrics.train.accuracy * 100).toFixed(1)}%`);
console.log('Coefficients (standardized):');
console.log(TERMS.map((t, j) => `${t.feature}${t.level === null ? '' : '=' + t.level}: ${model.w[j].toFixed(2)}`).join('  '));
