import {
  STAIR_TIMER_2D, STAIR_TIMER_DIAL, dialLabel, stairTimerMinutes, stairTimerWiring,
} from '@model/stair-timer';
import type { Schema, SchemaElement } from '@model/types';
import type { DetectorFieldDeps } from './detector-properties';
import { cloneSchema } from './helpers';

type Option = readonly [value: string, title: string];

function appendSelect(
  schema: Schema, deps: DetectorFieldDeps, title: string, options: readonly Option[], current: string,
  apply: (value: string) => void,
): void {
  const field = document.createElement('label');
  field.className = 'property-field';
  field.append(document.createTextNode(title));
  const select = document.createElement('select');
  for (const [value, text] of options) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = text;
    select.append(option);
  }
  select.value = current;
  select.addEventListener('change', () => {
    const before = cloneSchema(schema);
    apply(select.value);
    deps.commitSchema(before);
    deps.renderSchema();
    select.blur();
    deps.rerender();
  });
  field.append(select);
  deps.propertyFields.append(field);
}

/**
 * Поля минутника Alst 8: «Время» — только отметки синего колеса (1…7 мин), как на аппарате;
 * «Подключение» — кнопки на N (3 провода, по умолчанию) или на фазу (4 провода).
 */
export function appendStairTimerField(schema: Schema, element: SchemaElement, deps: DetectorFieldDeps): void {
  if (element.typeCode !== STAIR_TIMER_2D) return;
  const text = deps.uiText();
  appendSelect(
    schema, deps, text.stairTime,
    STAIR_TIMER_DIAL.map((minutes) => [String(minutes), `${dialLabel(minutes)} min`] as const),
    String(stairTimerMinutes(element)),
    (value) => { element.params.minutes = Number(value); },
  );
  appendSelect(
    schema, deps, text.stairWiring,
    [['3', text.stairWiring3], ['4', text.stairWiring4]],
    String(stairTimerWiring(element)),
    (value) => { element.params.wiring = Number(value); },
  );
}
