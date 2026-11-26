/**
 * Крупные значки категории «Ручное управление»: 24 элемента из 5 приводов и 6 видов контактов.
 */
import {
  ACTUATORS,
  contactChangeover,
  contactCross,
  contactNc,
  contactNo,
  contactSelector,
  drawActuatedContacts,
  drawShapes,
} from './primitives';
import type { Actuator, Contact } from './primitives';

type ContactSet = 'no' | 'nc' | 'nonc' | 'co';

/** Один контакт по центру; для НО+НЗ — два рядом. */
function contactSet(kind: ContactSet): Contact[] {
  switch (kind) {
    case 'no': return [contactNo(42)];
    case 'nc': return [contactNc(38)];
    case 'co': return [contactChangeover(40)];
    case 'nonc': return [contactNo(34), contactNc(50)];
  }
}

const icon = (actuator: Actuator, kind: ContactSet) => (): SVGSVGElement =>
  drawActuatedContacts(actuator, contactSet(kind));

/** Кнопка 2D (Botón pulsador): сама кнопка, без контактов — круглая головка. */
const roundButton = (): SVGSVGElement => drawShapes(['M32 6A18 18 0 1 0 32 42A18 18 0 1 0 32 6'], [
  'M32 14A10 10 0 1 0 32 34A10 10 0 1 0 32 14',
]);

export const MANUAL_CONTROL_BIG_ICONS: Readonly<Record<number, () => SVGSVGElement>> = {
  33278: roundButton,
  32909: icon(ACTUATORS.push, 'no'),
  32910: icon(ACTUATORS.push, 'nc'),
  32912: icon(ACTUATORS.push, 'nonc'),
  32913: icon(ACTUATORS.push, 'co'),
  32914: icon(ACTUATORS.mushroom, 'no'),
  32915: icon(ACTUATORS.mushroom, 'nc'),
  32917: icon(ACTUATORS.mushroom, 'nonc'),
  32918: icon(ACTUATORS.mushroom, 'co'),
  32919: icon(ACTUATORS.latch, 'no'),
  32920: icon(ACTUATORS.latch, 'nc'),
  32921: icon(ACTUATORS.latch, 'nonc'),
  32922: icon(ACTUATORS.latch, 'co'),
  33047: () => drawActuatedContacts(ACTUATORS.latch, [contactSelector(42, 2)]),
  33048: () => drawActuatedContacts(ACTUATORS.latch, [contactSelector(44, 3)]),
  33049: () => drawActuatedContacts(ACTUATORS.latch, [contactCross(42)]),
  32923: icon(ACTUATORS.roller, 'no'),
  32924: icon(ACTUATORS.roller, 'nc'),
  32925: icon(ACTUATORS.roller, 'nonc'),
  32926: icon(ACTUATORS.roller, 'co'),
  32927: icon(ACTUATORS.thermal, 'no'),
  32928: icon(ACTUATORS.thermal, 'nc'),
  32929: icon(ACTUATORS.thermal, 'nonc'),
  32930: icon(ACTUATORS.thermal, 'co'),
};
