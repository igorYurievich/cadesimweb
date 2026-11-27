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
    expect(isPaletteItemShown('power-sources', 32995, true)).toBe(false);
    expect(isPaletteItemShown('power-sources', 32995, false)).toBe(true);
    expect(isPaletteItemShown('manual-controls', 32909, true)).toBe(true);
    expect(isPaletteItemShown('realistic-2d', 33340, true)).toBe(true);
    expect(isPaletteItemShown('realistic-2d', 33319, true)).toBe(true); // клемма 2D «Borna»
  });

  it('never shows the socket relays, LED, push-button station and generic boxes of the 2D panel', () => {
    for (const id of [33313, 33314, 33371, 33323, 33363, 33364, 33365]) {
      expect(isPaletteItemShown('realistic-2d', id, false)).toBe(false);
    }
  });

  it('never shows the pressure, vacuum and thermostat switches for now', () => {
    for (const id of HIDDEN_PALETTE_COMMANDS) {
      expect(isPaletteItemShown('sensors', id, true)).toBe(false);
      expect(isPaletteItemShown('sensors', id, false)).toBe(false);
    }
  });

  it('never shows the elements that will not be implemented (wires +/−, GRAFCET links, PC_SIMU, S7-1500 I/O, Arduino…)', () => {
    const dropped: [Parameters<typeof isPaletteItemShown>[0], number][] = [
      ['ladder', 33035], ['ladder', 33037], ['wiring', 33035], ['wiring', 33037],
      ['grafcet', 33101], ['grafcet', 33102], ['grafcet', 33090], ['grafcet', 33091], ['grafcet', 33096],
      ['io-plc', 33108], ['io-plc', 33109], ['io-plc', 33328], ['io-plc', 33275], ['io-plc', 33276], ['io-plc', 33324],
      ['realistic-2d', 33374], ['realistic-3d', 33376], ['motors', 33257],
    ];
    for (const [group, id] of dropped) expect(isPaletteItemShown(group, id, false)).toBe(false);
    expect(isPaletteItemShown('io-plc', 33240, true)).toBe(true); // S7-1200 остаётся
  });
});
