import { BACK_VIEW, hasBackView, isBackView } from '@model/mechanisms';
import { BUTTON_COLOR, buttonColorValue, isPushbutton2d } from '@model/pushbutton-2d';
import { hasViewChoice, isSimpleView } from '@model/realistic-2d-types';
import { TERMINAL_COLOR, isTerminal2d, terminalColorValue } from '@model/terminal-2d';
import type { Schema, SchemaElement } from '@model/types';
import type { DetectorFieldDeps } from './detector-properties';
import { cloneSchema } from './helpers';

/**
 * Поле «Вид» у символов 2D с цветным рисунком: цветной (по умолчанию) или простой линейный;
 * у выключателя, переключателей и кнопки (механизмы) ещё «Вид сзади» (mechanisms.ts).
 */
export function appendViewField(schema: Schema, element: SchemaElement, deps: DetectorFieldDeps): void {
  if (!hasViewChoice(element)) return;
  const text = deps.uiText();
  const field = document.createElement('label');
  field.className = 'property-field';
  field.append(document.createTextNode(text.view2d));
  const select = document.createElement('select');
  const views: Array<[string, string]> = [['color', text.view2dColor], ['simple', text.view2dSimple]];
  if (hasBackView(element.typeCode)) views.push([BACK_VIEW, text.view2dBack]);
  for (const [value, title] of views) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = title;
    select.append(option);
  }
  select.value = isSimpleView(element) ? 'simple' : isBackView(element) ? BACK_VIEW : 'color';
  select.addEventListener('change', () => {
    const before = cloneSchema(schema);
    if (select.value === 'color') delete element.params.view2d;
    else element.params.view2d = select.value;
    deps.commitSchema(before);
    deps.renderSchema();
    select.blur();
    deps.rerender();
  });
  field.append(select);
  deps.propertyFields.append(field);
}

/** Поле-список с числовыми значениями (nums[16] у кнопки и клеммы 2D). */
function appendNumberSelect(
  schema: Schema,
  deps: DetectorFieldDeps,
  title: string,
  options: Array<[number, string]>,
  current: number,
  apply: (value: number) => void,
): void {
  const field = document.createElement('label');
  field.className = 'property-field';
  field.append(document.createTextNode(title));
  const select = document.createElement('select');
  // Неизвестное значение из файла показываем числом, чтобы не потерять его при открытии поля.
  if (!options.some(([value]) => value === current)) options.push([current, `nums[16] = ${current}`]);
  for (const [value, text] of options) {
    const option = document.createElement('option');
    option.value = String(value);
    option.textContent = text;
    select.append(option);
  }
  select.value = String(current);
  select.addEventListener('change', () => {
    const before = cloneSchema(schema);
    apply(Number(select.value));
    deps.commitSchema(before);
    deps.renderSchema();
    select.blur();
    deps.rerender();
  });
  field.append(select);
  deps.propertyFields.append(field);
}

/** Поле «Цвет кнопки» у кнопки 2D: значение nums[16] (pushbutton-2d.ts), пишется в .cad. */
export function appendButtonColorField(schema: Schema, element: SchemaElement, deps: DetectorFieldDeps): void {
  if (!isPushbutton2d(element.typeCode)) return;
  const text = deps.uiText();
  const options: Array<[number, string]> = [
    [BUTTON_COLOR.black, text.black], [BUTTON_COLOR.green, text.green], [BUTTON_COLOR.red, text.red],
  ];
  appendNumberSelect(schema, deps, text.buttonColor, options, buttonColorValue(element), (value) => {
    if (value === BUTTON_COLOR.black) delete element.params.buttonColor;
    else element.params.buttonColor = value;
  });
}

/** Поле «Цвет клеммы» у клеммы 2D: фаза, N или PE — значение nums[16] (terminal-2d.ts), пишется в .cad. */
export function appendTerminalColorField(schema: Schema, element: SchemaElement, deps: DetectorFieldDeps): void {
  if (!isTerminal2d(element.typeCode)) return;
  const text = deps.uiText();
  const options: Array<[number, string]> = [
    [TERMINAL_COLOR.phase, text.terminalPhase], [TERMINAL_COLOR.neutral, text.terminalNeutral],
    [TERMINAL_COLOR.pe, text.terminalPe],
  ];
  appendNumberSelect(schema, deps, text.terminalColor, options, terminalColorValue(element), (value) => {
    if (value === TERMINAL_COLOR.phase) delete element.params.terminalColor;
    else element.params.terminalColor = value;
  });
}
