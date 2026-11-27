import {
  FLASHER_RELAY, PULSE_COUNTER, PULSE_GENERATOR, coilRelayNumber, COIL_RELAY_DEFAULT_TIME,
} from '@model/coil-relays';
import type { Schema, SchemaElement } from '@model/types';
import type { DetectorFieldDeps } from './detector-properties';
import type { TextKey } from './i18n';
import { cloneSchema } from './helpers';

type NumberField = readonly [key: TextKey, param: string, fallback: number, step: string];

/** Поля по типу: как в окне свойств CADe SIMU (у счётчика — «Límite de conexión / desconexión»). */
const FIELDS: Readonly<Record<number, readonly NumberField[]>> = {
  [FLASHER_RELAY]: [['flasherTime', 'time', COIL_RELAY_DEFAULT_TIME, '0.1']],
  [PULSE_GENERATOR]: [
    ['pulseOnTime', 'time', COIL_RELAY_DEFAULT_TIME, '0.1'],
    ['pulseOffTime', 'timeOff', COIL_RELAY_DEFAULT_TIME, '0.1'],
  ],
  [PULSE_COUNTER]: [['counterOnLimit', 'onLimit', 0, '1'], ['counterOffLimit', 'offLimit', 0, '1']],
};

function appendNumber(schema: Schema, element: SchemaElement, deps: DetectorFieldDeps, field: NumberField): void {
  const [key, param, fallback, step] = field;
  const label = document.createElement('label');
  label.className = 'property-field';
  label.append(document.createTextNode(deps.uiText()[key]));
  const input = document.createElement('input');
  input.type = 'number';
  input.min = '0';
  input.step = step;
  input.value = String(coilRelayNumber(element, param, fallback));
  input.addEventListener('change', () => {
    const value = Number(input.value);
    if (!Number.isFinite(value) || value < 0) return;
    const before = cloneSchema(schema);
    // Предел счётчика — целое число импульсов.
    element.params[param] = step === '1' ? Math.round(value) : value;
    deps.commitSchema(before);
    deps.renderSchema();
  });
  label.append(input);
  deps.propertyFields.append(label);
}

/** Время прерывателя и генератора импульсов, пределы счётчика (model/coil-relays.ts). */
export function appendCoilRelayFields(schema: Schema, element: SchemaElement, deps: DetectorFieldDeps): void {
  for (const field of FIELDS[element.typeCode] ?? []) appendNumber(schema, element, deps, field);
}
