import { afterEach, describe, expect, it } from 'vitest';
import { readGridVisible, readInterfaceLanguage, readTheme, readUniformWireColors } from '@ui/settings';

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
});
