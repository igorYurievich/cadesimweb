import { describe, expect, it } from 'vitest';
import { createEngineInput, simulate } from '@engine/index';
import type { EngineMemory } from '@engine/index';
import { exportCad } from '@model/cad-export';
import { importCad } from '@model/cad-import';
import { cadTypeForCommand } from '@model/cad-types';
import { catalog } from '@model/catalog';
import { hasVerifiedBadge } from '@model/catalog-verification';
import {
  STAIR_TIMER_2D, STAIR_TIMER_COMMAND, STAIR_TIMER_DIAL, STAIR_TIMER_LABELS, STAIR_TIMER_POINTS, stairTimerMinutes,
  stairTimerWiring,
} from '@model/stair-timer';
import { el, schemaOf, seg } from './builders';

// Минутник Alst 8 (8110) в (30, 30): P (33, 30), 3 (39, 30), N (33, 57), 4 (39, 57).
// P от L1, N от N; лампа H1 от клеммы 3 к N; «кнопка» — провод от отдельной L1 к клемме 4 (есть, пока нажата).
const TIMER = 1;
const LAMP = 2;

function circuit(pressed: boolean, minutes = 1, supply = true, threeWire = false, wiring = threeWire ? 3 : 4) {
  const timer = el(STAIR_TIMER_2D, 30, 30, {
    id: TIMER, name: '-E1', terminals: STAIR_TIMER_POINTS.map((p, k) => [p.x, p.y, STAIR_TIMER_LABELS[k]!] as const),
  });
  timer.params = { minutes, wiring };
  const lamp = el(9008, 60, 18, { id: LAMP, name: '-H1', terminals: [[0, 0, 'X1'], [6, 0, 'X2']] });
  const wires = [
    seg(33, 69, 33, 57, { kind: 'neutral' }), seg(39, 30, 39, 18), seg(39, 18, 60, 18),
    seg(66, 18, 72, 18, { kind: 'neutral' }),
  ];
  if (supply) wires.push(seg(33, 18, 33, 30));
  if (pressed) wires.push(seg(39, 69, 39, 57));
  return schemaOf(wires, [
    timer, lamp,
    el(3000, 33, 18, { id: 3, terminals: [[0, 0, 'L1']] }), el(3001, 33, 69, { id: 4, terminals: [[0, 0, 'N']] }),
    el(threeWire ? 3001 : 3000, 39, 69, { id: 5, terminals: [[0, 0, threeWire ? 'N' : 'L1']] }),
    el(3001, 72, 18, { id: 6, terminals: [[0, 0, 'N']] }),
  ]);
}

/** Шаги [время, кнопка нажата, питание] → горит ли лампа. */
function trace(
  steps: ReadonlyArray<readonly [number, boolean, boolean?]>, minutes = 1, toggled = false, threeWire = false,
  wiring?: 3 | 4,
): boolean[] {
  let memory: EngineMemory | undefined;
  return steps.map(([time, pressed, supply = true]) => {
    const input = createEngineInput(circuit(pressed, minutes, supply, threeWire, wiring), time);
    if (toggled) input.inputs.toggled[TIMER] = true;
    const state = simulate({ ...input, memory });
    memory = state.memory;
    return state.lamps[LAMP] ?? false;
  });
}

describe('staircase light timer Alst 8 (8110)', () => {
  it('is a 2D palette item with dial marks 1…7 min only', () => {
    expect(cadTypeForCommand(STAIR_TIMER_COMMAND)?.code).toBe(STAIR_TIMER_2D);
    expect(catalog.getById(STAIR_TIMER_COMMAND)?.groups).toEqual(['realistic-2d']);
    expect(hasVerifiedBadge('realistic-2d', STAIR_TIMER_COMMAND)).toBe(true);
    expect(STAIR_TIMER_DIAL).toEqual([1, 1.5, 2, 3, 4, 5, 6, 7]);
    expect([0.2, 1.4, 2.4, 9, Number.NaN].map((minutes) => stairTimerMinutes({ params: { minutes } })))
      .toEqual([1, 1.5, 2, 7, 1]);
  });

  it('lights the lamp on a push and keeps it for the dial time after release', () => {
    expect(trace([[0, false], [1, true], [2, false], [40, false], [61.5, false], [62.5, false]]))
      .toEqual([false, true, true, true, true, false]);
  });

  it('works with the push buttons on N in 3-wire mode (textbook fig. 2.5) and on L in 4-wire mode', () => {
    expect(trace([[0, false], [1, true], [2, false], [61.5, false], [62.5, false]], 1, false, true))
      .toEqual([false, true, true, true, false]);
    expect(stairTimerWiring({ params: {} })).toBe(3);
  });

  it('does not react when the buttons do not match the selected wiring', () => {
    expect(trace([[0, true]], 1, false, false, 3)).toEqual([false]);
    expect(trace([[0, true]], 1, false, true, 4)).toEqual([false]);
  });

  it('restarts the countdown on a new push and uses the selected minutes', () => {
    expect(trace([[0, true], [1, false], [50, true], [51, false], [100, false], [112, false]]))
      .toEqual([true, true, true, true, true, false]);
    expect(trace([[0, true], [1, false], [80, false], [92, false]], 1.5)).toEqual([true, true, true, false]);
  });

  it('switches off at once without supply and stays on with the permanent-light slider', () => {
    expect(trace([[0, true], [1, false], [2, false, false]])).toEqual([true, true, false]);
    expect(trace([[0, false], [500, false]], 1, true)).toEqual([true, true]);
  });

  it('keeps the dial value and the wiring in .cad', () => {
    for (const [minutes, threeWire] of [[4, false], [1.5, true]] as const) {
      const again = importCad(exportCad(circuit(false, minutes, true, threeWire)));
      const timer = again.schema.elements.find((e) => e.typeCode === STAIR_TIMER_2D);
      expect([again.unknownTypes, timer?.params.minutes, timer?.params.wiring, timer?.terminals.map((t) => t.label)])
        .toEqual([[], minutes, threeWire ? 3 : 4, [...STAIR_TIMER_LABELS]]);
    }
  });
});
