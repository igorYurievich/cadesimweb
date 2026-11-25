import { describe, expect, it } from 'vitest';
import { buildNets } from '@engine/graph';
import { cachedNets } from '@engine/topology';
import { jsonEqual } from '@engine/json-equal';
import { tiledSchema } from './perf/tiled-schema';

describe('кэш графа цепей', () => {
  it('для той же геометрии отдаёт тот же граф, не строя заново', () => {
    const schema = tiledSchema(1);
    const first = cachedNets(schema);
    expect(cachedNets(schema)).toBe(first);
    // Копия схемы с той же геометрией (например, после отмены правки) тоже берётся из кэша.
    expect(cachedNets(structuredClone(schema))).toBe(first);
    expect(first).toEqual(buildNets(schema));
  });

  it('перестраивает граф, когда сдвинули провод, элемент или поменяли тип провода', () => {
    const schema = tiledSchema(1);
    const before = cachedNets(schema);
    const wire = schema.wires.find((candidate) => candidate.kind !== 'junction')!;
    wire.to = { x: wire.to.x + 600, y: wire.to.y + 600 };
    const moved = cachedNets(schema);
    expect(moved).not.toBe(before);
    expect(moved).toEqual(buildNets(schema));

    const element = schema.elements.find((candidate) => candidate.terminals.length > 0)!;
    element.position = { x: element.position.x + 3, y: element.position.y };
    expect(cachedNets(schema)).toEqual(buildNets(schema));

    wire.typeCode = wire.typeCode === 4009 ? 4000 : 4009;
    expect(cachedNets(schema)).toEqual(buildNets(schema));
  });
});

describe('jsonEqual', () => {
  const cases: unknown[] = [
    0, -0, 1, NaN, Infinity, null, undefined, 'a', true, false, [], {}, [1, 2], [2, 1], [undefined], [null],
    { a: 1 }, { a: 1, b: undefined }, { b: 1, a: 1 }, { a: 1, b: 1 }, { a: { b: [1, { c: 2 }] } },
    { a: { b: [1, { c: 3 }] } }, { phase: 'idle', elapsed: 0, lastTime: 0.1 }, { phase: 'idle', elapsed: 0 },
    { a: NaN }, { a: null }, { 1: { q: true }, 2: { q: false } }, { 2: { q: false }, 1: { q: true } },
  ];
  it('совпадает с JSON.stringify(a) === JSON.stringify(b)', () => {
    for (const a of cases) for (const b of cases) {
      const expected = JSON.stringify(a) === JSON.stringify(b);
      expect(jsonEqual(a, b), `${JSON.stringify(a)} ~ ${JSON.stringify(b)}`).toBe(expected);
    }
  });

  it('пропускает указанные поля на любой глубине', () => {
    const ignore = new Set(['lastTime']);
    const timers = (elapsed: number, lastTime: number) => ({ t: { 1: { elapsed, lastTime } } });
    expect(jsonEqual(timers(1, 1), timers(1, 2), ignore)).toBe(true);
    expect(jsonEqual(timers(1, 1), timers(2, 1), ignore)).toBe(false);
  });
});
