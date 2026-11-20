import { BUTTON_COLOR, buttonColorValue, isPushbutton2d } from '@model/pushbutton-2d';
import { hasViewChoice, isSimpleView } from '@model/realistic-2d-types';
import type { Schema, SchemaElement } from '@model/types';
import type { DetectorFieldDeps } from './detector-properties';
import { cloneSchema } from './helpers';

/** Поле «Вид» у символов 2D с цветным рисунком: цветной (по умолчанию) или простой линейный. */
export function appendViewField(schema: Schema, element: SchemaElement, deps: DetectorFieldDeps): void {
  if (!hasViewChoice(element)) return;
  const text = deps.uiText();
  const field = document.createElement('label');
  field.className = 'property-field';
  field.append(document.createTextNode(text.view2d));
  const select = document.createElement('select');
  for (const [value, title] of [['color', text.view2dColor], ['simple', text.view2dSimple]] as const) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = title;
    select.append(option);
  }
  select.value = isSimpleView(element) ? 'simple' : 'color';
  select.addEventListener('change', () => {
    const before = cloneSchema(schema);
    if (select.value === 'simple') element.params.view2d = 'simple';
    else delete element.params.view2d;
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
  const field = document.createElement('label');
  field.className = 'property-field';
  field.append(document.createTextNode(text.buttonColor));
  const select = document.createElement('select');
  const options: Array<[number, string]> = [
    [BUTTON_COLOR.black, text.black], [BUTTON_COLOR.green, text.green], [BUTTON_COLOR.red, text.red],
  ];
  const current = buttonColorValue(element);
  // Неизвестное значение из файла показываем числом, чтобы не потерять его при открытии поля.
  if (!options.some(([value]) => value === current)) options.push([current, `nums[16] = ${current}`]);
  for (const [value, title] of options) {
    const option = document.createElement('option');
    option.value = String(value);
    option.textContent = String(title);
    select.append(option);
  }
  select.value = String(current);
  select.addEventListener('change', () => {
    const before = cloneSchema(schema);
    const value = Number(select.value);
    if (value === BUTTON_COLOR.black) delete element.params.buttonColor;
    else element.params.buttonColor = value;
    deps.commitSchema(before);
    deps.renderSchema();
    select.blur();
    deps.rerender();
  });
  field.append(select);
  deps.propertyFields.append(field);
}
