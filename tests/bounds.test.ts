import { describe, expect, it } from 'vitest';
import { clampDeltaToSheet, clampPointToSheet } from '../src/ui/bounds';

const area = { width: 420, height: 297 };

describe('границы листа', () => {
  it('точка не выходит за лист и остаётся на сетке', () => {
    expect(clampPointToSheet({ x: -50, y: 999 }, area)).toEqual({ x: 0, y: 297 });
    expect(clampPointToSheet({ x: 500, y: 100.4 }, area)).toEqual({ x: 420, y: 99 });
  });
  it('сдвиг группы ограничивается краями листа', () => {
    const group = { minX: 30, minY: 30, maxX: 60, maxY: 50 };
    expect(clampDeltaToSheet({ x: -100, y: -100 }, group, area)).toEqual({ x: -30, y: -30 });
    expect(clampDeltaToSheet({ x: 900, y: 900 }, group, area)).toEqual({ x: 360, y: 246 });
    expect(clampDeltaToSheet({ x: 9, y: -6 }, group, area)).toEqual({ x: 9, y: -6 });
  });
});
