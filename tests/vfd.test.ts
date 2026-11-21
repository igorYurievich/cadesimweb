import { describe, expect, it } from 'vitest';
import { createEngineInput, simulate } from '@engine/index';
import type { EngineMemory, EngineState } from '@engine/index';
import { createPlacedElement } from '@ui/helpers';
import { terminalPosition } from '@model/geometry';
import { createEmptySchema } from '@model/types';
import type { Point, Schema, SchemaElement } from '@model/types';
import { vfdSettings, vfdSettingsFromTail, vfdTailWithSettings, VFD_CONTROL_TAIL } from '@model/vfd';
import { exportCad } from '@model/cad-export';
import { importCad } from '@model/cad-import';

/**
 * 3004 (L1 L2 L3) → преобразователь 1055 -G1 → двигатель 1000; блок управления 1056 -G1.
 * Входы I1…I4 включаются перемычками от «+» блока (клемма 7 сверху, x = 108).
 */
function build(opts: { fwd?: boolean; rev?: boolean; p1?: boolean; p2?: boolean; drive?: number } = {}): Schema {
  const s = createEmptySchema();
  const place = (code: number, x: number, y: number, name = ''): SchemaElement => {
    const e = createPlacedElement(code, { x, y }, 0, s); e.name = name; s.elements.push(e); return e;
  };
  const wire = (a: Point, b: Point): void => {
    const id = Math.max(0, ...s.elements.map((e) => e.id), ...s.wires.map((w) => w.id)) + 1;
    s.wires.push({ id, typeCode: 4000, kind: 'phase', from: a, to: b, thickness: 1, dot: false });
  };
  const T = (e: SchemaElement, i: number): Point => terminalPosition(e, i) as Point;
  const code = opts.drive ?? 1055;
  place(code === 1055 ? 3004 : 3003, 0, 0, '-X');
  const drive = place(code, 0, 12, '-G1');
  const motor = place(1000, 0, 60, '-M1');
  const control = place(1056, 60, 12, '-G1');
  const inputs = code === 1055 ? [0, 1, 2] : [0, 1];
  const outputs = code === 1055 ? [4, 5, 6] : [3, 4, 5];
  inputs.forEach((index, k) => wire({ x: k * 6, y: 0 }, T(drive, index)));
  outputs.forEach((index, k) => wire(T(drive, index), T(motor, k)));
  const plus = T(control, 6);
  const used = ([['fwd', 2, 6], ['rev', 3, 3], ['p1', 4, 0], ['p2', 5, -3]] as const).filter(([key]) => opts[key]);
  let y = plus.y;
  for (const [, index, level] of used) {
    wire({ x: plus.x, y }, { x: plus.x, y: level }); y = level;
    const target = T(control, index);
    wire({ x: plus.x, y: level }, { x: target.x, y: level }); wire({ x: target.x, y: level }, target);
  }
  return s;
}

/** Прогон кадров по 0,1 с; схема может меняться между шагами (перемычки входов), память сохраняется. */
function runner() {
  let memory: EngineMemory | undefined;
  let t = 0;
  let last: EngineState | undefined;
  return {
    run(schema: Schema, seconds: number): EngineState {
      for (let k = 0; k < Math.round(seconds / 0.1); k += 1) {
        const input = createEngineInput(schema, t);
        last = simulate({ ...input, memory });
        memory = last.memory; t += 0.1;
      }
      return last!;
    },
  };
}
const driveId = (s: Schema) => s.elements.find((e) => e.typeCode === 1055 || e.typeCode === 1054)!.id;
const motorId = (s: Schema) => s.elements.find((e) => e.typeCode === 1000)!.id;
const controlId = (s: Schema) => s.elements.find((e) => e.typeCode === 1056)!.id;

describe('variable frequency drive', () => {
  it('stays at 0 Hz without a run command; the motor is still', () => {
    const s = build();
    const st = runner().run(s, 1);
    expect(st.memory.timers[driveId(s)]?.hz).toBe(0);
    expect(st.motors[motorId(s)]?.running).toBe(false);
  });

  it('I1 ramps up to the AI reference (50 Hz in 5 s); the motor runs at the drive frequency', () => {
    const s = build({ fwd: true });
    const r = runner();
    let st = r.run(s, 2.5);
    const hzMid = st.memory.timers[driveId(s)]?.hz ?? 0;
    expect(hzMid).toBeGreaterThan(20);
    expect(hzMid).toBeLessThan(30);
    expect(st.motors[motorId(s)]).toMatchObject({ running: true });
    st = r.run(s, 4);
    expect(st.memory.timers[driveId(s)]?.hz).toBe(50);
    expect(st.motors[motorId(s)]?.hz).toBe(50);
    // Реле RA–RC замкнуто, пока есть частота.
    expect(st.contacts[controlId(s)]).toBe(true);
  });

  it('presets: I3 → 10 Hz, I4 → 25 Hz, I3+I4 → 50 Hz', () => {
    for (const [opts, hz] of [[{ p1: true }, 10], [{ p2: true }, 25], [{ p1: true, p2: true }, 50]] as const) {
      const s = build({ fwd: true, ...opts });
      expect(runner().run(s, 8).memory.timers[driveId(s)]?.hz).toBe(hz);
    }
  });

  it('removing I1 ramps down to a stop; I2 runs in reverse (phase order swapped)', () => {
    const r = runner();
    const on = build({ fwd: true });
    r.run(on, 6);
    const off = build();
    let st = r.run(off, 2.5);
    expect(st.memory.timers[driveId(off)]?.hz).toBeGreaterThan(0);
    st = r.run(off, 3);
    expect(st.memory.timers[driveId(off)]?.hz).toBe(0);
    expect(st.contacts[controlId(off)]).toBe(false);
    const back = build({ rev: true });
    st = r.run(back, 6);
    expect(st.memory.timers[driveId(back)]).toMatchObject({ hz: 50, dir: -1 });
  });

  it('I1 and I2 together is a stop', () => {
    const s = build({ fwd: true, rev: true });
    expect(runner().run(s, 3).memory.timers[driveId(s)]?.hz).toBe(0);
  });

  it('single-phase drive 1054 runs from phase + neutral', () => {
    const s = build({ fwd: true, drive: 1054 });
    expect(runner().run(s, 6).motors[motorId(s)]).toMatchObject({ running: true, hz: 50 });
  });

  it('settings come from params, then the .cad tail; they round-trip through the tail', () => {
    expect(vfdSettingsFromTail(VFD_CONTROL_TAIL)).toEqual({ preset1: 10, preset2: 25, preset3: 50, rampUp: 5, rampDown: 5 });
    const tail = vfdTailWithSettings(VFD_CONTROL_TAIL, { aiHz: 50, preset1: 15, preset2: 30, preset3: 60, rampUp: 2, rampDown: 8 });
    expect(tail).toBe('1-0-0-001-200-015-030-060-02-08-00-0');
    const s = build();
    const control = s.elements.find((e) => e.typeCode === 1056)!;
    control.params.vfd_preset1 = 15; control.params.vfd_rampUp = 2; control.params.vfd_aiHz = 35;
    const back = importCad(exportCad(s)).schema.elements.find((e) => e.typeCode === 1056);
    // Консигна AI в .cad не пишется (у CADe_SIMU для неё нет поля): после открытия — 50 Гц.
    expect(vfdSettings(back)).toMatchObject({ preset1: 15, rampUp: 2, aiHz: 50 });
  });
});

describe('variable frequency drive 2D (panel)', () => {
  /** 3004 → 2D-преобразователь -G1 (R S T / U V W) → двигатель; входы X1…X4 перемычками от «+24». */
  function build2d(opts: { x1?: boolean; x2?: boolean; x3?: boolean } = {}): Schema {
    const s = createEmptySchema();
    const place = (code: number, x: number, y: number, name = ''): SchemaElement => {
      const e = createPlacedElement(code, { x, y }, 0, s); e.name = name; s.elements.push(e); return e;
    };
    const wire = (a: Point, b: Point): void => {
      const id = Math.max(0, ...s.elements.map((e) => e.id), ...s.wires.map((w) => w.id)) + 1;
      s.wires.push({ id, typeCode: 4000, kind: 'phase', from: a, to: b, thickness: 1, dot: false });
    };
    const T = (e: SchemaElement, i: number): Point => terminalPosition(e, i) as Point;
    place(3004, 6, -12, '-X');
    const drive = place(10240, 0, 0, '-G1');
    const motor = place(1000, 6, 120, '-M1');
    [0, 1, 2].forEach((k) => wire({ x: 6 + 6 * k, y: -12 }, T(drive, k)));
    [4, 5, 6].forEach((index, k) => wire(T(drive, index), T(motor, k)));
    const plus = T(drive, 10);
    for (const [flag, index] of [['x1', 11], ['x2', 12], ['x3', 13]] as const) {
      if (!opts[flag]) continue;
      const target = T(drive, index);
      const x = plus.x + 6 + index;
      wire(plus, { x, y: plus.y }); wire({ x, y: plus.y }, { x, y: target.y }); wire({ x, y: target.y }, target);
    }
    return s;
  }
  const run2d = (s: Schema, seconds: number, panel?: boolean, memoryIn?: EngineMemory) => {
    let memory = memoryIn; let st: EngineState | undefined;
    for (let k = 0; k < Math.round(seconds / 0.1); k += 1) {
      const input = createEngineInput(s, k * 0.1 + (memory ? 100 : 0));
      if (panel !== undefined) input.inputs.toggled[s.elements.find((e) => e.typeCode === 10240)!.id] = panel;
      st = simulate({ ...input, memory }); memory = st.memory;
    }
    return st!;
  };
  const id2d = (s: Schema) => s.elements.find((e) => e.typeCode === 10240)!.id;

  it('panel RUN runs forward to the setpoint (default 50 Hz); STOP ramps down', () => {
    const s = build2d();
    let st = run2d(s, 6, true);
    expect(st.memory.timers[id2d(s)]).toMatchObject({ hz: 50, dir: 1 });
    expect(st.contacts[id2d(s)]).toBe(true); // реле TA–TC
    st = run2d(s, 6, false, st.memory);
    expect(st.memory.timers[id2d(s)]?.hz).toBe(0);
  });

  it('setpoint from params (▲ ▼ / knob) and terminals X2 / X3', () => {
    const s = build2d({ x2: true, x3: true });
    s.elements.find((e) => e.typeCode === 10240)!.params.vfd_aiHz = 30;
    expect(run2d(s, 6).memory.timers[id2d(s)]).toMatchObject({ hz: 10, dir: -1 });
    const t = build2d();
    t.elements.find((e) => e.typeCode === 10240)!.params.vfd_aiHz = 30;
    expect(run2d(t, 6, true).memory.timers[id2d(t)]?.hz).toBe(30);
  });

  it('setpoint survives the .cad round trip (web-only tail field 10)', () => {
    const s = build2d();
    s.elements.find((e) => e.typeCode === 10240)!.params.vfd_aiHz = 35;
    const back = importCad(exportCad(s)).schema.elements.find((e) => e.typeCode === 10240);
    expect(vfdSettings(back).aiHz).toBe(35);
    expect(back?.terminals.length).toBe(16);
  });
});

describe('single-phase input drive 2D', () => {
  /** 3003 (L N) → однофазный 2D-преобразователь → трёхфазный двигатель 230 V. */
  function build1ph(): Schema {
    const s = createEmptySchema();
    const place = (code: number, x: number, y: number, name = ''): SchemaElement => {
      const e = createPlacedElement(code, { x, y }, 0, s); e.name = name; s.elements.push(e); return e;
    };
    const wire = (a: Point, b: Point): void => {
      const id = Math.max(0, ...s.elements.map((e) => e.id), ...s.wires.map((w) => w.id)) + 1;
      s.wires.push({ id, typeCode: 4000, kind: 'phase', from: a, to: b, thickness: 1, dot: false });
    };
    const T = (e: SchemaElement, i: number): Point => terminalPosition(e, i) as Point;
    place(3003, 6, -12, '-X');
    const drive = place(10241, 0, 0, '-G1');
    const motor = place(1000, 6, 120, '-M1');
    wire({ x: 6, y: -12 }, T(drive, 0)); wire({ x: 12, y: -12 }, T(drive, 1));
    [3, 4, 5].forEach((index, k) => wire(T(drive, index), T(motor, k)));
    return s;
  }
  it('runs from L + N; REV/JOG reverses the panel direction', () => {
    const s = build1ph();
    const id = s.elements.find((e) => e.typeCode === 10241)!.id;
    let memory: EngineMemory | undefined; let st: EngineState | undefined;
    const run = (seconds: number, rev: boolean) => {
      for (let k = 0; k < seconds * 10; k += 1) {
        const input = createEngineInput(s, (memory ? 1000 : 0) + k * 0.1 + (rev ? 500 : 0));
        input.inputs.toggled[id] = true; input.inputs.positions = { [id]: rev ? 1 : 0 };
        st = simulate({ ...input, memory }); memory = st.memory;
      }
      return st!;
    };
    expect(run(6, false).memory.timers[id]).toMatchObject({ hz: 50, dir: 1 });
    expect(st!.motors[s.elements.find((e) => e.typeCode === 1000)!.id]).toMatchObject({ running: true, hz: 50 });
    expect(run(15, true).memory.timers[id]).toMatchObject({ hz: 50, dir: -1 });
  });
});
