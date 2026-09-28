import { describe, expect, it } from 'vitest';
import { decodeState, encodeState, DEFAULT_STATE, type AppState } from './urlState';

describe('URL state', () => {
  it('round-trips a full state', () => {
    const s: AppState = {
      view: { posMode: 'features', colorMode: 'cluster', k: 5, axes: { x: 'chol', y: 'oldpeak', z: 'cp' } },
      input: { ...DEFAULT_STATE.input, age: 67, cp: 2, oldpeak: 2.3, chol: 564 },
      showUser: false,
    };
    expect(decodeState('#' + encodeState(s))).toEqual(s);
  });

  it('falls back to defaults for junk or out-of-range values', () => {
    const s = decodeState('#pos=nope&color=x&k=99&axes=a,b,c&in=1,2,3');
    expect(s).toEqual(DEFAULT_STATE);
    const bad = decodeState(`#in=${Array(13).fill('999').join(',')}`);
    expect(bad.input).toEqual(DEFAULT_STATE.input);
  });
});
