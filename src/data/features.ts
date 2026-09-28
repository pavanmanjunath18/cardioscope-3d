import { patients, type Feature } from './patients';

export interface FeatureMeta {
  key: Feature;
  label: string;       // short axis label
  name: string;        // full clinical name
  unit?: string;
  desc: string;        // tooltip / clinical note
  kind: 'numeric' | 'categorical';
  min: number;
  max: number;
  step: number;
  default: number;
  options?: { value: number; label: string }[]; // for categorical
}

const META: Record<Feature, FeatureMeta> = {
  age: {
    key: 'age', label: 'Age', name: 'Age', unit: 'yrs',
    desc: 'Patient age in years.',
    kind: 'numeric', min: 25, max: 80, step: 1, default: 54,
  },
  sex: {
    key: 'sex', label: 'Sex', name: 'Sex',
    desc: 'Biological sex. Male patients show markedly higher prevalence in this cohort.',
    kind: 'categorical', min: 0, max: 1, step: 1, default: 1,
    options: [{ value: 0, label: 'Female' }, { value: 1, label: 'Male' }],
  },
  cp: {
    key: 'cp', label: 'Chest pain', name: 'Chest pain type',
    desc: 'Type of chest pain. Asymptomatic presentation is paradoxically the highest-risk group.',
    kind: 'categorical', min: 1, max: 4, step: 1, default: 4,
    options: [
      { value: 1, label: 'Typical angina' },
      { value: 2, label: 'Atypical angina' },
      { value: 3, label: 'Non-anginal' },
      { value: 4, label: 'Asymptomatic' },
    ],
  },
  trestbps: {
    key: 'trestbps', label: 'Resting BP', name: 'Resting blood pressure', unit: 'mmHg',
    desc: 'Resting systolic blood pressure on admission.',
    kind: 'numeric', min: 90, max: 200, step: 1, default: 131,
  },
  chol: {
    key: 'chol', label: 'Cholesterol', name: 'Serum cholesterol', unit: 'mg/dl',
    desc: 'Serum cholesterol.',
    kind: 'numeric', min: 120, max: 420, step: 1, default: 246,
  },
  fbs: {
    key: 'fbs', label: 'Fasting sugar', name: 'Fasting blood sugar > 120 mg/dl',
    desc: 'Whether fasting blood sugar exceeds 120 mg/dl.',
    kind: 'categorical', min: 0, max: 1, step: 1, default: 0,
    options: [{ value: 0, label: 'No (≤120)' }, { value: 1, label: 'Yes (>120)' }],
  },
  restecg: {
    key: 'restecg', label: 'Rest ECG', name: 'Resting ECG result',
    desc: 'Resting electrocardiographic results.',
    kind: 'categorical', min: 0, max: 2, step: 1, default: 0,
    options: [
      { value: 0, label: 'Normal' },
      { value: 1, label: 'ST-T abnormality' },
      { value: 2, label: 'LV hypertrophy' },
    ],
  },
  thalach: {
    key: 'thalach', label: 'Max HR', name: 'Max heart rate achieved', unit: 'bpm',
    desc: 'Maximum heart rate reached during exercise testing. A lower peak signals poorer exercise tolerance — a strong risk signal.',
    kind: 'numeric', min: 70, max: 205, step: 1, default: 150,
  },
  exang: {
    key: 'exang', label: 'Exer. angina', name: 'Exercise-induced angina',
    desc: 'Angina induced by exercise.',
    kind: 'categorical', min: 0, max: 1, step: 1, default: 0,
    options: [{ value: 0, label: 'No' }, { value: 1, label: 'Yes' }],
  },
  oldpeak: {
    key: 'oldpeak', label: 'ST depr.', name: 'ST depression (oldpeak)',
    desc: 'ST depression induced by exercise relative to rest.',
    kind: 'numeric', min: 0, max: 6.2, step: 0.1, default: 1.0,
  },
  slope: {
    key: 'slope', label: 'ST slope', name: 'Slope of peak exercise ST',
    desc: 'Slope of the peak exercise ST segment.',
    kind: 'categorical', min: 1, max: 3, step: 1, default: 2,
    options: [
      { value: 1, label: 'Upsloping' },
      { value: 2, label: 'Flat' },
      { value: 3, label: 'Downsloping' },
    ],
  },
  ca: {
    key: 'ca', label: 'Vessels', name: 'Major vessels (fluoroscopy)',
    desc: 'Number of major vessels (0–3) colored by fluoroscopy. The single strongest predictor in the fitted model.',
    kind: 'categorical', min: 0, max: 3, step: 1, default: 0,
    options: [
      { value: 0, label: '0 vessels' },
      { value: 1, label: '1 vessel' },
      { value: 2, label: '2 vessels' },
      { value: 3, label: '3 vessels' },
    ],
  },
  thal: {
    key: 'thal', label: 'Thalassemia', name: 'Thalassemia (perfusion)',
    desc: 'Thallium stress-test perfusion result.',
    kind: 'categorical', min: 3, max: 7, step: 1, default: 3,
    options: [
      { value: 3, label: 'Normal' },
      { value: 6, label: 'Fixed defect' },
      { value: 7, label: 'Reversible defect' },
    ],
  },
};

// Numeric sliders span the full cohort range, so any real patient (e.g. from
// "load random patient") can be represented exactly.
for (const m of Object.values(META)) {
  if (m.kind !== 'numeric') continue;
  const vals = patients.map((p) => p[m.key]);
  m.min = Math.min(m.min, ...vals);
  m.max = Math.max(m.max, ...vals);
}

export const FEATURE_META = META;
