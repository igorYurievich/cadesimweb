import { PLC_BLOCK, PLC_COUNTER_TYPES, PLC_TIMER_TYPES } from '@model/plc-blocks';
import type { Schema, SchemaElement } from '@model/types';
import type { DetectorFieldDeps } from './detector-properties';
import { cloneSchema } from './helpers';

/** Поля блоков Ladder: время таймера (у генератора импульсов ещё время паузы) и PV счётчика, в секундах / штуках. */
export function appendPlcFields(schema: Schema, element: SchemaElement, deps: DetectorFieldDeps): void {
  const text = deps.uiText();
  const fields: Array<[key: 'time' | 'time2' | 'preset', title: string, step: string]> = [];
  if (PLC_TIMER_TYPES.has(element.typeCode)) fields.push(['time', text.delay, '0.1']);
  if (element.typeCode === PLC_BLOCK.pulse) fields.push(['time2', text.pauseTime, '0.1']);
  if (PLC_COUNTER_TYPES.has(element.typeCode)) fields.push(['preset', text.preset, '1']);
  for (const [key, title, step] of fields) {
    const field = document.createElement('label');
    field.className = 'property-field';
    field.append(document.createTextNode(title));
    const input = document.createElement('input');
    input.type = 'number';
    input.min = '0';
    input.step = step;
    input.value = String(element.params[key] ?? (key === 'preset' ? 0 : 1));
    input.addEventListener('change', () => {
      const value = Number(input.value);
      if (!Number.isFinite(value) || value < 0) return;
      const before = cloneSchema(schema);
      element.params[key] = key === 'preset' ? Math.round(value) : value;
      deps.commitSchema(before);
      deps.renderSchema();
    });
    field.append(input);
    deps.propertyFields.append(field);
  }
}
