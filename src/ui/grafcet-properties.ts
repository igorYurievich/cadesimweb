import { getCadType } from '@model/cad-types';
import { buildTerminals } from '@model/geometry';
import {
  BAR_PITCH, GRAFCET, decodeTableRows, encodeTableRows, isGrafcetBar, isGrafcetStep, isGrafcetType, mergeTableRows,
  tableHeight,
} from '@model/grafcet';
import type { TableRow } from '@model/grafcet';
import { tryParseReceptivity } from '@model/grafcet-expr';
import type { Schema, SchemaElement } from '@model/types';
import type { DetectorFieldDeps } from './detector-properties';
import { cloneSchema } from './helpers';

// ── Свойства элементов GRAFCET (model/grafcet.ts) ─────────────────────────────────────────────────────
// Вместо общих «Имя / Функция / Метки клемм»: номер этапа, условие перехода, действия, ширина черты,
// описания операндов в таблице назначений. Правка — одна запись истории (снимок при фокусе, запись при уходе).

function hint(deps: DetectorFieldDeps, text: string, className = 'property-hint'): HTMLElement {
  const note = document.createElement('small');
  note.className = className;
  note.textContent = text;
  deps.propertyFields.append(note);
  return note;
}

function textField(
  schema: Schema, deps: DetectorFieldDeps, title: string, value: string, apply: (next: string) => void,
  options: { type?: string; min?: string; step?: string; help?: string } = {},
): HTMLInputElement {
  const field = document.createElement('label');
  field.className = 'property-field';
  field.append(document.createTextNode(title));
  const input = document.createElement('input');
  input.type = options.type ?? 'text';
  input.value = value;
  if (options.min) input.min = options.min;
  if (options.step) input.step = options.step;
  let before: Schema | undefined;
  input.addEventListener('focus', () => { before ??= cloneSchema(schema); });
  input.addEventListener('input', () => { apply(input.value); deps.renderSchema(); });
  input.addEventListener('blur', () => { if (before) deps.commitSchema(before); before = undefined; });
  field.append(input);
  if (options.help) {
    const note = document.createElement('small');
    note.className = 'property-hint';
    note.textContent = options.help;
    field.append(note);
  }
  deps.propertyFields.append(field);
  return input;
}

function appendStepFields(schema: Schema, element: SchemaElement, deps: DetectorFieldDeps): void {
  const text = deps.uiText();
  textField(schema, deps, text.gStepNumber, element.name, (value) => { element.name = value.trim(); });
  const field = document.createElement('label');
  field.className = 'property-field property-check';
  const box = document.createElement('input');
  box.type = 'checkbox';
  box.checked = element.typeCode === GRAFCET.initialStep;
  box.addEventListener('change', () => {
    const before = cloneSchema(schema);
    element.typeCode = box.checked ? GRAFCET.initialStep : GRAFCET.step;
    deps.commitSchema(before);
    deps.renderSchema();
    deps.rerender();
  });
  field.append(box, document.createTextNode(` ${text.gInitial}`));
  deps.propertyFields.append(field);
}

function appendTransitionFields(schema: Schema, element: SchemaElement, deps: DetectorFieldDeps): void {
  const text = deps.uiText();
  let error: HTMLElement | undefined;
  const check = (value: string): void => {
    const bad = value.trim() !== '' && tryParseReceptivity(value) === undefined;
    if (error) error.hidden = !bad;
  };
  textField(schema, deps, text.gCondition, element.name, (value) => { element.name = value; check(value); },
    { help: text.gConditionHint });
  error = hint(deps, text.gConditionError, 'property-hint property-error');
  check(element.name);
}

function appendBarFields(schema: Schema, element: SchemaElement, deps: DetectorFieldDeps): void {
  const text = deps.uiText();
  textField(schema, deps, text.gWidth, String(element.size.w), (value) => {
    const width = Math.round(Number(value) / BAR_PITCH) * BAR_PITCH;
    if (!Number.isFinite(width) || width < 6 || width > 600) return;
    element.size = { ...element.size, w: width };
    element.terminals = buildTerminals(getCadType(element.typeCode), 0, element.size, element.rotation, []);
  }, { type: 'number', min: '6', step: String(BAR_PITCH), help: text.gBarHint });
}

/** Таблица назначений: при открытии свойств строки сверяются с операндами GRAFCET на листе. */
function appendTableFields(schema: Schema, element: SchemaElement, deps: DetectorFieldDeps): void {
  const text = deps.uiText();
  const rows: TableRow[] = mergeTableRows(schema, decodeTableRows(element.func));
  const synced = encodeTableRows(rows);
  if (synced !== element.func) {
    const before = cloneSchema(schema);
    element.func = synced;
    element.size = { ...element.size, h: tableHeight(rows) };
    deps.commitSchema(before);
    deps.renderSchema();
  }
  hint(deps, text.gTableHint);
  if (!rows.length) { hint(deps, text.gTableEmpty); return; }
  for (const row of rows) {
    textField(schema, deps, `${row.kind === 'I' ? '▸' : '◂'} ${row.name}`, row.text, (value) => {
      row.text = value;
      element.func = encodeTableRows(rows);
    });
  }
}

/** Поля элемента GRAFCET. true — элемент GRAFCET, общие поля свойств не нужны. */
export function appendGrafcetFields(schema: Schema, element: SchemaElement, deps: DetectorFieldDeps): boolean {
  if (!isGrafcetType(element.typeCode)) return false;
  const text = deps.uiText();
  if (isGrafcetStep(element.typeCode)) appendStepFields(schema, element, deps);
  else if (element.typeCode === GRAFCET.transition) appendTransitionFields(schema, element, deps);
  else if (element.typeCode === GRAFCET.action) {
    const apply = (value: string): void => { element.name = value; };
    textField(schema, deps, text.gActions, element.name, apply, { help: text.gActionsHint });
  } else if (isGrafcetBar(element.typeCode)) appendBarFields(schema, element, deps);
  else if (element.typeCode === GRAFCET.link) hint(deps, text.gLinkHint);
  else if (element.typeCode === GRAFCET.table) appendTableFields(schema, element, deps);
  return true;
}
