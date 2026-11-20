import { describe, expect, it } from 'vitest';
import { createEngineInput, simulate } from '@engine/index';
import type { EngineMemory } from '@engine/types';
import { terminalPosition } from '@model/geometry';
import { PLC_BLOCK } from '@model/plc-blocks';
import { createEmptySchema } from '@model/types';
import type { Point, Schema, SchemaElement } from '@model/types';
import { createPlacedElement } from '../src/ui/helpers';
import { exportCad } from '@model/cad-export';
import { importCad } from '@model/cad-import';
import { fixture } from './helpers';

// Ladder между шинами «+» (x = 0) и «−» (x = 120): кнопки 8000 (повёрнуты на 270°, выводы по горизонтали) дают входы.
const RAIL_MINUS = 120;

function ladder() {
  const schema = createEmptySchema();
  const nextId = (): number =>
    Math.max(0, ...schema.elements.map((e) => e.id), ...schema.wires.map((w) => w.id)) + 1;
  const wire = (a: Point, b: Point): void => {
    const mid = { x: b.x, y: a.y };
    for (const [from, to] of [[a, mid], [mid, b]] as const) {
      if (from.x === to.x && from.y === to.y) continue;
      const id = nextId();
      schema.wires.push({
        id, typeCode: 4000, kind: 'phase', from: { ...from }, to: { ...to }, thickness: 1, dot: false,
      });
    }
  };
  const place = (code: number, at: Point, name: string, rotation: 0 | 3 = 0): SchemaElement => {
    const element = createPlacedElement(code, at, rotation, schema);
    const first = element.terminals[0]?.offset ?? { x: 0, y: 0 };
    element.position = { x: at.x - first.x, y: at.y - first.y };
    element.name = name;
    schema.elements.push(element);
    return element;
  };
  const end = (element: SchemaElement, index = element.terminals.length - 1): Point =>
    terminalPosition(element, index) as Point;
  for (const [code, x] of [[3008, 0], [3009, RAIL_MINUS]] as const) {
    place(code, { x, y: 0 }, '-X');
    wire({ x, y: 0 }, { x, y: 300 });
  }
  /** Ступень: элементы по очереди от шины «+» до шины «−». */
  const rung = (y: number, parts: ReadonlyArray<readonly [number, string]>): SchemaElement[] => {
    let at: Point = { x: 0, y };
    return parts.map(([code, name]) => {
      const start = { x: at.x + 6, y };
      wire(at, start);
      const element = place(code, start, name, code === 8000 ? 3 : 0);
      at = end(element);
      return element;
    }).map((element, index, all) => {
      if (index === all.length - 1) wire(end(element), { x: RAIL_MINUS, y: end(element).y });
      return element;
    });
  };
  return { schema, place, wire, rung, end };
}

function runner(schema: Schema) {
  let memory: EngineMemory | undefined;
  return (pressed: SchemaElement[] = [], time = 0) => {
    const input = createEngineInput(schema, time);
    input.inputs.pressed = Object.fromEntries(pressed.map((element) => [element.id, true]));
    if (memory) input.memory = memory;
    const state = simulate(input);
    memory = state.memory;
    return state.coils;
  };
}

describe('Ladder: contacts, Set/Reset and edges', () => {
  it('latches with Set and releases with Reset', () => {
    const l = ladder();
    const [s] = l.rung(10, [[8000, 'S1'], [10061, 'M1']]);
    const [r] = l.rung(40, [[8000, 'S2'], [10062, 'M1']]);
    l.rung(70, [[10050, 'M1'], [10060, 'Y']]);
    const run = runner(l.schema);
    expect(run().Y).toBe(false);
    expect(run([s!]).Y).toBe(true);
    expect(run().Y).toBe(true);
    expect(run([r!]).Y).toBe(false);
    expect(run().Y).toBe(false);
  });

  it('rising and falling edge contacts conduct for one scan, First Scan only once', () => {
    const l = ladder();
    const [b] = l.rung(10, [[8000, 'S1'], [10060, 'X']]);
    l.rung(40, [[10052, 'X'], [10060, 'P']]);
    l.rung(70, [[10053, 'X'], [10060, 'N']]);
    l.rung(100, [[10076, 'FIRST'], [10060, 'F']]);
    const run = runner(l.schema);
    expect(run().F).toBe(true);
    expect(run().F).toBe(false);
    const pressed = run([b!]);
    expect([pressed.P, pressed.N]).toEqual([true, false]);
    expect(run([b!]).P).toBe(false);
    const released = run();
    expect([released.P, released.N]).toEqual([false, true]);
    expect(run().N).toBe(false);
  });
});

describe('Ladder: function blocks', () => {
  /** Блок: входы от кнопок, выход на катушку Y. */
  function block(code: number, inputs: number, params: Record<string, number> = {}) {
    const l = ladder();
    const unit = l.place(code, { x: 60, y: 10 }, '-B');
    Object.assign(unit.params, params);
    const buttons = Array.from({ length: inputs }, (_, k) => {
      const button = l.place(8000, { x: 6, y: 10 + 6 * k }, `S${k + 1}`, 3);
      l.wire({ x: 0, y: 10 + 6 * k }, { x: 6, y: 10 + 6 * k });
      l.wire(l.end(button), l.end(unit, k));
      return button;
    });
    const coil = l.place(10060, { x: 90, y: l.end(unit).y }, 'Y');
    l.wire(l.end(unit), { x: 90, y: l.end(unit).y });
    l.wire(l.end(coil), { x: RAIL_MINUS, y: l.end(coil).y });
    return { run: runner(l.schema), buttons };
  }

  it('bistable sets on S and resets on R', () => {
    const { run, buttons: [s, r] } = block(PLC_BLOCK.bistable, 2);
    expect(run([s!]).Y).toBe(true);
    expect(run().Y).toBe(true);
    expect(run([r!]).Y).toBe(false);
  });

  it('binary divider toggles on every press', () => {
    const { run, buttons: [b] } = block(PLC_BLOCK.divider, 1);
    expect(run([b!]).Y).toBe(true);
    expect(run().Y).toBe(true);
    expect(run([b!]).Y).toBe(false);
  });

  it('on-delay timer switches after its time and drops with the input', () => {
    const { run, buttons: [b] } = block(PLC_BLOCK.ton, 1, { time: 1 });
    expect(run([b!], 0).Y).toBe(false);
    expect(run([b!], 0.5).Y).toBe(false);
    expect(run([b!], 1.1).Y).toBe(true);
    expect(run([], 1.2).Y).toBe(false);
  });

  it('off-delay timer holds the output after the input drops', () => {
    const { run, buttons: [b] } = block(PLC_BLOCK.tof, 1, { time: 1 });
    expect(run([b!], 0).Y).toBe(true);
    expect(run([], 0.5).Y).toBe(true);
    expect(run([], 1.6).Y).toBe(false);
  });

  it('pulse timer gives one pulse of its time', () => {
    const { run, buttons: [b] } = block(PLC_BLOCK.tp, 1, { time: 1 });
    expect(run([b!], 0).Y).toBe(true);
    expect(run([], 0.5).Y).toBe(true);
    expect(run([], 1.2).Y).toBe(false);
  });

  it('pulse generator alternates on and off times while the input is on', () => {
    const { run, buttons: [b] } = block(PLC_BLOCK.pulse, 1, { time: 1, time2: 2 });
    expect(run([b!], 0).Y).toBe(true);
    expect(run([b!], 0.5).Y).toBe(true);
    expect(run([b!], 1.5).Y).toBe(false);
    expect(run([b!], 3.2).Y).toBe(true);
    expect(run([], 3.4).Y).toBe(false);
  });

  it('intermittent timer blinks with equal on and off times while the input is on', () => {
    const { run, buttons: [b] } = block(PLC_BLOCK.blink, 1, { time: 1 });
    expect(run([b!], 0).Y).toBe(true);
    expect(run([b!], 1.2).Y).toBe(false);
    expect(run([b!], 2.3).Y).toBe(true);
    expect(run([], 2.4).Y).toBe(false);
  });

  it('counter counts up on C, down while D is on, resets on R', () => {
    const { run, buttons: [reset, count, down] } = block(PLC_BLOCK.counter, 3, { preset: 2 });
    run([count!]); run();
    expect(run([count!]).Y).toBe(true);
    run([down!]);
    expect(run([count!, down!]).Y).toBe(false);
    run([count!]); run();
    expect(run([reset!]).Y).toBe(false);
  });

  it('up-down counter counts down on CD and loads PV on LD', () => {
    const { run, buttons: [up, dn, , load] } = block(PLC_BLOCK.updown, 4, { preset: 2 });
    expect(run([load!]).Y).toBe(true);
    run([dn!]);
    expect(run().Y).toBe(false);
    run([up!]);
    expect(run().Y).toBe(true);
  });

  it('up-down counter reaches its preset and resets', () => {
    const { run, buttons: [up, , reset] } = block(PLC_BLOCK.updown, 4, { preset: 2 });
    run([up!]); run();
    expect(run().Y).toBe(false);
    run([up!]);
    expect(run().Y).toBe(true);
    expect(run([reset!]).Y).toBe(false);
  });
});

describe('Ladder: sample ladder.cad (one element per palette button)', () => {
  it('reads every element with its terminals and parameters and writes the texts back', () => {
    const result = importCad(fixture('ladder.cad'));
    expect(result.unknownTypes).toEqual([]);
    const byType = (code: number) => result.schema.elements.find((e) => e.typeCode === code) as SchemaElement;
    const at = (element: SchemaElement) => element.terminals.map((t) => [t.offset.x, t.offset.y]);
    expect(at(byType(PLC_BLOCK.bistable))).toEqual([[0, 0], [0, 6], [15, 6]]);
    expect(at(byType(PLC_BLOCK.counter))).toEqual([[0, 0], [0, 6], [0, 12], [15, 12]]);
    expect(at(byType(PLC_BLOCK.updown))).toEqual([[0, 0], [0, 6], [0, 12], [0, 18], [15, 24]]);
    expect(byType(PLC_BLOCK.pulse).params).toMatchObject({ time: 1, time2: 1 });
    expect([byType(10076).name, byType(10076).func]).toEqual(['FIRST', 'SCAN']);
    const text = exportCad(result.schema);
    for (const piece of ['#-T##IN#Q#0#1#0#1##', '#-C##R#C#D#Q#0#0##*1*', '#-C##+#-#R#Q#0#0#L#', '#FIRST#SCAN#']) {
      expect(text).toContain(piece);
    }
  });
});
