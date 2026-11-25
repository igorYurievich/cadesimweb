import { liftMemory } from '@engine/lift';
import type { EngineState } from '@engine/types';
import { LIFT_TYPE, liftRoleName } from '@model/lift';
import type { Schema } from '@model/types';
import type { InterfaceText } from '../i18n';

const fill = (template: string, values: Readonly<Record<string, string>>): string =>
  template.replace(/\{(\w+)\}/g, (match, key: string) => values[key] ?? match);

/** Аварии лифтов (engine/lift.ts): удар кабины, человек зажат дверью, ход с открытой дверью. */
export function liftFaultMessages(schema: Schema, result: EngineState, text: InterfaceText): string[] {
  const messages: string[] = [];
  for (const lift of schema.elements) {
    if (lift.typeCode !== LIFT_TYPE) continue;
    const memory = liftMemory(lift, result.memory.timers);
    const values = {
      lift: lift.name || 'LIFT', motor: liftRoleName(lift, 'hoist'), hz: String(Math.round(memory.hz)),
      where: memory.fault === 'crash-top' ? text.liftTop : text.liftBottom,
      top: liftRoleName(lift, 'floor5'), bottom: liftRoleName(lift, 'floor1'),
      photo: liftRoleName(lift, 'photo'), sensor: liftRoleName(lift, 'doorClosed'),
    };
    if (memory.fault === 'crash-top' || memory.fault === 'crash-bottom') {
      const template = memory.cause === 'mains' ? text.liftCrashMains
        : memory.cause === 'overspeed' ? text.liftCrashOverspeed : text.liftCrashLimit;
      messages.push(fill(template, values));
    }
    if (memory.fault === 'squeeze') messages.push(fill(text.liftSqueeze, { ...values, motor: liftRoleName(lift, 'door') }));
    if (memory.fault === 'door-open') messages.push(fill(text.liftDoorOpenMove, values));
  }
  return messages;
}

/** Предупреждение: мотор подъёма крутится ниже 10 Гц, кабина стоит. */
export function liftWarnings(schema: Schema, result: EngineState, text: InterfaceText): string[] {
  return schema.elements
    .filter((lift) => lift.typeCode === LIFT_TYPE && liftMemory(lift, result.memory.timers).stalled)
    .map((lift) => fill(text.liftStall, {
      lift: lift.name || 'LIFT', motor: liftRoleName(lift, 'hoist'),
      hz: String(Math.round(liftMemory(lift, result.memory.timers).hz)),
    }));
}
