import { getCadType } from '@model/cad-types';
import { AUTOMATIC_2D, DIFFERENTIAL_2D, POLE_VARIANT_OF } from '@model/realistic-2d-types';
import type { PoleVariant } from '@model/realistic-2d-types';
import { buildTerminals, frameSize } from '@model/geometry';
import type { Schema, SchemaElement } from '@model/types';
import { PLACE_DEFAULTS, PLACE_LABEL_OFFSETS } from './constants';
import type { DetectorFieldDeps } from './detector-properties';
import { cloneSchema } from './helpers';

/** Варианты полюсов автомата и дифавтомата 2D (у дифавтомата в образце только IN и IIIN). */
const GROUPS: ReadonlyArray<Partial<Record<PoleVariant, number>>> = [AUTOMATIC_2D, DIFFERENTIAL_2D];

const groupOf = (code: number) => GROUPS.find((group) => Object.values(group).includes(code));

/** Меняет вариант полюсов: другой внутренний код, рамка и клеммы; имя и функция сохраняются. */
export function changePoleVariant(element: SchemaElement, variant: PoleVariant): boolean {
  const code = groupOf(element.typeCode)?.[variant];
  const defaults = code === undefined ? undefined : PLACE_DEFAULTS[code];
  if (code === undefined || !defaults || code === element.typeCode) return false;
  const previousLabel = getCadType(element.typeCode).label;
  const info = getCadType(code);
  const size = frameSize(defaults.size, element.rotation);
  element.typeCode = code;
  element.size = { ...size };
  element.terminals = buildTerminals(info, defaults.labels.length, size, element.rotation, defaults.labels);
  element.labelOffset = { ...(PLACE_LABEL_OFFSETS[code] ?? element.labelOffset) };
  if (element.func === previousLabel) element.func = info.label;
  return true;
}

/** Поле «Полюса» в свойствах автомата и дифавтомата 2D. */
export function appendPoleVariantField(schema: Schema, element: SchemaElement, deps: DetectorFieldDeps): void {
  const group = groupOf(element.typeCode);
  const current = POLE_VARIANT_OF[element.typeCode];
  if (!group || !current) return;
  const field = document.createElement('label');
  field.className = 'property-field';
  field.append(document.createTextNode(deps.uiText().poles));
  const select = document.createElement('select');
  for (const variant of Object.keys(group) as PoleVariant[]) {
    const option = document.createElement('option');
    option.value = variant;
    option.textContent = variant;
    select.append(option);
  }
  select.value = current;
  select.addEventListener('change', () => {
    const before = cloneSchema(schema);
    if (!changePoleVariant(element, select.value as PoleVariant)) return;
    deps.commitSchema(before);
    deps.renderSchema();
    select.blur();
    deps.rerender();
  });
  field.append(select);
  deps.propertyFields.append(field);
}
