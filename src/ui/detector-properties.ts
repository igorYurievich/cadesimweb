import { getCadType } from '@model/cad-types';
import { DETECTOR_WIRINGS, detectorSpec, detectorVariant } from '@model/detector-types';
import type { DetectorWiring } from '@model/detector-types';
import { buildTerminals, frameSize } from '@model/geometry';
import type { Schema, SchemaElement } from '@model/types';
import { PLACE_DEFAULTS, PLACE_LABEL_OFFSETS } from './constants';
import { cloneSchema } from './helpers';
import type { InterfaceText } from './i18n';

/**
 * Меняет вариант подключения датчика (2/3 провода, снизу/сбоку): это другой код типа .cad,
 * поэтому заменяются код, рамка, клеммы и смещение подписи. Имя и функция сохраняются.
 * Исходная запись .cad отбрасывается: её флаги и метки клемм относятся к старому варианту.
 */
export function changeDetectorWiring(element: SchemaElement, wiring: DetectorWiring): boolean {
  const code = detectorVariant(element.typeCode, wiring);
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
  delete element.raw;
  return true;
}

export interface DetectorFieldDeps {
  propertyFields: HTMLElement;
  uiText(): InterfaceText;
  renderSchema(): void;
  commitSchema(before: Schema): void;
  /** Перерисовать панель свойств: у другого варианта другие клеммы. */
  rerender(): void;
}

/** Поле «Подключение» в свойствах датчика. */
export function appendDetectorWiringField(schema: Schema, element: SchemaElement, deps: DetectorFieldDeps): void {
  const spec = detectorSpec(element.typeCode);
  if (!spec) return;
  const text = deps.uiText();
  const titles: Readonly<Record<DetectorWiring, string>> = {
    '2': text.wiring2, '3': text.wiring3, '2-side': text.wiring2Side, '3-side': text.wiring3Side,
  };
  const field = document.createElement('label');
  field.className = 'property-field';
  field.append(document.createTextNode(text.detectorWiring));
  const select = document.createElement('select');
  for (const wiring of DETECTOR_WIRINGS) {
    const option = document.createElement('option');
    option.value = wiring;
    option.textContent = titles[wiring];
    select.append(option);
  }
  select.value = spec.wiring;
  select.addEventListener('change', () => {
    const before = cloneSchema(schema);
    if (!changeDetectorWiring(element, select.value as DetectorWiring)) return;
    deps.commitSchema(before);
    deps.renderSchema();
    select.blur();
    deps.rerender();
  });
  field.append(select);
  deps.propertyFields.append(field);
}
