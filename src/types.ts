import type { Feature } from './data/patients';

export type ColorMode = 'diagnosis' | 'risk' | 'cluster';
export type PosMode = 'pca' | 'features';

export interface Axes {
  x: Feature;
  y: Feature;
  z: Feature;
}

export interface ViewState {
  colorMode: ColorMode;
  posMode: PosMode;
  axes: Axes;
  k: number;
}
