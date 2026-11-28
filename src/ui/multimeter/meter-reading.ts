/** Что показывает мультиметр: по положению переключателя, сетям под щупами и состоянию симуляции. */

import { continuity, netIsLive, voltageBetween } from '@engine/meter';
import type { EngineState, UserInputs } from '@engine/types';
import type { Schema } from '@model/types';

/** Положения переключателя: выкл., переменное напряжение, постоянное напряжение, прозвонка. */
export type DialMode = 'off' | 'acv' | 'dcv' | 'ohm';

export type MeterDisplay =
  | { kind: 'off' }
  | { kind: 'volt'; volts: number; dc: boolean }
  | { kind: 'ohm'; closed: boolean };

export interface MeterProbeNets {
  /** Сеть под красным щупом (V Ω); undefined — щуп ни к чему не приложен. */
  red: number | undefined;
  /** Сеть под чёрным щупом (COM). */
  black: number | undefined;
  /** Группы проводов под щупами: прозвонка голых проводов, не дошедших ни до одной клеммы. */
  redWire?: number;
  blackWire?: number;
}

export interface MeterSituation {
  mode: DialMode;
  schema: Schema;
  /** Результат движка, пока идёт симуляция (на паузе тоже); в редакторе undefined — питания нет. */
  result: EngineState | undefined;
  /** Положение кнопок и переключателей: в симуляции текущее, в редакторе — исходное. */
  inputs: UserInputs;
}

export interface MeterReading {
  display: MeterDisplay;
  /** Прозвонка на проводе под напряжением: прибор сгорает. */
  burns: boolean;
}

type Potentials = EngineState['nets'][number]['potentials'];

function potentialsOf(result: EngineState | undefined, net: number | undefined): Potentials {
  if (!result || net === undefined) return [];
  return result.nets.find((item) => item.id === net)?.potentials ?? [];
}

function touchesLive(result: EngineState | undefined, nets: MeterProbeNets): boolean {
  if (!result) return false;
  return [nets.red, nets.black].some((id) => id !== undefined && netIsLive(result.nets.find((net) => net.id === id)));
}

export function readMeter(situation: MeterSituation, nets: MeterProbeNets): MeterReading {
  if (situation.mode === 'off') return { display: { kind: 'off' }, burns: false };
  const { result } = situation;
  if (situation.mode === 'acv' || situation.mode === 'dcv') {
    const reading = voltageBetween(potentialsOf(result, nets.red), potentialsOf(result, nets.black));
    const dc = situation.mode === 'dcv';
    // Не тот род тока: на V⎓ переменное усредняется в ноль, на V~ постоянное не проходит — как у настоящего прибора.
    const volts = reading.dc === dc ? reading.volts : 0;
    return { display: { kind: 'volt', volts, dc }, burns: false };
  }
  if (touchesLive(result, nets)) return { display: { kind: 'ohm', closed: false }, burns: true };
  // Оба щупа на одном куске провода (даже если он ни к чему не подключён) — цепь есть.
  if (nets.redWire !== undefined && nets.redWire === nets.blackWire) {
    return { display: { kind: 'ohm', closed: true }, burns: false };
  }
  if (nets.red === undefined || nets.black === undefined) {
    return { display: { kind: 'ohm', closed: false }, burns: false };
  }
  const closed = continuity({
    schema: situation.schema,
    inputs: situation.inputs,
    coils: result?.coils,
    timers: result?.memory.timers,
  }, nets.red, nets.black);
  return { display: { kind: 'ohm', closed }, burns: false };
}

/** Текст на экране: 400 · 230 · 24.0 · 0.0 · -24.0; обрыв — OL. */
export function formatVolts(volts: number): string {
  const abs = Math.abs(volts);
  const text = abs >= 100 ? abs.toFixed(0) : abs.toFixed(1);
  return volts < 0 ? `-${text}` : text;
}
