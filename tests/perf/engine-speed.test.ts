/**
 * Замер скорости движка на большой схеме. Не даёт вернуть квадратичные места: граф цепей на
 * каждой итерации, поиск по имени перебором всей схемы и т. п. (раньше 440 элементов — 168 мс на кадр).
 */

import { describe, expect, it } from 'vitest';
import { createEmptyInputs, createEmptyMemory, simulate } from '../../src/engine';
import type { EngineMemory } from '../../src/engine';
import { tiledSchema } from './tiled-schema';

/** Бюджет кадра для схемы из ~500 элементов: 8 мс, чтобы с отрисовкой укладываться в 60 кадров/с. */
const FRAME_BUDGET_MS = 8;
/** Кадр с переключениями: релейный цикл меняет катушки по одной, бюджет — на каждую итерацию. */
const ITERATION_BUDGET_MS = 4;

const median = (values: number[]): number => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] as number;
};

describe('скорость движка', () => {
  const schema = tiledSchema(12);
  const buttons = schema.elements.filter((element) => element.typeCode >= 8000 && element.typeCode <= 8007);

  it('схема для замера — больше 500 элементов', () => {
    expect(schema.elements.length).toBeGreaterThanOrEqual(500);
    expect(buttons.length).toBeGreaterThan(0);
  });

  it(`кадр схемы из 500+ элементов считается быстрее ${FRAME_BUDGET_MS} мс`, () => {
    const inputs = createEmptyInputs();
    let memory: EngineMemory = createEmptyMemory();
    let time = 0;
    const frame = (): number => {
      const start = performance.now();
      memory = simulate({ schema, inputs, time, memory }).memory;
      time += 1 / 60;
      return performance.now() - start;
    };
    // Первый кадр строит граф цепей (кэш по геометрии), дальше — обычные кадры.
    for (let i = 0; i < 5; i += 1) frame();
    for (const button of buttons) inputs.pressed[button.id] = true;
    frame();
    for (const button of buttons) inputs.pressed[button.id] = false;
    const times = Array.from({ length: 31 }, frame);
    expect(median(times)).toBeLessThan(FRAME_BUDGET_MS);
  });

  it(`кадр с переключениями тратит меньше ${ITERATION_BUDGET_MS} мс на итерацию релейного цикла`, () => {
    const samples: number[] = [];
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const inputs = createEmptyInputs();
      let memory: EngineMemory = simulate({ schema, inputs, time: 0, memory: createEmptyMemory() }).memory;
      for (const button of buttons) inputs.pressed[button.id] = true;
      const start = performance.now();
      const state = simulate({ schema, inputs, time: 0.1, memory });
      memory = state.memory;
      expect(state.iterations).toBeGreaterThan(1);
      samples.push((performance.now() - start) / state.iterations);
    }
    expect(median(samples)).toBeLessThan(ITERATION_BUDGET_MS);
  });
});
