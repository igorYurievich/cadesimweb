import { describe, expect, it } from 'vitest';
import { catalog } from '@model/catalog';
import { hasBigPaletteIcon } from '@ui/big-icons';
import { readStoredPaletteView } from '@ui/palette-view-toggle';
import { PALETTE_VIEW_KEY } from '@ui/constants';
import { isPaletteItemShown } from '@ui/palette-filter';
import type { GroupKey } from '@model/catalog';

/** Категории, где все проверенные элементы нарисованы крупными значками. */
const GROUPS_WITH_BIG_ICONS: readonly GroupKey[] = [
  'power-sources', 'fuses', 'protection', 'contactors', 'motors', 'power-electronics', 'aux-contacts',
  'manual-controls', 'mechanisms', 'installations', 'sensors', 'coils-signaling', 'ladder', 'grafcet',
  'io-plc', 'realistic-2d', 'electronic-relays',
];

describe('крупные значки палитры', () => {
  it('у каждого элемента «Ручного управления» есть крупный значок', () => {
    const items = catalog.components.filter((item) => item.groups.includes('manual-controls'));
    expect(items.length).toBeGreaterThan(0);
    expect(items.filter((item) => !hasBigPaletteIcon(item.id)).map((item) => item.id)).toEqual([]);
  });

  it('у каждого проверенного элемента нарисованных категорий есть крупный значок', () => {
    const missing = GROUPS_WITH_BIG_ICONS.flatMap((group) => catalog.components
      .filter((item) => item.groups.includes(group) && isPaletteItemShown(group, item.id, true))
      .filter((item) => !hasBigPaletteIcon(item.id))
      .map((item) => `${group}:${item.id}`));
    expect(missing).toEqual([]);
  });

  it('вид палитры: по умолчанию значки, список — только если сохранено «list»', () => {
    const store = new Map<string, string>();
    const memory = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => { store.set(key, value); },
    };
    Object.defineProperty(globalThis, 'localStorage', { value: memory, configurable: true });
    try {
      expect(readStoredPaletteView()).toBe('grid');
      store.set(PALETTE_VIEW_KEY, 'icons');
      expect(readStoredPaletteView()).toBe('grid');
      store.set(PALETTE_VIEW_KEY, 'grid');
      expect(readStoredPaletteView()).toBe('grid');
      store.set(PALETTE_VIEW_KEY, 'list');
      expect(readStoredPaletteView()).toBe('list');
    } finally {
      Reflect.deleteProperty(globalThis, 'localStorage');
    }
  });
});
