# CardioScope 3D — Cardiovascular Risk Explorer

An interactive **3D data-analytics application** that turns a real clinical dataset into an explorable space. Every one of the 297 patients in the UCI Heart Disease (Cleveland) cohort is rendered as a point in 3D; you can re-project the cloud, cluster it, color it by model risk, and drop your own simulated patient into the same space to see where they land.

Built to demonstrate the full data-science loop — **ingestion → dimensionality reduction → unsupervised clustering → a predictive model → a real-time, explainable interface** — not just a chart.

---

## What it does

| Feature | What's happening under the hood |
|---|---|
| **3D patient cloud** | All 297 patients plotted as a live, orbitable point cloud with bloom-lit rendering. |
| **PCA projection** | 13 standardized clinical features compressed to 3 principal components (≈46% variance in the top 3) for the default spatial layout. |
| **Custom feature axes** | Swap any of the 13 features onto the X/Y/Z axes to inspect raw relationships. |
| **k-means clustering** | Unsupervised k-means (k = 2–6) on standardized features — *diagnosis labels are never used*, so emergent clusters can be compared against true diagnosis. |
| **Risk model** | A logistic-regression classifier (trained in-repo) scores any patient's probability of heart disease. **ROC-AUC 0.924, 84.8% training accuracy.** |
| **Cardiac risk simulator** | Adjust 13 inputs and watch a 3D heart beat faster and redden as risk rises, with the live probability and an explainable "top factors" breakdown of the log-odds contributions. |
| **Plot yourself in 3D** | Your simulated patient is projected into the same PCA/feature space so you can see which neighborhood — and which real patients — you sit among. |

## The data

- **Source:** [UCI Heart Disease Data Set](https://archive.ics.uci.edu/dataset/45/heart+disease) (Cleveland), Detrano et al.
- **Cohort:** 303 patients → 297 after dropping 6 rows with missing values (standard practice for this dataset).
- **Target:** binarized to *disease present* (angiographic narrowing > 50%) vs. *healthy*.
- All preprocessing and model fitting are reproducible via [`scripts/process-data.mjs`](scripts/process-data.mjs), which emits the typed data module the app consumes.

> ⚕️ **Disclaimer:** This is an educational data-visualization demo, *not* a diagnostic tool.

## Methods

- **Standardization** — every feature is z-scored using training mean/σ; the same transform is applied to live simulator input so the model and projections stay consistent.
- **PCA** — computed on the standardized covariance via `ml-pca`; scores normalized per-component to fill the scene.
- **k-means** — `ml-kmeans` with k-means++ init and a fixed seed for stable, reproducible clusters.
- **Logistic regression** — batch gradient descent with L2 regularization, fit offline so the browser model is deterministic; coefficients are reported on standardized features, which makes the "top factors" panel a direct read of each variable's pull on the log-odds. The strongest drivers (vessel count, thalassemia perfusion, asymptomatic chest pain) match the established cardiology literature.

## Tech stack

- **React 18 + TypeScript + Vite**
- **react-three-fiber / three.js / drei** — 3D scene, instanced point cloud, procedural beating-heart geometry
- **@react-three/postprocessing** — selective bloom
- **ml-pca / ml-kmeans** — in-browser analytics
- **Tailwind CSS + Framer Motion + Lucide** — HUD and motion

## Run locally

```bash
npm install
npm run dev          # http://localhost:5173

# regenerate data + model from the raw UCI file
curl -fsSL "https://archive.ics.uci.edu/ml/machine-learning-databases/heart-disease/processed.cleveland.data" -o /tmp/cleveland.data
node scripts/process-data.mjs /tmp/cleveland.data

npm run build        # type-check + production build
npm run lint
```

## Project structure

```
src/
  data/
    patients.ts      # AUTO-GENERATED: cleaned cohort + model coefficients + metrics
    features.ts      # clinical metadata (labels, units, input specs) for all 13 features
  lib/
    analytics.ts     # PCA, k-means, risk scoring, color/positioning helpers
  components/
    Scene.tsx        # main R3F canvas, axes, hover tooltips, bloom
    PatientCloud.tsx # instanced, animated 3D scatter of all patients
    UserMarker.tsx   # the pulsing "you" marker projected into the same space
    Heart.tsx        # procedural beating heart driven by live risk
    ControlPanel.tsx # layout + color-mode controls
    RiskPanel.tsx    # risk simulator inputs, score, factor breakdown
    Header.tsx
scripts/
  process-data.mjs   # reproducible data cleaning + model training
```

---

Built by **Pavan Venkata Manjunath Mallipudi** — CS + Data Science, Arizona State University.
