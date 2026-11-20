import { afterEach, describe, expect, it } from 'vitest';
import { HIDDEN_PALETTE_COMMANDS, isPaletteItemShown, readVerifiedOnly, writeVerifiedOnly } from '../src/ui/palette-filter';

const values = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
  },
});
afterEach(() => values.clear());

describe('palette filter: verified components only', () => {
  it('is on by default and remembers «show all»', () => {
    expect(readVerifiedOnly()).toBe(true);
    writeVerifiedOnly(false);
    expect(readVerifiedOnly()).toBe(false);
  });

  it('hides components without the green mark until «show all» is chosen', () => {
    expect(isPaletteItemShown('manual-controls', 33278, true)).toBe(false);
    expect(isPaletteItemShown('manual-controls', 33278, false)).toBe(true);
    expect(isPaletteItemShown('manual-controls', 32909, true)).toBe(true);
    expect(isPaletteItemShown('realistic-2d', 33340, true)).toBe(true);
  });

  it('never shows the socket relays, LED, push-button station, terminal and generic boxes of the 2D panel', () => {
    for (const id of [33313, 33314, 33371, 33323, 33319, 33363, 33364, 33365]) {
      expect(isPaletteItemShown('realistic-2d', id, false)).toBe(false);
    }
  });

  it('never shows the pressure, vacuum and thermostat switches for now', () => {
    for (const id of HIDDEN_PALETTE_COMMANDS) {
      expect(isPaletteItemShown('sensors', id, true)).toBe(false);
      expect(isPaletteItemShown('sensors', id, false)).toBe(false);
    }
  });
});
