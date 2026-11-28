import { afterEach, describe, expect, it } from 'vitest';
import { orthogonalize, simplifyRoute, straightenFromAnchor } from '@ui/wire-routing';
import { readSmartWireRouting } from '@ui/options-menu';

const values = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
  },
});
afterEach(() => values.clear());

describe('option «Умная прокладка кабеля»', () => {
  it('is on by default and remembers being switched off', () => {
    expect(readSmartWireRouting()).toBe(true);
    values.set('cadesimu-smart-wire', '0');
    expect(readSmartWireRouting()).toBe(false);
    values.set('cadesimu-smart-wire', '1');
    expect(readSmartWireRouting()).toBe(true);
  });

  it('off: mostly-down drag gives a pure vertical segment (L1 → F1 without the side jog)', () => {
    const l1 = { x: 20, y: 25 };
    const cursor = { x: 30, y: 62.5 };
    const end = straightenFromAnchor(cursor, l1);
    expect(end).toEqual({ x: 20, y: 62.5 });
    expect(simplifyRoute(orthogonalize([l1, end]))).toEqual([l1, end]);
  });

  it('off: mostly-sideways drag gives a pure horizontal segment', () => {
    expect(straightenFromAnchor({ x: 80, y: 33 }, { x: 20, y: 30 })).toEqual({ x: 80, y: 30 });
  });

  it('first click (no anchor yet) is not changed', () => {
    expect(straightenFromAnchor({ x: 7, y: 9 }, undefined)).toEqual({ x: 7, y: 9 });
  });
});
