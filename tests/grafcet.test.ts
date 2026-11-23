import { describe, expect, it } from 'vitest';
import { createEngineInput, simulate } from '@engine/index';
import type { EngineState, UserInputs } from '@engine/types';
import { exportCad } from '@model/cad-export';
import { importCad } from '@model/cad-import';
import { terminalPosition } from '@model/geometry';
import { GRAFCET, decodeTableRows, grafcetOperands, mergeTableRows } from '@model/grafcet';
import { evaluateExpr, parseActions, parseReceptivity } from '@model/grafcet-expr';
import { createEmptySchema } from '@model/types';
import type { Point, SchemaElement } from '@model/types';
import { createPlacedElement } from '../src/ui/helpers';

/** Столбец GRAFCET: этапы и переходы друг под другом вплотную (выводы совпадают), x — ось столбца. */
function chart() {
  const schema = createEmptySchema();
  const nextId = (): number => Math.max(0, ...schema.elements.map((e) => e.id), ...schema.wires.map((w) => w.id)) + 1;
  const wire = (...points: Point[]): void => {
    for (let i = 1; i < points.length; i += 1) {
      const [from, to] = [{ ...points[i - 1]! }, { ...points[i]! }];
      schema.wires.push({ id: nextId(), typeCode: 4000, kind: 'phase', from, to, thickness: 1, dot: false });
    }
  };
  /** Элемент с выводом index в точке at. */
  const place = (code: number, at: Point, name: string, index = 0): SchemaElement => {
    const element = createPlacedElement(code, at, 0, schema);
    const offset = element.terminals[index]?.offset ?? { x: 0, y: 0 };
    element.position = { x: at.x - offset.x, y: at.y - offset.y };
    element.name = name;
    schema.elements.push(element);
    return element;
  };
  const at = (element: SchemaElement, index: number): Point => terminalPosition(element, index)!;
  /** Этап, под ним переход; возвращает этап и переход. */
  const stepWithTransition = (code: number, top: Point, number: string, condition: string) => {
    const step = place(code, top, number, 0);
    const transition = place(GRAFCET.transition, at(step, 1), condition, 0);
    return { step, transition };
  };
  const action = (step: SchemaElement, text: string): SchemaElement => place(GRAFCET.action, at(step, 3), text, 0);
  /** Провод возврата: из точки from влево / вправо до x, вверх и в точку to сверху. */
  const back = (from: Point, x: number, to: Point): void =>
    wire(from, { x, y: from.y }, { x, y: to.y - 3 }, { x: to.x, y: to.y - 3 }, to);
  const button = (name: string): SchemaElement => place(8000, { x: 300, y: 30 + schema.elements.length * 15 }, name);
  return { schema, wire, back, place, at, stepWithTransition, action, button };
}

function runner(schema: ReturnType<typeof chart>['schema']) {
  let input = createEngineInput(schema);
  let state: EngineState = simulate(input);
  const inputs: UserInputs = { pressed: {}, toggled: {}, tripped: {} };
  const tick = (time: number): EngineState => {
    input = { ...input, inputs, time, memory: state.memory };
    state = simulate(input);
    return state;
  };
  const active = (element: SchemaElement): boolean => state.memory.timers[element.id]?.q ?? false;
  return { tick, inputs, active, coils: () => state.coils };
}

describe('GRAFCET: условия и действия', () => {
  it('разбирает условия как в тетради', () => {
    const value = (text: string, on: string[], stepTime = 0) =>
      evaluateExpr(parseReceptivity(text), { operand: (name) => on.includes(name), stepTime });
    expect(value('S1', ['S1'])).toBe(true);
    expect(value('T1·/I7', ['T1'])).toBe(true);
    expect(value('T1·/I7', ['T1', 'I7'])).toBe(false);
    expect(value('T1 · !I7', ['T1'])).toBe(true);
    expect(value('S1+S2', ['S2'])).toBe(true);
    expect(value('(I1+I2)*/I3', ['I2', 'I3'])).toBe(false);
    expect(value('S1 S2', ['S1'])).toBe(false);
    expect(value('=1', [])).toBe(true);
    expect(value('T2 = 3s', [], 2.9)).toBe(false);
    expect(value('T2 = 3s', [], 3)).toBe(true);
    expect(value('CB·T1', ['CB', 'T1'])).toBe(true);
    expect(() => parseReceptivity('S1·(S2')).toThrow(SyntaxError);
  });

  it('разбирает действия и таймеры этапа', () => {
    expect(parseActions('H1 H2 H3')).toEqual([{ name: 'H1' }, { name: 'H2' }, { name: 'H3' }]);
    expect(parseActions('KM1.1, KM2')).toEqual([{ name: 'KM1.1' }, { name: 'KM2' }]);
    expect(parseActions('T1 = 5 s')).toEqual([{ name: 'T1', seconds: 5 }]);
    expect(parseActions('KM6.1 T3(3s)')).toEqual([{ name: 'KM6.1' }, { name: 'T3', seconds: 3 }]);
  });
});

describe('GRAFCET: эволюция', () => {
  it('задача «d»: 1 →S1→ 2 →S2→ 3 →S3→ 4, из 4 по S1 к 2, по S2 к 1', () => {
    const c = chart();
    const s1 = c.stepWithTransition(GRAFCET.initialStep, { x: 30, y: 30 }, '1', 'S1');
    const s2 = c.stepWithTransition(GRAFCET.step, c.at(s1.transition, 1), '2', 'S2');
    const s3 = c.stepWithTransition(GRAFCET.step, c.at(s2.transition, 1), '3', 'S3');
    const s4 = c.place(GRAFCET.step, c.at(s3.transition, 1), '4');
    c.action(s2.step, 'H1');
    c.action(s3.step, 'H1 H2');
    c.action(s4, 'H1 H2 H3');
    // Под этапом 4 — разветвление «O»: два перехода, каждый со своей линией возврата.
    const bar = c.place(GRAFCET.divergenceOr, c.at(s4, 1), '', 0);
    const back2 = c.place(GRAFCET.transition, c.at(bar, 0), 'S1', 0);
    const back1 = c.place(GRAFCET.transition, c.at(bar, 8), 'S2', 0);
    const into2 = c.at(s2.step, 0);
    const into1 = c.at(s1.step, 0);
    c.back(c.at(back2, 1), 12, into2);
    c.back(c.at(back1, 1), 120, into1);
    const button = (name: string) => c.button(name);
    const [b1, b2, b3] = [button('S1'), button('S2'), button('S3')];

    const run = runner(c.schema);
    run.tick(0.1);
    expect(run.active(s1.step)).toBe(true);
    expect(run.coils().H1).toBe(false);
    run.inputs.pressed[b1.id] = true;
    run.tick(0.2);
    expect(run.active(s1.step)).toBe(false);
    expect(run.active(s2.step)).toBe(true);
    expect(run.coils().H1).toBe(true);
    run.inputs.pressed[b1.id] = false;
    run.inputs.pressed[b2.id] = true; run.tick(0.3);
    run.inputs.pressed[b2.id] = false;
    expect(run.active(s3.step)).toBe(true);
    expect(run.coils().H2).toBe(true);
    run.inputs.pressed[b3.id] = true; run.tick(0.4);
    run.inputs.pressed[b3.id] = false;
    expect(run.active(s4)).toBe(true);
    expect(run.coils().H3).toBe(true);
    run.inputs.pressed[b2.id] = true; run.tick(0.5);
    expect(run.active(s4)).toBe(false);
    expect(run.active(s1.step)).toBe(true);
    expect(run.coils().H1).toBe(false);
  });

  it('разветвление и слияние «Y»: обе ветви активны, слияние ждёт обе', () => {
    const c = chart();
    const s1 = c.stepWithTransition(GRAFCET.initialStep, { x: 30, y: 30 }, '1', 'S1');
    const split = c.place(GRAFCET.divergenceAnd, c.at(s1.transition, 1), '', 0);
    const a = c.stepWithTransition(GRAFCET.step, c.at(split, 0), '2', 'A');
    const b = c.stepWithTransition(GRAFCET.step, c.at(split, 12), '3', '=1');
    // Под каждой веткой ещё по этапу, затем слияние «Y» и переход «=1» обратно к 1.
    const a2 = c.place(GRAFCET.step, c.at(a.transition, 1), '4');
    const b2 = c.place(GRAFCET.step, c.at(b.transition, 1), '5');
    const join = c.place(GRAFCET.convergenceAnd, c.at(a2, 1), '', 0);
    expect(c.at(join, 12)).toEqual(c.at(b2, 1));
    const end = c.place(GRAFCET.transition, c.at(join, 0), 'B', 0);
    const into1 = c.at(s1.step, 0);
    c.back(c.at(end, 1), 12, into1);
    const [bs1, ba, bb] = [c.button('S1'), c.button('A'), c.button('B')];
    const run = runner(c.schema);
    run.tick(0.1);
    run.inputs.pressed[bs1.id] = true; run.inputs.pressed[bb.id] = true; run.tick(0.2);
    // Ветвь 3 сразу ушла в 5 («=1»), ветвь 2 ждёт A: слияние ещё не готово, хотя B нажата.
    expect(run.active(a.step)).toBe(true);
    expect(run.active(b2)).toBe(true);
    run.tick(0.3);
    expect(run.active(s1.step)).toBe(false);
    run.inputs.pressed[ba.id] = true; run.tick(0.4);
    run.inputs.pressed[bs1.id] = false; run.inputs.pressed[ba.id] = false; run.inputs.pressed[bb.id] = false;
    run.tick(0.5);
    expect(run.active(a2)).toBe(true);
    expect(run.active(b2)).toBe(true);
    run.inputs.pressed[bb.id] = true; run.tick(0.6);
    expect(run.active(s1.step)).toBe(true);
    expect(run.active(a2) || run.active(b2)).toBe(false);
  });

  it('время этапа «T2=3s» и таймер действия «T1=5s»', () => {
    const c = chart();
    const s1 = c.stepWithTransition(GRAFCET.initialStep, { x: 30, y: 30 }, '1', 'T2=3s');
    const s2 = c.stepWithTransition(GRAFCET.step, c.at(s1.transition, 1), '2', 'T1');
    c.action(s2.step, 'KM1 T1=5s');
    const s3 = c.place(GRAFCET.step, c.at(s2.transition, 1), '3');
    const run = runner(c.schema);
    run.tick(0);
    run.tick(2.9);
    expect(run.active(s1.step)).toBe(true);
    run.tick(3.0);
    expect(run.active(s2.step)).toBe(true);
    expect(run.coils().KM1).toBe(true);
    run.tick(7.9);
    expect(run.active(s2.step)).toBe(true);
    run.tick(8.0);
    expect(run.active(s3)).toBe(true);
    expect(run.coils().KM1).toBe(false);
  });
});

describe('GRAFCET: таблица назначений и .cad', () => {
  it('собирает входы и выходы, сохраняет описания', () => {
    const c = chart();
    const s1 = c.stepWithTransition(GRAFCET.initialStep, { x: 30, y: 30 }, '1', 'I1·/I7+X3');
    c.action(s1.step, 'Q1 T1=2s');
    expect(grafcetOperands(c.schema)).toEqual({ inputs: ['I1', 'I7'], outputs: ['Q1', 'T1'] });
    const rows = mergeTableRows(c.schema, decodeTableRows('I:I1=Marcha;Q:H9=Lámpara antigua;Q:Q2='));
    expect(rows).toEqual([
      { kind: 'I', name: 'I1', text: 'Marcha' }, { kind: 'I', name: 'I7', text: '' },
      { kind: 'Q', name: 'Q1', text: '' }, { kind: 'Q', name: 'T1', text: '' },
      { kind: 'Q', name: 'H9', text: 'Lámpara antigua' },
    ]);
  });

  it('элементы GRAFCET переживают сохранение в .cad', () => {
    const c = chart();
    const s1 = c.stepWithTransition(GRAFCET.initialStep, { x: 30, y: 30 }, '1', 'S1+S2');
    c.action(s1.step, 'H1 H2');
    const bar = c.place(GRAFCET.divergenceAnd, c.at(s1.transition, 1), '', 0);
    bar.size = { w: 72, h: 3 };
    const table = c.place(GRAFCET.table, { x: 150, y: 30 }, '', 0);
    table.func = 'I:S1=Marcha;Q:H1=Verde';
    const again = importCad(exportCad(c.schema)).schema;
    const find = (id: number) => again.elements.find((element) => element.id === id)!;
    expect(find(s1.step.id).typeCode).toBe(GRAFCET.initialStep);
    expect(find(s1.transition.id).name).toBe('S1+S2');
    expect(find(bar.id).terminals).toHaveLength(24);
    expect(find(table.id).func).toBe('I:S1=Marcha;Q:H1=Verde');
    expect(find(s1.step.id).terminals.map((t) => t.offset)).toEqual(s1.step.terminals.map((t) => t.offset));
  });
});
