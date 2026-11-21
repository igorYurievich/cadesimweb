import { PLC_BLOCK, PLC_COUNTER_TYPES, PLC_TIMER_TYPES } from '@model/plc-blocks';
import { LOGO_MODULE_TYPES, logoModelName, logoSupply } from '@model/plc-modules';
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

/**
 * Поле «Питание» у LOGO и DM8: модель на 24 V (24RCE / DM8 24R — от блока питания 24 V) или на 230 V
 * (230RCE / DM8 230R — прямо от L и N). Хранится в params.supply; в .cad — «24V» / «230V» в последнем текстовом поле записи.
 */
export function appendLogoSupplyField(schema: Schema, element: SchemaElement, deps: DetectorFieldDeps): void {
  if (!LOGO_MODULE_TYPES.has(element.typeCode)) return;
  const field = document.createElement('label');
  field.className = 'property-field';
  field.append(document.createTextNode(deps.uiText().logoSupply));
  const select = document.createElement('select');
  for (const supply of [24, 230] as const) {
    const option = document.createElement('option');
    option.value = String(supply);
    option.textContent = `${supply} V — ${logoModelName(element.typeCode, supply)}`;
    select.append(option);
  }
  select.value = String(logoSupply(element));
  select.addEventListener('change', () => {
    const before = cloneSchema(schema);
    element.params.supply = select.value === '230' ? 230 : 24;
    deps.commitSchema(before);
    deps.renderSchema();
    select.blur();
    deps.rerender();
  });
  field.append(select);
  deps.propertyFields.append(field);
}
