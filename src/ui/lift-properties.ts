import { LIFT_ROLES, LIFT_TYPE, type LiftRole, liftRoleName, setLiftRoleName } from '@model/lift';
import type { Schema, SchemaElement } from '@model/types';
import type { DetectorFieldDeps } from './detector-properties';
import type { InterfaceText } from './i18n';
import { cloneSchema } from './helpers';

/** Подпись поля встроенного элемента лифта. */
function roleTitle(role: LiftRole, text: InterfaceText): string {
  if (role === 'hoist') return text.liftHoist;
  if (role === 'door') return text.liftDoorMotor;
  if (role === 'doorOpen') return text.liftDoorOpen;
  if (role === 'doorClosed') return text.liftDoorClosed;
  if (role === 'photo') return text.liftPhoto;
  return text.liftFloor.replace('{n}', role.slice(-1));
}

/**
 * Свойства лифта (model/lift.ts): имена встроенных элементов. Положения у них постоянные, меняется
 * только имя, по которому лифт находит мотор и датчики на схеме.
 */
export function appendLiftFields(schema: Schema, element: SchemaElement, deps: DetectorFieldDeps): void {
  if (element.typeCode !== LIFT_TYPE) return;
  const text = deps.uiText();
  const hint = document.createElement('p');
  hint.className = 'property-hint';
  hint.textContent = text.liftNamesHint;
  deps.propertyFields.append(hint);
  for (const role of LIFT_ROLES) {
    const field = document.createElement('label');
    field.className = 'property-field';
    field.append(document.createTextNode(roleTitle(role, text)));
    const input = document.createElement('input');
    input.type = 'text';
    input.value = liftRoleName(element, role);
    input.addEventListener('change', () => {
      const before = cloneSchema(schema);
      setLiftRoleName(element, role, input.value);
      input.value = liftRoleName(element, role);
      deps.commitSchema(before);
      deps.renderSchema();
    });
    field.append(input);
    deps.propertyFields.append(field);
  }
}
