import { VFD_CONTROL, VFD_MAX_HZ, isVfd2d, vfdSettings, type VfdSettings } from '@model/vfd';
import type { Schema, SchemaElement } from '@model/types';
import type { DetectorFieldDeps } from './detector-properties';
import { cloneSchema } from './helpers';

/**
 * Поля блока управления преобразователя частоты (1056) и 2D-преобразователя (10240): консигна AI, три фиксированные
 * частоты и рампы. У 2D входы называются X1…X4 (а не I1…I4), консигна — та же, что ▲▼ и ручка на панели.
 * Меняются и во время симуляции — привод сразу идёт к новой частоте по рампе.
 */
export function appendVfdFields(schema: Schema, element: SchemaElement, deps: DetectorFieldDeps): void {
  if (element.typeCode !== VFD_CONTROL && !isVfd2d(element.typeCode)) return;
  const is2d = isVfd2d(element.typeCode);
  const text = deps.uiText();
  const port = (title: string): string => (is2d ? title.replace(/\bI([1-4])\b/g, 'X$1') : title);
  const settings = vfdSettings(element);
  const fields: Array<[keyof VfdSettings, string, number, number]> = [
    ['aiHz', text.vfdAi, VFD_MAX_HZ, 0.5],
    ['preset1', text.vfdPreset1, VFD_MAX_HZ, 1],
    ['preset2', text.vfdPreset2, VFD_MAX_HZ, 1],
    ['preset3', text.vfdPreset3, VFD_MAX_HZ, 1],
    ['rampUp', text.vfdRampUp, 99, 1],
    ['rampDown', text.vfdRampDown, 99, 1],
  ];
  for (const [key, title, max, step] of fields) {
    const label = document.createElement('label');
    label.className = 'property-field';
    label.append(document.createTextNode(port(title)));
    const input = document.createElement('input');
    input.type = 'number';
    input.min = '0';
    input.max = String(max);
    input.step = String(step);
    input.value = String(settings[key]);
    let before: Schema | undefined;
    input.addEventListener('focus', () => { before ??= cloneSchema(schema); });
    input.addEventListener('input', () => {
      const value = Number(input.value);
      if (!Number.isFinite(value)) return;
      element.params[`vfd_${key}`] = Math.min(max, Math.max(0, value));
      deps.renderSchema();
    });
    input.addEventListener('change', () => {
      if (before) deps.commitSchema(before);
      before = undefined;
    });
    label.append(input);
    deps.propertyFields.append(label);
  }
  if (is2d) return;
  const hint = document.createElement('p');
  hint.className = 'property-empty';
  hint.textContent = text.vfdHint;
  deps.propertyFields.append(hint);
}
