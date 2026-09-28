import { describe, expect, it } from 'vitest';
import {
  encode,
  riskScore,
  riskContributions,
  riskBand,
  pcaInfo,
  pcaProjectInput,
  nearestNeighbors,
  clusterSummary,
  axisPosition,
  patientAxisPosition,
  patientInput,
  patients,
  RANGES,
  SCALE,
} from './analytics';
import { TERMS, TERM_MEAN, TERM_STD, MODEL_INTERCEPT, MODEL_METRICS } from '../data/patients';
import { FEATURE_META } from '../data/features';

const logit = (p: number) => Math.log(p / (1 - p));

describe('encoding', () => {
  it('one-hot encodes nominal features against their reference level', () => {
    const x = encode({ ...patientInput(patients[0]), cp: 4 });
    TERMS.forEach((t, j) => {
      if (t.feature !== 'cp') return;
      const raw = t.level === 4 ? 1 : 0;
      expect(x[j]).toBeCloseTo((raw - TERM_MEAN[j]) / TERM_STD[j]);
    });
  });

  it('never gives the reference level its own column', () => {
    expect(TERMS.some((t) => t.feature === 'cp' && t.level === 1)).toBe(false);
    expect(TERMS.some((t) => t.feature === 'thal' && t.level === 3)).toBe(false);
  });
});

describe('risk model', () => {
  it('contributions + intercept reproduce the logit exactly', () => {
    for (const p of patients.slice(0, 25)) {
      const input = patientInput(p);
      const sum = riskContributions(input).reduce((a, c) => a + c.contribution, 0);
      expect(sum + MODEL_INTERCEPT).toBeCloseTo(logit(riskScore(input)), 8);
    }
  });

  it('bands are anchored on the 0.5 decision threshold', () => {
    expect(riskBand(0.49).label).not.toBe('High risk');
    expect(riskBand(0.5).label).toBe('High risk');
    expect(riskBand(0.1).label).toBe('Low risk');
  });

  it('reports held-out metrics that are no better than the training fit', () => {
    expect(MODEL_METRICS.fit.converged).toBe(true);
    expect(MODEL_METRICS.cv.auc).toBeGreaterThan(0.85);
    expect(MODEL_METRICS.cv.auc).toBeLessThanOrEqual(MODEL_METRICS.train.auc);
    const { tp, fp, tn, fn } = MODEL_METRICS.cv.confusion;
    expect(tp + fp + tn + fn).toBe(patients.length);
  });
});

describe('projections', () => {
  it('projects a cohort patient onto its own PCA position', () => {
    const i = 17;
    const got = pcaProjectInput(patientInput(patients[i]));
    pcaInfo.positions[i].forEach((v, c) => expect(got[c]).toBeCloseTo(v, 6));
  });

  it('keeps every cohort patient inside the scene bounds on a feature axis', () => {
    for (const f of ['age', 'chol', 'cp', 'sex'] as const) {
      expect(axisPosition(f, RANGES[f].lo)).toBeCloseTo(-SCALE);
      expect(axisPosition(f, RANGES[f].hi)).toBeCloseTo(SCALE);
      patients.forEach((_, i) => expect(Math.abs(patientAxisPosition(i, f))).toBeLessThan(SCALE + 1));
    }
  });

  it('jitters discrete features but not continuous ones', () => {
    expect(patientAxisPosition(3, 'chol')).toBe(axisPosition('chol', patients[3].chol));
    const sexPositions = new Set(patients.map((_, i) => patientAxisPosition(i, 'sex').toFixed(3)));
    expect(sexPositions.size).toBeGreaterThan(2);
  });
});

describe('neighbours and clusters', () => {
  it('finds a cohort patient as its own nearest neighbour, and can exclude it', () => {
    const input = patientInput(patients[42]);
    expect(nearestNeighbors(input, 1)[0]).toEqual({ index: 42, distance: 0 });
    expect(nearestNeighbors(input, 5, 42).map((n) => n.index)).not.toContain(42);
  });

  it('summarizes clusters consistently', () => {
    for (let k = 2; k <= 6; k++) {
      const s = clusterSummary(k);
      expect(s.clusters.reduce((a, c) => a + c.n, 0)).toBe(patients.length);
      expect(s.purity).toBeGreaterThanOrEqual(0.5);
      expect(s.ari).toBeLessThanOrEqual(1);
    }
  });
});

describe('slider ranges', () => {
  it('cover every real patient so loading one never clamps', () => {
    for (const p of patients) {
      for (const [f, m] of Object.entries(FEATURE_META)) {
        if (m.kind !== 'numeric') continue;
        const v = p[f as keyof typeof p];
        expect(v).toBeGreaterThanOrEqual(m.min);
        expect(v).toBeLessThanOrEqual(m.max);
      }
    }
  });
});
