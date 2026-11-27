import { afterEach, describe, expect, it } from 'vitest';
import {
  readGridVisible, readInterfaceLanguage, readOptionalPaletteGroups, readTheme, readUniformWireColors, writeOptionalPaletteGroups,
} from '@ui/settings';

const values = new Map<string, string>();
const storage: Storage = {
  get length() { return values.size; },
  clear: () => values.clear(),
  getItem: (key) => values.get(key) ?? null,
  key: (index) => [...values.keys()][index] ?? null,
  removeItem: (key) => { values.delete(key); },
  setItem: (key, value) => { values.set(key, value); },
};

Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage });

afterEach(() => values.clear());

describe('persisted UI settings', () => {
  it('uses the existing defaults when no saved preference exists', () => {
    expect(readInterfaceLanguage()).toBe('es');
    expect(readGridVisible()).toBe(true);
    expect(readUniformWireColors()).toBe(true);
  });

  it('accepts only supported language codes and retains the selected theme', () => {
    values.set('cadesimu-language', 'ru');
    values.set('cadesimu-theme', 'dark');
    expect(readInterfaceLanguage()).toBe('ru');
    expect(readTheme()).toBe('dark');
    values.set('cadesimu-language', 'unsupported');
    expect(readInterfaceLanguage()).toBe('es');
    values.set('cadesimu-language', 'ar');
    expect(readInterfaceLanguage()).toBe('es');
  });

  it('preserves the existing grid and wire-color preferences', () => {
    values.set('cadesimu-grid', 'off');
    values.set('cadesimu-wire-colors', 'phase');
    expect(readGridVisible()).toBe(false);
    expect(readUniformWireColors()).toBe(false);
  });

  it('shows realistic 2D, PLC I/O, power electronics, electronic relays and sensors by default until turned off', () => {
    const defaults = ['realistic-2d', 'io-plc', 'power-electronics', 'electronic-relays', 'sensors'];
    expect(readOptionalPaletteGroups()).toEqual(defaults);
    values.set('cadesimu-visible-optional-groups:v1', JSON.stringify(['grafcet']));
    expect(readOptionalPaletteGroups()).toEqual(['grafcet', ...defaults]);
    writeOptionalPaletteGroups(new Set(['grafcet']));
    expect(readOptionalPaletteGroups()).toEqual(['grafcet']);
    writeOptionalPaletteGroups(new Set(['grafcet', 'sensors', 'installations']));
    expect(readOptionalPaletteGroups()).toEqual(['grafcet', 'sensors', 'installations']);
  });
});
