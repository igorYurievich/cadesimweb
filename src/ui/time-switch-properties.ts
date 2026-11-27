import { TIME_SWITCH, coilRelayNumber } from '@model/coil-relays';
import type { Schema, SchemaElement } from '@model/types';
import type { DetectorFieldDeps } from './detector-properties';
import { cloneSchema } from './helpers';

/** Дни, которые умеет хранить запись .cad: пн…сб (где лежит воскресенье, пока не известно, coil-relays.ts). */
const STORED_DAYS = 6;
/** Галочки и поля в строку: общие стили панели растягивают каждое поле на всю ширину. */
const INLINE = 'display:flex;align-items:center;gap:6px;margin:0;font-weight:normal';
const SMALL_INPUT = 'width:auto;flex:none;margin:0';

function commit(schema: Schema, deps: DetectorFieldDeps, apply: () => void): void {
  const before = cloneSchema(schema);
  apply();
  deps.commitSchema(before);
  deps.renderSchema();
}

function appendDays(schema: Schema, element: SchemaElement, deps: DetectorFieldDeps): void {
  const box = document.createElement('fieldset');
  box.className = 'property-field';
  box.style.cssText = 'display:grid;grid-template-columns:repeat(3,auto);gap:4px 12px;border:1px solid #d5dbe3;padding:6px 10px';
  const legend = document.createElement('legend');
  legend.textContent = deps.uiText().timeSwitchDays;
  box.append(legend);
  deps.uiText().weekdays.split(',').slice(0, STORED_DAYS).forEach((name, index) => {
    const label = document.createElement('label');
    label.style.cssText = INLINE;
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.style.cssText = SMALL_INPUT;
    input.checked = String(element.params.days ?? '')[index] === '1';
    input.addEventListener('change', () => commit(schema, deps, () => {
      const days = String(element.params.days ?? '').padEnd(STORED_DAYS, '0').split('');
      days[index] = input.checked ? '1' : '0';
      element.params.days = days.join('');
    }));
    label.append(input, document.createTextNode(` ${name}`));
    box.append(label);
  });
  deps.propertyFields.append(box);
}

/** «Tiempo conexión / desconexión»: часы и минуты и галочка «Inactivo», как в окне CADe SIMU. */
function appendTime(
  schema: Schema, element: SchemaElement, deps: DetectorFieldDeps, title: string, prefix: 'on' | 'off',
): void {
  const field = document.createElement('div');
  field.className = 'property-field';
  field.append(document.createTextNode(title));
  const row = document.createElement('span');
  row.style.cssText = INLINE;
  const number = (param: string, max: number): HTMLInputElement => {
    const input = document.createElement('input');
    input.type = 'number';
    input.min = '0';
    input.max = String(max);
    input.step = '1';
    input.style.cssText = `${SMALL_INPUT};width:4.5em`;
    input.value = String(coilRelayNumber(element, param, 0));
    input.addEventListener('change', () => {
      const value = Math.round(Number(input.value));
      if (Number.isFinite(value) && value >= 0 && value <= max) commit(schema, deps, () => { element.params[param] = value; });
    });
    return input;
  };
  const inactive = document.createElement('input');
  inactive.type = 'checkbox';
  inactive.style.cssText = SMALL_INPUT;
  inactive.checked = coilRelayNumber(element, `${prefix}Inactive`, 0) > 0;
  inactive.addEventListener('change', () => commit(schema, deps, () => {
    element.params[`${prefix}Inactive`] = inactive.checked ? 1 : 0;
  }));
  const inactiveLabel = document.createElement('label');
  inactiveLabel.style.cssText = INLINE;
  inactiveLabel.append(inactive, document.createTextNode(` ${deps.uiText().timeSwitchInactive}`));
  row.append(number(`${prefix}H`, 23), document.createTextNode(' : '), number(`${prefix}M`, 59), ' ', inactiveLabel);
  field.append(row);
  deps.propertyFields.append(field);
}

/** Поля реле времени 9014 (Interruptor horario). */
export function appendTimeSwitchFields(schema: Schema, element: SchemaElement, deps: DetectorFieldDeps): void {
  if (element.typeCode !== TIME_SWITCH) return;
  appendDays(schema, element, deps);
  appendTime(schema, element, deps, deps.uiText().timeSwitchOn, 'on');
  appendTime(schema, element, deps, deps.uiText().timeSwitchOff, 'off');
}
